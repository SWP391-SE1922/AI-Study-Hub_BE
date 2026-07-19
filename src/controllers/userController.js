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
  await userService.deleteUser(req.params.id, req.user.id);
  return sendSuccess(res, 'Đã xóa mềm người dùng', null, null, 200);
});

const restoreUser = asyncHandler(async (req, res) => {
  const user = await userService.restoreUser(req.params.id);
  return sendSuccess(res, 'Đã khôi phục người dùng', { user }, null, 200);
});

/**
 * Khóa người dùng (Admin Only)
 */
const lockUser = asyncHandler(async (req, res) => {
  const { duration } = req.body;
  const updatedUser = await userService.lockUser(req.params.id, duration);
  return sendSuccess(res, 'Khóa người dùng thành công', { user: updatedUser }, null, 200);
});

/**
 * Cập nhật gói cước của người dùng (Admin Only)
 */
const updateUserPlan = asyncHandler(async (req, res) => {
  const { plan } = req.body;
  const updatedUser = await userService.updateUserPlan(req.params.id, plan);
  return sendSuccess(res, 'Cập nhật gói cước thành công', { user: updatedUser }, null, 200);
});

module.exports = {
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  restoreUser,
  lockUser,
  updateUserPlan,
};
