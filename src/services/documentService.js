const fs = require('fs');
const path = require('path');
const prisma = require('../config/database');
const { getStorageService, STORAGE_TYPE, UPLOAD_PATH } = require('../config/storage');
const { getPaginationParams, getPaginationMetadata } = require('../utils/pagination');
const { extractFilePreview, extractFilePreviewFromUrl } = require('../utils/filePreview');
const { STORAGE_LIMITS } = require('../config/constants');

const storageService = getStorageService();

const OFFICE_PREVIEW_EXTENSIONS = new Set(['.pptx', '.docx', '.xlsx']);

function shouldRefreshContentPreview(document) {
  if (!document) return false;
  if (!document.contentPreview) return true;

  const extension = path.extname(document.fileName || '').toLowerCase();
  const isOfficeFile = OFFICE_PREVIEW_EXTENSIONS.has(extension);
  if (!isOfficeFile) return false;

  // Bản cũ có thể lưu nhầm XML của PPTX/DOCX vào contentPreview.
  // Nếu phát hiện thẻ XML Office thì đọc lại file và ghi đè preview sạch.
  return /<\/?[a-zA-Z]+:|&lt;\/?[a-zA-Z]+:/i.test(document.contentPreview);
}

async function normalizeUserStorageLimit(user) {
  if (!user) return user;
  if (Number(user.storageLimit || 0) >= STORAGE_LIMITS.BASIC) return user;

  return prisma.user.update({
    where: { id: user.id },
    data: { storageLimit: STORAGE_LIMITS.BASIC },
  });
}

function cleanText(value) {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text || undefined;
}

function buildVisibilityCondition(currentUser) {
  if (!currentUser) return { isPublic: true };
  if (currentUser.role === 'ADMIN') return null;

  return {
    OR: [
      { isPublic: true },
      { uploadedBy: currentUser.id },
    ],
  };
}

function buildSearchCondition(search) {
  const cleanSearch = cleanText(search);
  if (!cleanSearch) return null;

  return {
    OR: [
      { title: { contains: cleanSearch } },
      { description: { contains: cleanSearch } },
      { subject: { contains: cleanSearch } },
      { fileName: { contains: cleanSearch } },
      { category: { is: { name: { contains: cleanSearch } } } },
      { subjectRef: { is: { name: { contains: cleanSearch } } } },
      { subjectRef: { is: { code: { contains: cleanSearch } } } },
    ],
  };
}

function buildSubjectCondition({ subjectId, subject }) {
  const cleanSubjectId = cleanText(subjectId);
  const cleanSubject = cleanText(subject);

  if (cleanSubjectId) return { subjectId: cleanSubjectId };
  if (!cleanSubject) return null;

  return {
    OR: [
      { subject: { contains: cleanSubject } },
      { subjectRef: { is: { name: { contains: cleanSubject } } } },
      { subjectRef: { is: { code: { contains: cleanSubject } } } },
    ],
  };
}

function parseOptionalBoolean(value) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;

  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes'].includes(normalized)) return true;
  if (['false', '0', 'no'].includes(normalized)) return false;

  return undefined;
}

function mergeAndConditions(conditions) {
  const compact = conditions.filter(Boolean);
  if (compact.length === 0) return {};
  if (compact.length === 1) return compact[0];
  return { AND: compact };
}

