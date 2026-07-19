const categoryService = require('../services/categoryService');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

const getAllCategories = asyncHandler(async (req, res) => {
  const includeDeleted = req.user?.role === 'ADMIN';
  const categories = await categoryService.getAllCategories({ includeDeleted });
  return sendSuccess(res, 'Lấy danh sách danh mục thành công', { categories }, null, 200);
});

const createCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const category = await categoryService.createCategory(name, description);
  return sendSuccess(res, 'Tạo mới danh mục thành công', { category }, null, 201);
});

const updateCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const updatedCategory = await categoryService.updateCategory(req.params.id, name, description);
  return sendSuccess(res, 'Cập nhật danh mục thành công', { category: updatedCategory }, null, 200);
});

const deleteCategory = asyncHandler(async (req, res) => {
  await categoryService.deleteCategory(req.params.id);
  return sendSuccess(res, 'Đã xóa mềm danh mục', null, null, 200);
});

const restoreCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.restoreCategory(req.params.id);
  return sendSuccess(res, 'Đã khôi phục danh mục', { category }, null, 200);
});

module.exports = {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  restoreCategory,
};
