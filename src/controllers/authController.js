const authService = require('../services/authService');
const userService = require('../services/userService');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

/**
 * Đăng ký tài khoản
 */
const register = asyncHandler(async (req, res) => {
  const { email, password, fullName, phoneNumber } = req.body;
  const result = await authService.register(email, password, fullName, phoneNumber);
  return sendSuccess(res, 'Đăng ký tài khoản thành công', result, null, 201);
});

/**
 * Đăng nhập
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  return sendSuccess(res, 'Đăng nhập thành công', result, null, 200);
});

/**
 * Đăng xuất
 * 
 * NOTE: Vì chúng ta thiết kế cơ chế JWT Stateless (Không lưu trạng thái ở server),
 * token không thể bị vô hiệu hóa phía server trừ khi triển khai blacklist hoặc redis.
 * Ở phạm vi bài viết này, logout chỉ cần phản hồi thành công và phía client (Trình duyệt/Mobile)
 * tự động xóa token khỏi LocalStorage/Cookies để kết thúc phiên đăng nhập. Điều này giảm tải cho server.
 */
const logout = asyncHandler(async (req, res) => {
  return sendSuccess(res, 'Đăng xuất thành công', null, null, 200);
});

/**
 * Quên mật khẩu
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  await authService.forgotPassword(email);
  return sendSuccess(res, 'Email hướng dẫn đặt lại mật khẩu đã được gửi', null, null, 200);
});

/**
 * Đặt lại mật khẩu mới
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  await authService.resetPassword(token, newPassword);
  return sendSuccess(res, 'Đặt lại mật khẩu thành công', null, null, 200);
});

/**
 * Lấy thông tin cá nhân hiện tại
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.user.id);
  return sendSuccess(res, 'Lấy thông tin cá nhân thành công', { user }, null, 200);
});

/**
 * Cập nhật hồ sơ cá nhân (Không cho sửa email, password, role ở đây)
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, phoneNumber, avatarUrl } = req.body;
  const updatedUser = await userService.updateProfile(req.user.id, { fullName, phoneNumber, avatarUrl });
  return sendSuccess(res, 'Cập nhật hồ sơ cá nhân thành công', { user: updatedUser }, null, 200);
});

/**
 * Đổi mật khẩu
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user.id, currentPassword, newPassword);
  return sendSuccess(res, 'Đổi mật khẩu thành công', null, null, 200);
});

/**
 * Xác thực email
 */
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;
  if (!token) {
    const error = new Error('Thiếu token xác thực.');
    error.statusCode = 400;
    throw error;
  }
  await authService.verifyEmail(token);
  return sendSuccess(res, 'Xác thực email thành công', null, null, 200);
});

/**
 * Gửi lại email xác thực
 */
const resendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;
  await authService.resendVerificationEmail(email);
  return sendSuccess(res, 'Email xác thực đã được gửi lại', null, null, 200);
});

module.exports = {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
  updateProfile,
  changePassword,
  verifyEmail,
  resendVerificationEmail,
};