function ensureDownloadTargetExists(downloadUrl, fileName = 'file') {
  if (!downloadUrl || /^https?:\/\//i.test(downloadUrl)) return;

  if (!fs.existsSync(downloadUrl)) {
    const error = new Error(
      `File gốc "${fileName}" không còn tồn tại trong thư mục uploads của server. Vui lòng upload lại file hoặc kiểm tra đồng bộ file uploads.`
    );
    error.statusCode = 404;
    throw error;
  }
}

function buildDocumentWhere(currentUser, queryParams, options = {}) {
  const { search, categoryId, subject, subjectId, uploadedBy, isPublic, includeDeleted } = queryParams;
  const andConditions = [];

  const isAdmin = currentUser && currentUser.role === 'ADMIN';
  // Admin mặc định thấy cả bản ghi xóa mềm; public/user chỉ thấy active.
  const hideDeleted =
    !isAdmin || includeDeleted === false || includeDeleted === 'false';
  if (hideDeleted) {
    andConditions.push({ deletedAt: null });
  }

  if (options.ownerId) {
    andConditions.push({ uploadedBy: options.ownerId });
  } else {
    andConditions.push(buildVisibilityCondition(currentUser));
  }

  andConditions.push(buildSearchCondition(search));

  const cleanCategoryId = cleanText(categoryId);
  if (cleanCategoryId) andConditions.push({ categoryId: cleanCategoryId });

  andConditions.push(buildSubjectCondition({ subjectId, subject }));

  const publicFilter = parseOptionalBoolean(isPublic);
  if (typeof publicFilter === 'boolean') {
    andConditions.push({ isPublic: publicFilter });
  }

  if (uploadedBy && currentUser && currentUser.role === 'ADMIN') {
    andConditions.push({ uploadedBy });
  }

  return mergeAndConditions(andConditions);
}


async function getPreviewFromStoredDocument(document) {
  if (!shouldRefreshContentPreview(document)) return document;

  const hadBrokenPreview = Boolean(document?.contentPreview);
  let preview = null;

  if (/^https?:\/\//i.test(document.fileUrl || '')) {
    preview = await extractFilePreviewFromUrl(document.fileUrl, document);
  } else if (STORAGE_TYPE.toLowerCase() === 'local' && document.fileUrl) {
    const localPath = path.join(UPLOAD_PATH, path.basename(document.fileUrl));
    if (fs.existsSync(localPath)) {
      preview = await extractFilePreview({
        path: localPath,
        originalname: document.fileName,
        mimetype: document.mimeType,
        size: document.fileSize,
      });
    }
  }

  if (!preview) {
    if (hadBrokenPreview) {
      await prisma.document.update({
        where: { id: document.id },
        data: { contentPreview: null },
      });
      return { ...document, contentPreview: null };
    }
    return document;
  }

  await prisma.document.update({
    where: { id: document.id },
    data: { contentPreview: preview },
  });

  return { ...document, contentPreview: preview };
}

/**
 * Đăng tải tài liệu mới (Upload)
 */
const createDocument = async (userId, file, data) => {
  const { title, description, subject, subjectId, categoryId, folderId, isPublic } = data;

  // 0. Kiểm tra dung lượng lưu trữ trước khi xử lý file (Bỏ qua nếu gói cước là UNLIMITED)
  let user = await prisma.user.findUnique({ where: { id: userId } });
  user = await normalizeUserStorageLimit(user);
  if (user && user.plan !== 'UNLIMITED' && user.usedStorage + file.size > user.storageLimit) {
    const error = new Error(`Dung lượng lưu trữ đã vượt quá giới hạn cho phép (${(user.storageLimit / (1024 * 1024 * 1024)).toFixed(1)}GB). Vui lòng nâng cấp gói để tiếp tục.`);
    error.statusCode = 400;
    throw error;
  }

  // 1. Trích xuất trước một phần nội dung để hiển thị xem trước
  const contentPreview = await extractFilePreview(file);

  // Backup file path cho AI (phòng trường hợp storageService xóa file local như Cloudinary)
  const tempAiPath = file.path ? path.join(path.dirname(file.path), 'ai_' + path.basename(file.path)) : null;
  if (tempAiPath && fs.existsSync(file.path)) {
    fs.copyFileSync(file.path, tempAiPath);
  }

  // 2. Tải file lên thông qua Storage Service
  const fileData = await storageService.upload(file);

  // 2. Kiểm tra danh mục
  if (categoryId) {
    const categoryExists = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!categoryExists) {
      throw new Error('Danh mục tài liệu không hợp lệ hoặc đã bị xóa');
    }
  }

  // Kiểm tra thư mục (folder)
  if (folderId && folderId !== 'root') {
    const folderExists = await prisma.folder.findFirst({ where: { id: folderId, userId } });
    if (!folderExists) {
      throw new Error('Thư mục không hợp lệ hoặc không thuộc quyền sở hữu của bạn.');
    }
  }

  // 3. Kiểm tra nếu có subjectId thì phải tồn tại môn học trong DB
  let subjectRecord = null;
  if (subjectId) {
    subjectRecord = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subjectRecord) {
      throw new Error('Môn học không hợp lệ hoặc đã bị xóa');
    }
  }

  let finalSubjectId = subjectId || null;
  let normalizedSubject = cleanText(subject) || subjectRecord?.name || null;

  if (!subjectId && normalizedSubject) {
    const existingSubject = await prisma.subject.findFirst({
      where: { name: normalizedSubject, deletedAt: null }
    });

    if (existingSubject) {
      finalSubjectId = existingSubject.id;
      normalizedSubject = existingSubject.name;
    } else {
      const newSubject = await prisma.subject.create({
        data: {
          name: normalizedSubject,
          code: null,
          description: 'Tự động thêm từ tài liệu',
          createdBy: userId,
        }
      });
      finalSubjectId = newSubject.id;
    }
  }

  // 4. Lưu bản ghi vào cơ sở dữ liệu
  const document = await prisma.document.create({
    data: {
      title,
      description,
      contentPreview,
      subject: normalizedSubject,
      subjectId: finalSubjectId,
      fileUrl: fileData.fileUrl,
      fileName: fileData.fileName,
      fileSize: fileData.fileSize,
      mimeType: fileData.mimeType,
      uploadedBy: userId,
      categoryId: categoryId || null,
      folderId: (folderId && folderId !== 'root') ? folderId : null,
      isPublic: isPublic !== undefined ? isPublic : true,
      currentVersion: 1,
    },
    include: {
      user: {
        select: { id: true, fullName: true, avatarUrl: true },
      },
      subjectRef: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      category: {
        select: { id: true, name: true },
      },
    },
  });

  // 4. Cập nhật usedStorage cho User
  await prisma.user.update({
    where: { id: userId },
    data: { usedStorage: { increment: fileData.fileSize } },
  });

  // 5. Tạo version đầu tiên cho tài liệu
  await prisma.documentVersion.create({
    data: {
      documentId: document.id,
      version: 1,
      fileUrl: fileData.fileUrl,
      fileName: fileData.fileName,
      fileSize: fileData.fileSize,
      mimeType: fileData.mimeType,
      uploadedBy: userId,
    },
  });

  // 6. Ingest vào hệ thống AI
  try {
    const aiService = require('./aiService');
    if (tempAiPath && fs.existsSync(tempAiPath)) {
      // Chạy ngầm không await để không block API
      aiService.ingestFile(tempAiPath, fileData.mimeType, {
        fileName: document.fileName,
        subject: document.subject,
        documentId: document.id
      }).then(() => {
        if (fs.existsSync(tempAiPath)) fs.unlinkSync(tempAiPath);
      }).catch(err => {
        console.error("Lỗi Ingest AI:", err);
        if (fs.existsSync(tempAiPath)) fs.unlinkSync(tempAiPath);
      });
    }
  } catch (err) {
    console.error("Không thể gọi AI Ingestion:", err);
    if (tempAiPath && fs.existsSync(tempAiPath)) fs.unlinkSync(tempAiPath);
  }

  return document;
};

