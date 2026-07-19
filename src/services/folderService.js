const prisma = require('../config/database');

/**
 * Tạo thư mục mới
 */
const createFolder = async (userId, data) => {
  const { name, parentId } = data;

  // Kiểm tra xem thư mục trùng tên đã tồn tại trong cùng cấp chưa
  const existingFolder = await prisma.folder.findFirst({
    where: {
      name,
      parentId: parentId || null,
      userId,
      deletedAt: null,
    },
  });

  if (existingFolder) {
    const error = new Error('Thư mục này đã tồn tại ở vị trí hiện tại!');
    error.statusCode = 400;
    throw error;
  }

  // Nếu có parentId, kiểm tra parentId có tồn tại và thuộc về user không
  if (parentId) {
    const parentFolder = await prisma.folder.findFirst({
      where: { id: parentId, userId, deletedAt: null },
    });
    if (!parentFolder) {
      const error = new Error('Thư mục gốc không tồn tại hoặc không thuộc quyền sở hữu của bạn.');
      error.statusCode = 404;
      throw error;
    }
  }

  const newFolder = await prisma.folder.create({
    data: {
      name,
      parentId: parentId || null,
      userId,
    },
  });

  return newFolder;
};

/**
 * Lấy nội dung bên trong một thư mục (Gồm danh sách folder con và file)
 */
const getResources = async (userId, queryParams) => {
  // Nếu folderId = 'root' hoặc null/undefined thì lấy ở thư mục gốc
  const rawFolderId = queryParams.folderId;
  const folderId = (rawFolderId === 'root' || !rawFolderId) ? null : rawFolderId;

  // Nếu có folderId, kiểm tra xem có tồn tại và thuộc quyền user không
  if (folderId) {
    const parentFolder = await prisma.folder.findFirst({
      where: { id: folderId, userId },
    });
    if (!parentFolder) {
      const error = new Error('Thư mục không tồn tại.');
      error.statusCode = 404;
      throw error;
    }
  }

  // Lấy danh sách folder con
  const folders = await prisma.folder.findMany({
    where: {
      parentId: folderId,
      userId,
      deletedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Lấy danh sách file (documents)
  const files = await prisma.document.findMany({
    where: {
      folderId: folderId,
      uploadedBy: userId,
      deletedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  });

  return { folders, files };
};

/**
 * Soft delete thư mục (chỉ khi rỗng).
 */
const deleteFolder = async (userId, folderId) => {
  const folder = await prisma.folder.findFirst({
    where: { id: folderId, userId, deletedAt: null },
  });

  if (!folder) {
    const error = new Error('Không tìm thấy thư mục.');
    error.statusCode = 404;
    throw error;
  }

  const hasFiles = await prisma.document.count({
    where: { folderId, deletedAt: null },
  });
  const hasChildren = await prisma.folder.count({
    where: { parentId: folderId, deletedAt: null },
  });

  if (hasFiles > 0 || hasChildren > 0) {
    const error = new Error('Thư mục không rỗng. Vui lòng xóa hết file và thư mục con bên trong trước khi xóa.');
    error.statusCode = 400;
    throw error;
  }

  const { markUniqueDeleted } = require('../utils/softDelete');
  await prisma.folder.update({
    where: { id: folderId },
    data: {
      deletedAt: new Date(),
      name: markUniqueDeleted(folder.name, folderId),
    },
  });
  return true;
};

module.exports = {
  createFolder,
  getResources,
  deleteFolder,
};
