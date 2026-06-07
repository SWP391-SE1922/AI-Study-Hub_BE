const categoryService = require('../services/categoryService');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

/**
 * Lấy danh sách toàn bộ danh mục tài liệu
 */
const getAllCategories = asyncHandler(async (req, res) => {
  const categories = await categoryService.getAllCategories();
  return sendSuccess(res, 'Lấy danh sách danh mục thành công', { categories }, null, 200);
});

/**
 * Tạo mới danh mục (Admin Only)
 */
const createCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const category = await categoryService.createCategory(name, description);
  return sendSuccess(res, 'Tạo mới danh mục thành công', { category }, null, 201);
});

/**
 * Cập nhật thông tin danh mục (Admin Only)
 */
const updateCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const updatedCategory = await categoryService.updateCategory(req.params.id, name, description);
  return sendSuccess(res, 'Cập nhật danh mục thành công', { category: updatedCategory }, null, 200);
});

/**
 * Xóa danh mục (Admin Only)
 */
const deleteCategory = asyncHandler(async (req, res) => {
  await categoryService.deleteCategory(req.params.id);
  return res.status(204).end(); // Trả về 204 No Content
});

module.exports = {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