/**
 * Lấy danh sách tài liệu với bộ lọc, tìm kiếm, phân trang & sắp xếp
 */
const getAllDocuments = async (currentUser, queryParams) => {
  const { page, limit, skip, take } = getPaginationParams(queryParams);
  const { sortBy, sortOrder } = queryParams;

  const where = buildDocumentWhere(currentUser, queryParams);

  const allowedSortFields = ['createdAt', 'title', 'downloadCount', 'fileSize'];
  const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const finalSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

  const total = await prisma.document.count({ where });

  const documents = await prisma.document.findMany({
    where,
    skip,
    take,
    include: {
      user: {
        select: { id: true, fullName: true, avatarUrl: true },
      },
      subjectRef: {
        select: { id: true, name: true, code: true },
      },
      category: {
        select: { id: true, name: true },
      },
    },
    orderBy: {
      [finalSortBy]: finalSortOrder,
    },
  });

  const pagination = getPaginationMetadata(total, page, limit);

  return { documents, pagination };
};

/**
 * Lấy chi tiết tài liệu theo ID
 */
const getDocumentById = async (currentUser, id) => {
  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, fullName: true, avatarUrl: true },
      },
      subjectRef: {
        select: { id: true, name: true, code: true },
      },
      category: {
        select: { id: true, name: true },
      },
      versions: {
        orderBy: { version: 'desc' },
      },
    },
  });

  if (!document) {
    const error = new Error('Không tìm thấy tài liệu yêu cầu.');
    error.statusCode = 404;
    throw error;
  }

  if (document.deletedAt && (!currentUser || currentUser.role !== 'ADMIN')) {
    const error = new Error('Không tìm thấy tài liệu yêu cầu.');
    error.statusCode = 404;
    throw error;
  }

  // Kiểm tra quyền xem tài liệu riêng tư (isPublic = false)
  if (!document.isPublic) {
    if (!currentUser || (document.uploadedBy !== currentUser.id && currentUser.role !== 'ADMIN')) {
      const error = new Error('Bạn không có quyền truy cập tài liệu riêng tư này.');
      error.statusCode = 403;
      throw error;
    }
  }

  return getPreviewFromStoredDocument(document);
};

