const prisma = require('../config/database');
const { getStorageService } = require('../config/storage');
const { getPaginationParams, getPaginationMetadata } = require('../utils/pagination');

const storageService = getStorageService();

/**
 * Đăng tải tài liệu mới (Upload)
 */
const createDocument = async (userId, file, data) => {
  const { title, description, subject, categoryId, isPublic } = data;

  // 1. Tải file lên thông qua Storage Service
  const fileData = await storageService.upload(file);

  // 2. Kiểm tra nếu có categoryId thì phải tồn tại danh mục trong DB
  if (categoryId) {
    const categoryExists = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!categoryExists) {
      throw new Error('Danh mục tài liệu không hợp lệ hoặc đã bị xóa');
    }
  }

  // 3. Lưu bản ghi vào cơ sở dữ liệu
  const document = await prisma.document.create({
    data: {
      title,
      description,
      subject,
      fileUrl: fileData.fileUrl,
      fileName: fileData.fileName,
      fileSize: fileData.fileSize,
      mimeType: fileData.mimeType,
      uploadedBy: userId,
      categoryId: categoryId || null,
      isPublic: isPublic !== undefined ? isPublic : true,
    },
    include: {
      user: {
        select: { id: true, fullName: true, avatarUrl: true },
      },
      category: {
        select: { id: true, name: true },
      },
    },
  });

  return document;
};

/**
 * Lấy danh sách tài liệu với bộ lọc, tìm kiếm, phân trang & sắp xếp
 */
const getAllDocuments = async (currentUser, queryParams) => {
  const { page, limit, skip, take } = getPaginationParams(queryParams);
  const { search, categoryId, subject, uploadedBy, sortBy, sortOrder } = queryParams;

  // 1. Xây dựng phân quyền hiển thị (Visibility)
  // Guest: chỉ thấy public
  // User: thấy public + của mình
  // Admin: thấy tất cả
  let visibilityCondition = { isPublic: true };

  if (currentUser) {
    if (currentUser.role === 'ADMIN') {
      visibilityCondition = {}; // Admin không cần lọc visibility
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

  // Lọc theo từ khóa tìm kiếm (tìm kiếm không phân biệt hoa thường LIKE trong title, description, subject)
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
      category: {
        select: { id: true, name: true },
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
 */
const updateDocument = async (userId, userRole, id, data) => {
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

  const { title, description, subject, categoryId, isPublic } = data;

  if (categoryId) {
    const categoryExists = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!categoryExists) {
      throw new Error('Danh mục tài liệu không hợp lệ');
    }
  }

  const updatedDocument = await prisma.document.update({
    where: { id },
    data: {
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(subject !== undefined && { subject }),
      ...(categoryId !== undefined && { categoryId: categoryId || null }),
      ...(isPublic !== undefined && { isPublic }),
    },
    include: {
      user: {
        select: { id: true, fullName: true, avatarUrl: true },
      },
      category: {
        select: { id: true, name: true },
      },
    },
  });

  return updatedDocument;
};

/**
 * Xóa tài liệu
 */
const deleteDocument = async (userId, userRole, id) => {
  const document = await prisma.document.findUnique({ where: { id } });
  
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

  // 1. Xóa file vật lý trên ổ đĩa thông qua Storage Service
  await storageService.delete(document.fileUrl);

  // 2. Xóa bản ghi trong DB
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

  // 3. Lấy đường dẫn vật lý để gửi về cho client tải
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

module.exports = {
  createDocument,
  getAllDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  downloadDocument,
  getMyDocuments,
};
