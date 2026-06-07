const prisma = require('../config/database');

/**
 * Lấy danh sách toàn bộ danh mục kèm số lượng tài liệu
 */
const getAllCategories = async () => {
  return prisma.category.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      _count: {
        select: { documents: true },
      },
    },
    orderBy: { name: 'asc' },
  });
};

/**
 * Tạo mới danh mục (Admin Only)
 */
const createCategory = async (name, description) => {
  // Kiểm tra trùng tên danh mục
  const existingCategory = await prisma.category.findUnique({ where: { name } });
  if (existingCategory) {
    const error = new Error('Tên danh mục này đã tồn tại.');
    error.statusCode = 409;
    throw error;
  }

  return prisma.category.create({
    data: { name, description },
  });
};

/**
 * Cập nhật danh mục (Admin Only)
 */
const updateCategory = async (id, name, description) => {
  // Kiểm tra danh mục có tồn tại không
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    const error = new Error('Không tìm thấy danh mục yêu cầu.');
    error.statusCode = 404;
    throw error;
  }

  // Kiểm tra trùng tên với danh mục khác
  if (name && name !== category.name) {
    const duplicate = await prisma.category.findUnique({ where: { name } });
    if (duplicate) {
      const error = new Error('Tên danh mục này đã được sử dụng bởi danh mục khác.');
      error.statusCode = 409;
      throw error;
    }
  }

  return prisma.category.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
    },
  });
};

/**
 * Xóa danh mục (Admin Only)
 */
const deleteCategory = async (id) => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    const error = new Error('Không tìm thấy danh mục yêu cầu.');
    error.statusCode = 404;
    throw error;
  }

  // Xóa danh mục (các Document sẽ tự động SetNull categoryId theo quy định onDelete: SetNull của Prisma)
  await prisma.category.delete({ where: { id } });
  return true;
};

module.exports = {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