/**
 * Cập nhật tài liệu
 * Nếu có upload file mới thì tạo version mới, không xóa file cũ
 */
const updateDocument = async (userId, userRole, id, data, file = null) => {
  const document = await prisma.document.findUnique({ where: { id } });

  if (!document) {
    const error = new Error('Không tìm thấy tài liệu.');
    error.statusCode = 404;
    throw error;
  }

  // Phân quyền: chỉ chủ sở hữu hoặc Admin mới được phép sửa
  if (document.uploadedBy !== userId && userRole !== 'ADMIN') {
    const error = new Error('Bạn không có quyền chỉnh sửa tài liệu này.');
    error.statusCode = 403;
    throw error;
  }

  const { title, description, subject, subjectId, categoryId, isPublic, folderId } = data;

  if (categoryId) {
    const categoryExists = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!categoryExists) {
      throw new Error('Danh mục tài liệu không hợp lệ');
    }
  }

  if (folderId && folderId !== 'root') {
    const folderExists = await prisma.folder.findFirst({ where: { id: folderId, userId } });
    if (!folderExists) {
      throw new Error('Thư mục không hợp lệ hoặc không thuộc quyền sở hữu của bạn.');
    }
  }

  let subjectRecord = null;
  if (subjectId) {
    subjectRecord = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subjectRecord) {
      throw new Error('Môn học không hợp lệ');
    }
  }

  let finalSubjectId = subjectId || null;
  let normalizedSubject = subject !== undefined
    ? (cleanText(subject) || null)
    : (subjectId ? subjectRecord?.name || null : undefined);

  if (!subjectId && normalizedSubject !== undefined && normalizedSubject !== null) {
    const existingSubject = await prisma.subject.findFirst({
      where: { name: normalizedSubject, deletedAt: null }
    });

    if (existingSubject) {
      finalSubjectId = existingSubject.id;
      normalizedSubject = existingSubject.name;
    } else {
      const newSubject = await prisma.subject.create({
        data: {
          name: normalizedSubject,
          code: null,
          description: 'Tự động thêm từ tài liệu',
          createdBy: userId,
        }
      });
      finalSubjectId = newSubject.id;
    }
  } else if (subject !== undefined && normalizedSubject === null) {
    // User explicitly cleared the subjec
    finalSubjectId = null;
  }

  const updateData = {
    ...(title !== undefined && { title }),
    ...(description !== undefined && { description }),
    ...(normalizedSubject !== undefined && { subject: normalizedSubject }),
    ...(subjectId !== undefined || subject !== undefined ? { subjectId: finalSubjectId } : {}),
    ...(categoryId !== undefined && { categoryId: categoryId || null }),
    ...(isPublic !== undefined && { isPublic }),
    ...(folderId !== undefined && { folderId: (folderId && folderId !== 'root') ? folderId : null }),
  };

  // Nếu có file mới thì upload file mới và tạo version mới
  if (file) {
    const contentPreview = await extractFilePreview(file);
    const fileData = await storageService.upload(file);
    const nextVersion = document.currentVersion + 1;

    await prisma.documentVersion.create({
      data: {
        documentId: document.id,
        version: nextVersion,
        fileUrl: fileData.fileUrl,
        fileName: fileData.fileName,
        fileSize: fileData.fileSize,
        mimeType: fileData.mimeType,
        uploadedBy: userId,
      },
    });

    updateData.fileUrl = fileData.fileUrl;
    updateData.fileName = fileData.fileName;
    updateData.fileSize = fileData.fileSize;
    updateData.mimeType = fileData.mimeType;
    updateData.contentPreview = contentPreview;
    updateData.currentVersion = nextVersion;

    await prisma.user.update({
      where: { id: document.uploadedBy },
      data: { usedStorage: { increment: fileData.fileSize } },
    });
  }

  const updatedDocument = await prisma.document.update({
    where: { id },
    data: updateData,
    include: {
      user: {
        select: { id: true, fullName: true, avatarUrl: true },
      },
      subjectRef: {
        select: { id: true, name: true, code: true },
      },
      category: {
        select: { id: true, name: true },
      },
      versions: {
        orderBy: { version: 'desc' },
      },
    },
  });

  return updatedDocument;
};

