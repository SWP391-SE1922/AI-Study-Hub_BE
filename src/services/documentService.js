const fs = require('fs');
const path = require('path');
const prisma = require('../config/database');
const { getStorageService, STORAGE_TYPE, UPLOAD_PATH } = require('../config/storage');
const { getPaginationParams, getPaginationMetadata } = require('../utils/pagination');
const { extractFilePreview, extractFilePreviewFromUrl } = require('../utils/filePreview');
const { STORAGE_LIMITS } = require('../config/constants');
const { normalizeUploadedFileName, normalizeDocumentFileNames } = require('../utils/fileName');

const storageService = getStorageService();

const OFFICE_PREVIEW_EXTENSIONS = new Set(['.pptx', '.docx', '.xlsx']);

const DOCUMENT_INCLUDE = {
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
};

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

function cleanString(value) {
  return String(value || '').trim();
}

function toNullableId(value) {
  const text = cleanString(value);
  if (!text || text === 'root' || text === 'null' || text === 'undefined') return null;
  return text;
}

function parseBoolean(value, defaultValue = true) {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  return String(value).toLowerCase() === 'true';
}

function comparableText(value) {
  return normalizeUploadedFileName(value || '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function comparableFileBase(fileName) {
  const safeName = normalizeUploadedFileName(fileName || '');
  return comparableText(path.basename(safeName, path.extname(safeName)));
}

function comparableExtension(fileName) {
  return path.extname(normalizeUploadedFileName(fileName || '')).toLowerCase();
}

function isSameDocumentCandidate(document, uploadedFileName, title) {
  const newFileKey = comparableText(uploadedFileName);
  const oldFileKey = comparableText(document.fileName);

  if (newFileKey && oldFileKey && newFileKey === oldFileKey) return true;

  const newBaseKey = comparableFileBase(uploadedFileName);
  const oldBaseKey = comparableFileBase(document.fileName);
  const newExt = comparableExtension(uploadedFileName);
  const oldExt = comparableExtension(document.fileName);

  if (newBaseKey && oldBaseKey && newBaseKey === oldBaseKey && newExt === oldExt) {
    return true;
  }

  const newTitleKey = comparableText(title);
  const oldTitleKey = comparableText(document.title);

  return Boolean(newTitleKey && oldTitleKey && newTitleKey === oldTitleKey && newExt === oldExt);
}

async function findExistingDocumentForNewVersion(userId, uploadedFileName, title) {
  const recentDocuments = await prisma.document.findMany({
    where: { uploadedBy: userId },
    orderBy: { updatedAt: 'desc' },
    take: 200,
    select: {
      id: true,
      title: true,
      fileName: true,
      currentVersion: true,
      uploadedBy: true,
      isPublic: true,
      categoryId: true,
      subjectId: true,
      folderId: true,
    },
  });

  return recentDocuments.find((document) => isSameDocumentCandidate(document, uploadedFileName, title)) || null;
}

async function getNextVersion(client, documentId, fallbackCurrentVersion = 1) {
  const latestVersion = await client.documentVersion.findFirst({
    where: { documentId },
    orderBy: { version: 'desc' },
    select: { version: true },
  });

  return Math.max(Number(fallbackCurrentVersion || 0), Number(latestVersion?.version || 0)) + 1;
}

async function assertCanStoreMore(userId, fileSize) {
  let user = await prisma.user.findUnique({ where: { id: userId } });
  user = await normalizeUserStorageLimit(user);

  if (user && Number(user.usedStorage || 0) + Number(fileSize || 0) > Number(user.storageLimit || 0)) {
    const error = new Error('Dung lượng lưu trữ đã vượt quá giới hạn cho phép. Vui lòng xóa bớt tài liệu cũ.');
    error.statusCode = 400;
    throw error;
  }

  return user;
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
 * Đăng tải tài liệu.
 * Nếu người dùng upload lại cùng một tài liệu, hệ thống sẽ tạo version mới thay vì tạo document mới.
 */
const createDocument = async (userId, file, data) => {
  const { title, description, subject, subjectId, categoryId, folderId, isPublic } = data;

  const cleanTitle = cleanString(title);
  if (!cleanTitle) {
    const error = new Error('Vui lòng nhập tiêu đề tài liệu.');
    error.statusCode = 400;
    throw error;
  }

  const finalSubjectId = subjectId !== undefined ? toNullableId(subjectId) : null;
  const finalCategoryId = categoryId !== undefined ? toNullableId(categoryId) : null;
  const finalFolderId = folderId !== undefined ? toNullableId(folderId) : null;

  // 0. Kiểm tra dung lượng lưu trữ trước khi xử lý file
  await assertCanStoreMore(userId, file.size);

  // 1. Kiểm tra danh mục
  if (finalCategoryId) {
    const categoryExists = await prisma.category.findUnique({ where: { id: finalCategoryId } });
    if (!categoryExists) {
      const error = new Error('Danh mục tài liệu không hợp lệ hoặc đã bị xóa');
      error.statusCode = 400;
      throw error;
    }
  }

  // 2. Kiểm tra thư mục
  if (finalFolderId) {
    const folderExists = await prisma.folder.findFirst({ where: { id: finalFolderId, userId } });
    if (!folderExists) {
      const error = new Error('Thư mục không hợp lệ hoặc không thuộc quyền sở hữu của bạn.');
      error.statusCode = 400;
      throw error;
    }
  }

  // 3. Kiểm tra môn học
  if (finalSubjectId) {
    const subjectExists = await prisma.subject.findUnique({ where: { id: finalSubjectId } });
    if (!subjectExists) {
      const error = new Error('Môn học không hợp lệ hoặc đã bị xóa');
      error.statusCode = 400;
      throw error;
    }
  }

  // 4. Trích xuất preview và upload file
  const contentPreview = await extractFilePreview(file);
  const fileData = await storageService.upload(file);
  const safeFileName = normalizeUploadedFileName(fileData.fileName);

  // 5. Nếu upload trùng tài liệu của cùng user thì tạo version mới
  const existingDocument = await findExistingDocumentForNewVersion(userId, safeFileName, cleanTitle);

  if (existingDocument) {
    const updatedDocument = await prisma.$transaction(async (tx) => {
      const nextVersion = await getNextVersion(tx, existingDocument.id, existingDocument.currentVersion);

      await tx.documentVersion.create({
        data: {
          documentId: existingDocument.id,
          version: nextVersion,
          fileUrl: fileData.fileUrl,
          fileName: safeFileName,
          fileSize: fileData.fileSize,
          mimeType: fileData.mimeType,
          uploadedBy: userId,
        },
      });

      await tx.user.update({
        where: { id: existingDocument.uploadedBy },
        data: { usedStorage: { increment: fileData.fileSize } },
      });

      return tx.document.update({
        where: { id: existingDocument.id },
        data: {
          title: cleanTitle,
          description: description !== undefined ? description : undefined,
          subject: subject !== undefined ? subject : undefined,
          ...(subjectId !== undefined && { subjectId: finalSubjectId }),
          ...(categoryId !== undefined && { categoryId: finalCategoryId }),
          ...(folderId !== undefined && { folderId: finalFolderId }),
          isPublic: parseBoolean(isPublic, existingDocument.isPublic),
          fileUrl: fileData.fileUrl,
          fileName: safeFileName,
          fileSize: fileData.fileSize,
          mimeType: fileData.mimeType,
          contentPreview,
          currentVersion: nextVersion,
        },
        include: DOCUMENT_INCLUDE,
      });
    });

    return normalizeDocumentFileNames(updatedDocument);
  }

  // 6. Nếu chưa có tài liệu trùng thì tạo document mới version 1
  const document = await prisma.$transaction(async (tx) => {
    const createdDocument = await tx.document.create({
      data: {
        title: cleanTitle,
        description,
        contentPreview,
        subject,
        subjectId: finalSubjectId,
        fileUrl: fileData.fileUrl,
        fileName: safeFileName,
        fileSize: fileData.fileSize,
        mimeType: fileData.mimeType,
        uploadedBy: userId,
        categoryId: finalCategoryId,
        folderId: finalFolderId,
        isPublic: parseBoolean(isPublic, true),
        currentVersion: 1,
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: { usedStorage: { increment: fileData.fileSize } },
    });

    await tx.documentVersion.create({
      data: {
        documentId: createdDocument.id,
        version: 1,
        fileUrl: fileData.fileUrl,
        fileName: safeFileName,
        fileSize: fileData.fileSize,
        mimeType: fileData.mimeType,
        uploadedBy: userId,
      },
    });

    return tx.document.findUnique({
      where: { id: createdDocument.id },
      include: DOCUMENT_INCLUDE,
    });
  });

  return normalizeDocumentFileNames(document);
};

/**
 * Lấy danh sách tài liệu với bộ lọc, tìm kiếm, phân trang & sắp xếp
 */
const getAllDocuments = async (currentUser, queryParams) => {
  const { page, limit, skip, take } = getPaginationParams(queryParams);
  const { search, categoryId, subject, subjectId, uploadedBy, sortBy, sortOrder } = queryParams;

  // 1. Xây dựng phân quyền hiển thị
  let visibilityCondition = { isPublic: true };

  if (currentUser) {
    if (currentUser.role === 'ADMIN') {
      visibilityCondition = {};
    } else if (currentUser.role === 'USER') {
      visibilityCondition = {
        OR: [
          { isPublic: true },
          { uploadedBy: currentUser.id },
        ],
      };
    }
  }

  // 2. Xây dựng bộ lọc chi tiết
  const where = {
    ...visibilityCondition,
  };

  if (search) {
    const cleanSearch = search.trim();
    where.OR = [
      ...(where.OR || []),
      { title: { contains: cleanSearch } },
      { description: { contains: cleanSearch } },
      { subject: { contains: cleanSearch } },
    ];
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (subject) {
    where.subject = { contains: subject };
  }

  if (subjectId) {
    where.subjectId = subjectId;
  }

  // Chỉ Admin mới được lọc theo tài khoản người tải
  if (uploadedBy && currentUser && currentUser.role === 'ADMIN') {
    where.uploadedBy = uploadedBy;
  }

  // 3. Xử lý sắp xếp
  const allowedSortFields = ['createdAt', 'title', 'downloadCount', 'fileSize'];
  const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const finalSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

  // 4. Thực thi truy vấn đếm và lấy dữ liệu
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

  return { documents: normalizeDocumentFileNames(documents), pagination };
};

/**
 * Lấy chi tiết tài liệu theo ID
 */
const getDocumentById = async (currentUser, id) => {
  const document = await prisma.document.findUnique({
    where: { id },
    include: DOCUMENT_INCLUDE,
  });

  if (!document) {
    const error = new Error('Không tìm thấy tài liệu yêu cầu.');
    error.statusCode = 404;
    throw error;
  }

  // Kiểm tra quyền xem tài liệu riêng tư
  if (!document.isPublic) {
    if (!currentUser || (document.uploadedBy !== currentUser.id && currentUser.role !== 'ADMIN')) {
      const error = new Error('Bạn không có quyền truy cập tài liệu riêng tư này.');
      error.statusCode = 403;
      throw error;
    }
  }

  const previewDocument = await getPreviewFromStoredDocument(document);
  return normalizeDocumentFileNames(previewDocument);
};

/**
 * Cập nhật tài liệu.
 * Nếu có upload file mới thì tạo version mới, không xóa file cũ.
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

  const { title, description, subject, subjectId, categoryId, folderId, isPublic } = data;
  const finalSubjectId = subjectId !== undefined ? toNullableId(subjectId) : null;
  const finalCategoryId = categoryId !== undefined ? toNullableId(categoryId) : null;
  const finalFolderId = folderId !== undefined ? toNullableId(folderId) : null;

  if (finalCategoryId) {
    const categoryExists = await prisma.category.findUnique({ where: { id: finalCategoryId } });
    if (!categoryExists) {
      const error = new Error('Danh mục tài liệu không hợp lệ');
      error.statusCode = 400;
      throw error;
    }
  }

  if (finalSubjectId) {
    const subjectExists = await prisma.subject.findUnique({ where: { id: finalSubjectId } });
    if (!subjectExists) {
      const error = new Error('Môn học không hợp lệ');
      error.statusCode = 400;
      throw error;
    }
  }

  if (finalFolderId) {
    const folderExists = await prisma.folder.findFirst({ where: { id: finalFolderId, userId: document.uploadedBy } });
    if (!folderExists) {
      const error = new Error('Thư mục không hợp lệ hoặc không thuộc quyền sở hữu của bạn.');
      error.statusCode = 400;
      throw error;
    }
  }

  const updateData = {
    ...(title !== undefined && { title: cleanString(title) }),
    ...(description !== undefined && { description }),
    ...(subject !== undefined && { subject }),
    ...(subjectId !== undefined && { subjectId: finalSubjectId }),
    ...(categoryId !== undefined && { categoryId: finalCategoryId }),
    ...(folderId !== undefined && { folderId: finalFolderId }),
    ...(isPublic !== undefined && { isPublic: parseBoolean(isPublic, document.isPublic) }),
  };

  // Nếu có file mới thì upload file mới và tạo version mới
  if (file) {
    await assertCanStoreMore(document.uploadedBy, file.size);

    const contentPreview = await extractFilePreview(file);
    const fileData = await storageService.upload(file);
    const safeFileName = normalizeUploadedFileName(fileData.fileName);

    const updatedDocument = await prisma.$transaction(async (tx) => {
      const nextVersion = await getNextVersion(tx, document.id, document.currentVersion);

      await tx.documentVersion.create({
        data: {
          documentId: document.id,
          version: nextVersion,
          fileUrl: fileData.fileUrl,
          fileName: safeFileName,
          fileSize: fileData.fileSize,
          mimeType: fileData.mimeType,
          uploadedBy: userId,
        },
      });

      await tx.user.update({
        where: { id: document.uploadedBy },
        data: { usedStorage: { increment: fileData.fileSize } },
      });

      return tx.document.update({
        where: { id },
        data: {
          ...updateData,
          fileUrl: fileData.fileUrl,
          fileName: safeFileName,
          fileSize: fileData.fileSize,
          mimeType: fileData.mimeType,
          contentPreview,
          currentVersion: nextVersion,
        },
        include: DOCUMENT_INCLUDE,
      });
    });

    return normalizeDocumentFileNames(updatedDocument);
  }

  const updatedDocument = await prisma.document.update({
    where: { id },
    data: updateData,
    include: DOCUMENT_INCLUDE,
  });

  return normalizeDocumentFileNames(updatedDocument);
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

  // 2. Trừ dung lượng usedStorage của User theo tổng dung lượng version
  const totalVersionSize = document.versions.reduce(
    (sum, version) => sum + Number(version.fileSize || 0),
    0
  ) || Number(document.fileSize || 0);

  await prisma.user.update({
    where: { id: document.uploadedBy },
    data: {
      usedStorage: {
        decrement: totalVersionSize,
      },
    },
  });

  // Đảm bảo usedStorage không bị âm
  const user = await prisma.user.findUnique({ where: { id: document.uploadedBy } });
  if (user && user.usedStorage < 0) {
    await prisma.user.update({ where: { id: document.uploadedBy }, data: { usedStorage: 0 } });
  }

  // 3. Xóa bản ghi trong DB
  await prisma.document.delete({ where: { id } });

  return true;
};

/**
 * Tải xuống tài liệu
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
 * Lấy danh sách tài liệu của người dùng hiện tại
 */
const getMyDocuments = async (userId, queryParams) => {
  const { page, limit, skip, take } = getPaginationParams(queryParams);
  const { search, sortBy, sortOrder } = queryParams;

  const where = {
    uploadedBy: userId,
  };

  if (search) {
    const cleanSearch = search.trim();
    where.OR = [
      { title: { contains: cleanSearch } },
      { description: { contains: cleanSearch } },
      { subject: { contains: cleanSearch } },
    ];
  }

  const allowedSortFields = ['createdAt', 'title', 'downloadCount', 'fileSize'];
  const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const finalSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

  const total = await prisma.document.count({ where });

  const documents = await prisma.document.findMany({
    where,
    skip,
    take,
    include: {
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

  return { documents: normalizeDocumentFileNames(documents), pagination };
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

  const versions = await prisma.documentVersion.findMany({
    where: { documentId },
    orderBy: { version: 'desc' },
  });

  return normalizeDocumentFileNames(versions);
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
};
