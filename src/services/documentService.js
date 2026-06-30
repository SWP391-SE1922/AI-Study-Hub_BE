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

function mergeAndConditions(conditions) {
  const compact = conditions.filter(Boolean);
  if (compact.length === 0) return {};
  if (compact.length === 1) return compact[0];
  return { AND: compact };
}

function buildDocumentWhere(currentUser, queryParams, options = {}) {
  const { search, categoryId, subject, subjectId, uploadedBy } = queryParams;
  const andConditions = [];

  if (options.ownerId) {
    andConditions.push({ uploadedBy: options.ownerId });
  } else {
    andConditions.push(buildVisibilityCondition(currentUser));
  }

  andConditions.push(buildSearchCondition(search));

  const cleanCategoryId = cleanText(categoryId);
  if (cleanCategoryId) andConditions.push({ categoryId: cleanCategoryId });

  andConditions.push(buildSubjectCondition({ subjectId, subject }));

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

  // 0. Kiểm tra dung lượng lưu trữ trước khi xử lý file
  let user = await prisma.user.findUnique({ where: { id: userId } });
  user = await normalizeUserStorageLimit(user);
  if (user && user.usedStorage + file.size > user.storageLimit) {
    const error = new Error('Dung lượng lưu trữ đã vượt quá giới hạn cho phép. Vui lòng xóa bớt tài liệu cũ.');
    error.statusCode = 400;
    throw error;
  }

  // 1. Trích xuất trước một phần nội dung để hiển thị xem trước
  const contentPreview = await extractFilePreview(file);

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

  const normalizedSubject = cleanText(subject) || subjectRecord?.name || null;

  // 4. Lưu bản ghi vào cơ sở dữ liệu
  const document = await prisma.document.create({
    data: {
      title,
      description,
      contentPreview,
      subject: normalizedSubject,
      subjectId: subjectId || null,
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

  const { title, description, subject, subjectId, categoryId, isPublic } = data;

  if (categoryId) {
    const categoryExists = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!categoryExists) {
      throw new Error('Danh mục tài liệu không hợp lệ');
    }
  }

  let subjectRecord = null;
  if (subjectId) {
    subjectRecord = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subjectRecord) {
      throw new Error('Môn học không hợp lệ');
    }
  }

  const normalizedSubject = subject !== undefined
    ? (cleanText(subject) || null)
    : (subjectId ? subjectRecord?.name || null : undefined);

  const updateData = {
    ...(title !== undefined && { title }),
    ...(description !== undefined && { description }),
    ...(normalizedSubject !== undefined && { subject: normalizedSubject }),
    ...(subjectId !== undefined && { subjectId: subjectId || null }),
    ...(categoryId !== undefined && { categoryId: categoryId || null }),
    ...(isPublic !== undefined && { isPublic }),
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
 * Xóa tài liệu
 */
const deleteDocument = async (userId, userRole, id) => {
  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      versions: true,
    },
  });

  if (!document) {
    const error = new Error('Không tìm thấy tài liệu.');
    error.statusCode = 404;
    throw error;
  }

  // Phân quyền: chỉ chủ sở hữu hoặc Admin mới được phép xóa
  if (document.uploadedBy !== userId && userRole !== 'ADMIN') {
    const error = new Error('Bạn không có quyền xóa tài liệu này.');
    error.statusCode = 403;
    throw error;
  }

  // 1. Xóa toàn bộ file của các version trên Storage Service
  for (const version of document.versions) {
    await storageService.delete(version.fileUrl);
  }

  // 2. Trừ dung lượng usedStorage của User theo toàn bộ phiên bản đã lưu
  const totalVersionSize = document.versions.reduce((sum, version) => sum + Number(version.fileSize || 0), 0);
  await prisma.user.update({
    where: { id: document.uploadedBy },
    data: {
      usedStorage: {
        decrement: totalVersionSize || document.fileSize,
      },
    },
  });

  // Đảm bảo usedStorage không bị âm (Trường hợp DB bị lệch)
  const user = await prisma.user.findUnique({ where: { id: document.uploadedBy } });
  if (user && user.usedStorage < 0) {
    await prisma.user.update({ where: { id: document.uploadedBy }, data: { usedStorage: 0 } });
  }

  // 3. Xóa bản ghi trong DB
  await prisma.document.delete({ where: { id } });

  return true;
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

async function getDocumentVersionWithAccess(currentUser, documentId, versionId) {
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
  const canAccess = document.isPublic
    || (currentUser && (document.uploadedBy === currentUser.id || currentUser.role === 'ADMIN'));

  if (!canAccess) {
    const error = new Error('Bạn không có quyền truy cập phiên bản tài liệu này');
    error.statusCode = 403;
    throw error;
  }

  return version;
}

const previewDocumentVersion = async (currentUser, documentId, versionId) => {
  const version = await getDocumentVersionWithAccess(currentUser, documentId, versionId);
  let contentPreview = null;

  if (/^https?:\/\//i.test(version.fileUrl || '')) {
    contentPreview = await extractFilePreviewFromUrl(version.fileUrl, {
      fileName: version.fileName,
      mimeType: version.mimeType,
      fileSize: version.fileSize,
    });
  } else if (STORAGE_TYPE.toLowerCase() === 'local' && version.fileUrl) {
    const localPath = storageService.getDownloadUrl(version.fileUrl);
    if (fs.existsSync(localPath)) {
      contentPreview = await extractFilePreview({
        path: localPath,
        originalname: version.fileName,
        mimetype: version.mimeType,
        size: version.fileSize,
      });
    }
  }

  return {
    id: version.id,
    documentId: version.documentId,
    version: version.version,
    fileName: version.fileName,
    fileSize: version.fileSize,
    mimeType: version.mimeType,
    previewUrl: storageService.getPreviewUrl(version.fileUrl),
    contentPreview,
    createdAt: version.createdAt,
  };
};

const downloadDocumentVersion = async (currentUser, documentId, versionId) => {
  const version = await getDocumentVersionWithAccess(currentUser, documentId, versionId);

  return {
    downloadUrl: storageService.getDownloadUrl(version.fileUrl),
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
  downloadDocument,
  getMyDocuments,
  getDocumentVersions,
  previewDocumentVersion,
  downloadDocumentVersion,
};