/**
 * Soft delete tài liệu — giữ file trên storage để có thể khôi phục.
 */
const deleteDocument = async (userId, userRole, id) => {
  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      versions: true,
    },
  });

  if (!document || document.deletedAt) {
    const error = new Error('Không tìm thấy tài liệu.');
    error.statusCode = 404;
    throw error;
  }

  if (document.uploadedBy !== userId && userRole !== 'ADMIN') {
    const error = new Error('Bạn không có quyền xóa tài liệu này.');
    error.statusCode = 403;
    throw error;
  }

  // Soft-delete versions
  await prisma.documentVersion.updateMany({
    where: { documentId: id, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  // Trừ dung lượng tạm thời (khôi phục sẽ cộng lại)
  const totalVersionSize = document.versions
    .filter((v) => !v.deletedAt)
    .reduce((sum, version) => sum + Number(version.fileSize || 0), 0);
  await prisma.user.update({
    where: { id: document.uploadedBy },
    data: {
      usedStorage: {
        decrement: totalVersionSize || document.fileSize,
      },
    },
  });

  const user = await prisma.user.findUnique({ where: { id: document.uploadedBy } });
  if (user && user.usedStorage < 0) {
    await prisma.user.update({ where: { id: document.uploadedBy }, data: { usedStorage: 0 } });
  }

  await prisma.document.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return true;
};

const restoreDocument = async (userId, userRole, id) => {
  const document = await prisma.document.findUnique({
    where: { id },
    include: { versions: true },
  });

  if (!document) {
    const error = new Error('Không tìm thấy tài liệu.');
    error.statusCode = 404;
    throw error;
  }
  if (!document.deletedAt) {
    const error = new Error('Tài liệu này chưa bị xóa.');
    error.statusCode = 400;
    throw error;
  }
  if (document.uploadedBy !== userId && userRole !== 'ADMIN') {
    const error = new Error('Bạn không có quyền khôi phục tài liệu này.');
    error.statusCode = 403;
    throw error;
  }

  const deletedAt = document.deletedAt;
  const windowStart = new Date(new Date(deletedAt).getTime() - 5000);
  const versionsToRestore = document.versions.filter(
    (v) => v.deletedAt && new Date(v.deletedAt) >= windowStar
  );

  await prisma.documentVersion.updateMany({
    where: {
      documentId: id,
      deletedAt: { gte: windowStart },
    },
    data: { deletedAt: null },
  });

  const totalVersionSize = versionsToRestore.reduce(
    (sum, version) => sum + Number(version.fileSize || 0),
    0
  );
  await prisma.user.update({
    where: { id: document.uploadedBy },
    data: {
      usedStorage: {
        increment: totalVersionSize || document.fileSize,
      },
    },
  });

  return prisma.document.update({
    where: { id },
    data: { deletedAt: null },
  });
};

/**
 * Tải xuống tài liệu (Download)
 */
const downloadDocument = async (currentUser, id) => {
  // 1. Lấy chi tiết và kiểm tra phân quyền truy cập
  const document = await getDocumentById(currentUser, id);

  // 2. Tăng số lượng tải lên 1 đơn vị
  await prisma.document.update({
    where: { id },
    data: { downloadCount: { increment: 1 } },
  });

  // 3. Lấy đường dẫn tải về
  const downloadUrl = storageService.getDownloadUrl(document.fileUrl);
  ensureDownloadTargetExists(downloadUrl, document.fileName);

  return {
    downloadUrl,
    fileName: document.fileName,
    mimeType: document.mimeType,
  };
};

/**
 * Lấy danh sách tài liệu của người dùng hiện tại (My Documents)
 */
const getMyDocuments = async (userId, queryParams) => {
  const { page, limit, skip, take } = getPaginationParams(queryParams);
  const { sortBy, sortOrder } = queryParams;

  const where = buildDocumentWhere(null, queryParams, { ownerId: userId });

  const allowedSortFields = ['createdAt', 'title', 'downloadCount', 'fileSize'];
  const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const finalSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

  const total = await prisma.document.count({ where });

  const documents = await prisma.document.findMany({
    where,
    skip,
    take,
    include: {
      user: {
        select: { id: true, fullName: true, avatarUrl: true },
      },
      subjectRef: {
        select: { id: true, name: true, code: true },
      },
      category: {
        select: { id: true, name: true },
      },
    },
    orderBy: {
      [finalSortBy]: finalSortOrder,
    },
  });

  const pagination = getPaginationMetadata(total, page, limit);

  return { documents, pagination };
};

/**
 * Lấy lịch sử phiên bản của tài liệu
 */
const getDocumentVersions = async (userId, userRole, documentId) => {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!document) {
    const error = new Error('Không tìm thấy tài liệu');
    error.statusCode = 404;
    throw error;
  }

  if (!document.isPublic && document.uploadedBy !== userId && userRole !== 'ADMIN') {
    const error = new Error('Bạn không có quyền xem tài liệu này');
    error.statusCode = 403;
    throw error;
  }

  return prisma.documentVersion.findMany({
    where: { documentId },
    orderBy: { version: 'desc' },
  });
};

async function getAuthorizedDocumentVersion(currentUser, documentId, versionId, actionText = 'xem') {
  const version = await prisma.documentVersion.findFirst({
    where: {
      id: versionId,
      documentId,
    },
    include: {
      document: true,
    },
  });

  if (!version) {
    const error = new Error('Không tìm thấy phiên bản tài liệu');
    error.statusCode = 404;
    throw error;
  }

  const document = version.document;
  if (!document.isPublic && (!currentUser || (document.uploadedBy !== currentUser.id && currentUser.role !== 'ADMIN'))) {
    const error = new Error(`Bạn không có quyền ${actionText} phiên bản tài liệu này`);
    error.statusCode = 403;
    throw error;
  }

  return version;
}

const previewDocumentVersion = async (currentUser, documentId, versionId) => {
  const version = await getAuthorizedDocumentVersion(currentUser, documentId, versionId, 'xem');

  const downloadUrl = storageService.getDownloadUrl(version.fileUrl);
  const result = {
    previewUrl: downloadUrl,
    fileName: version.fileName,
    mimeType: version.mimeType,
    version: version.version,
    localPath: null,
  };

  // Nếu lưu file local thì trả về đường dẫn thật để controller stream inline trên web,
  // không dùng res.download vì res.download luôn ép trình duyệt tải file.
  if (!/^https?:\/\//i.test(version.fileUrl || '') && STORAGE_TYPE.toLowerCase() === 'local') {
    const filePath = path.join(UPLOAD_PATH, path.basename(version.fileUrl));
    if (fs.existsSync(filePath)) {
      result.localPath = filePath;
    }
  }

  return result;
};

const downloadDocumentVersion = async (currentUser, documentId, versionId) => {
  const version = await getAuthorizedDocumentVersion(currentUser, documentId, versionId, 'tải');

  const downloadUrl = storageService.getDownloadUrl(version.fileUrl);
  ensureDownloadTargetExists(downloadUrl, version.fileName);

  return {
    downloadUrl,
    fileName: version.fileName,
    mimeType: version.mimeType,
    version: version.version,
  };
};

module.exports = {
  createDocument,
  getAllDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  restoreDocument,
  downloadDocument,
  getMyDocuments,
  getDocumentVersions,
  previewDocumentVersion,
  downloadDocumentVersion,
};