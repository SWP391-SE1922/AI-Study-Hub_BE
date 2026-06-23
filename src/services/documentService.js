const prisma = require('../config/database');
const { getStorageService } = require('../config/storage');
const { getPaginationParams, getPaginationMetadata } = require('../utils/pagination');

const storageService = getStorageService();

/**
 * Đăng tải tài liệu mới (Upload)
 */
const createDocument = async (userId, file, data) => {
<<<<<<< HEAD
  const { title, description, subject, categoryId, folderId, isPublic } = data;
=======
  const { title, description, subject, subjectId, categoryId, folderId, isPublic } = data;
>>>>>>> b33f7ce1b8bf0059cec22bb1703c2a4ed8f774a3

  // 0. Kiểm tra dung lượng lưu trữ trước khi xử lý file
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user && user.usedStorage + file.size > user.storageLimit) {
    const error = new Error('Dung lượng lưu trữ đã vượt quá giới hạn cho phép. Vui lòng xóa bớt tài liệu cũ.');
    error.statusCode = 400;
<<<<<<< HEAD
    throw error; // controller nên catch và xóa req.file
=======
    throw error;
>>>>>>> b33f7ce1b8bf0059cec22bb1703c2a4ed8f774a3
  }

  // 1. Tải file lên thông qua Storage Service
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

<<<<<<< HEAD
  // 3. Lưu bản ghi vào cơ sở dữ liệu
=======
  // 3. Kiểm tra nếu có subjectId thì phải tồn tại môn học trong DB
  if (subjectId) {
    const subjectExists = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subjectExists) {
      throw new Error('Môn học không hợp lệ hoặc đã bị xóa');
    }
  }

  // 4. Lưu bản ghi vào cơ sở dữ liệu
>>>>>>> b33f7ce1b8bf0059cec22bb1703c2a4ed8f774a3
  const document = await prisma.document.create({
    data: {
      title,
      description,
      subject,
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

<<<<<<< HEAD
=======
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

>>>>>>> b33f7ce1b8bf0059cec22bb1703c2a4ed8f774a3
  return document;
};

/**
 * Lấy danh sách tài liệu với bộ lọc, tìm kiếm, phân trang & sắp xếp
 */
const getAllDocuments = async (currentUser, queryParams) => {
  const { page, limit, skip, take } = getPaginationParams(queryParams);
  const { search, categoryId, subject, subjectId, uploadedBy, sortBy, sortOrder } = queryParams;

  // 1. Xây dựng phân quyền hiển thị (Visibility)
  // Guest: chỉ thấy public
  // User: thấy public + của mình
  // Admin: thấy tất cả
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

  // 3. Xử lý sắp xếp (Sort)
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

  return document;
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

  if (subjectId) {
    const subjectExists = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subjectExists) {
      throw new Error('Môn học không hợp lệ');
    }
  }

  const updateData = {
    ...(title !== undefined && { title }),
    ...(description !== undefined && { description }),
    ...(subject !== undefined && { subject }),
    ...(subjectId !== undefined && { subjectId: subjectId || null }),
    ...(categoryId !== undefined && { categoryId: categoryId || null }),
    ...(isPublic !== undefined && { isPublic }),
  };

  // Nếu có file mới thì upload file mới và tạo version mới
  if (file) {
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
    updateData.currentVersion = nextVersion;
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

  // 2. Trừ dung lượng usedStorage của User
  await prisma.user.update({
    where: { id: document.uploadedBy },
    data: { 
      usedStorage: { 
        decrement: document.fileSize 
      } 
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