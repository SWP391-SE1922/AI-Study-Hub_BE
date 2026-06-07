const userService = require('../services/userService');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

/**
 * Lấy danh sách toàn bộ người dùng (Admin Only)
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const result = await userService.getAllUsers(req.query);
  return sendSuccess(res, 'Lấy danh sách người dùng thành công', result.users, result.pagination, 200);
});

/**
 * Lấy thông tin chi tiết một người dùng (Admin Only)
 */
const getUserById = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  return sendSuccess(res, 'Lấy thông tin người dùng thành công', { user }, null, 200);
});

/**
 * Cập nhật vai trò người dùng (Admin Only)
 */
const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const updatedUser = await userService.updateUserRole(req.params.id, role);
  return sendSuccess(res, 'Cập nhật vai trò người dùng thành công', { user: updatedUser }, null, 200);
});

/**
 * Xóa người dùng (Admin Only)
 */
const deleteUser = asyncHandler(async (req, res) => {
  await userService.deleteUser(req.params.id);
  return res.status(204).end(); // Trả về 204 No Content
});

module.exports = {
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
};
