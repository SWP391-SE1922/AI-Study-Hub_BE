const prisma = require('../config/database');
const { markUniqueDeleted, restoreUniqueValue, notDeleted } = require('../utils/softDelete');

/**
 * Lấy danh sách danh mục.
 * Admin (includeDeleted=true) thấy cả bản ghi đã xóa mềm.
 */
const getAllCategories = async ({ includeDeleted = false } = {}) => {
  const where = includeDeleted ? {} : notDeleted();

  const categories = await prisma.category.findMany({
    where,
    select: {
      id: true,
      name: true,
      description: true,
      deletedAt: true,
      createdAt: true,
      _count: {
        select: { documents: true },
      },
    },
    orderBy: [{ deletedAt: 'asc' }, { name: 'asc' }],
  });

  return categories.map((c) => ({
    ...c,
    name: c.deletedAt ? restoreUniqueValue(c.name) : c.name,
  }));
};

const createCategory = async (name, description) => {
  const existingCategory = await prisma.category.findFirst({
    where: { name, ...notDeleted() },
  });
  if (existingCategory) {
    const error = new Error('Tên danh mục này đã tồn tại.');
    error.statusCode = 409;
    throw error;
  }

  // Revive soft-deleted cùng tên nếu có
  const anyWithBase = await prisma.category.findMany({
    where: {
      OR: [{ name }, { name: { startsWith: `${name}.__del__.` } }],
    },
  });
  const resurrect = anyWithBase.find((c) => c.deletedAt && restoreUniqueValue(c.name) === name);
  if (resurrect) {
    return prisma.category.update({
      where: { id: resurrect.id },
      data: { name, description, deletedAt: null },
    });
  }

  return prisma.category.create({
    data: { name, description },
  });
};

const updateCategory = async (id, name, description) => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category || category.deletedAt) {
    const error = new Error('Không tìm thấy danh mục yêu cầu.');
    error.statusCode = 404;
    throw error;
  }

  if (name && name !== category.name) {
    const duplicate = await prisma.category.findFirst({
      where: { name, ...notDeleted(), NOT: { id } },
    });
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

const deleteCategory = async (id) => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category || category.deletedAt) {
    const error = new Error('Không tìm thấy danh mục yêu cầu.');
    error.statusCode = 404;
    throw error;
  }

  await prisma.category.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      name: markUniqueDeleted(category.name, id),
    },
  });
  return true;
};

const restoreCategory = async (id) => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    const error = new Error('Không tìm thấy danh mục yêu cầu.');
    error.statusCode = 404;
    throw error;
  }
  if (!category.deletedAt) {
    const error = new Error('Danh mục này chưa bị xóa.');
    error.statusCode = 400;
    throw error;
  }

  const name = restoreUniqueValue(category.name);
  const clash = await prisma.category.findFirst({
    where: { name, ...notDeleted(), NOT: { id } },
  });
  if (clash) {
    const error = new Error('Tên danh mục đã được sử dụng. Không thể khôi phục.');
    error.statusCode = 409;
    throw error;
  }

  return prisma.category.update({
    where: { id },
    data: { deletedAt: null, name },
  });
};

module.exports = {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  restoreCategory,
};
