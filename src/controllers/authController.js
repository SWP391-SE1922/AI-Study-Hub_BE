const authService = require('../services/authService');
const userService = require('../services/userService');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

/**
 * Đăng ký tài khoản (Giữ nguyên)
 */
const register = asyncHandler(async (req, res) => {
  const { email, password, fullName } = req.body;
  const result = await authService.register(email, password, fullName);
  return sendSuccess(res, 'Đăng ký tài khoản thành công', result, null, 201);
});

/**
 * Đăng nhập (Giữ nguyên)
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  return sendSuccess(res, 'Đăng nhập thành công', result, null, 200);
});

/**
 * Đăng xuất (Giữ nguyên)
 */
const logout = asyncHandler(async (req, res) => {
  return sendSuccess(res, 'Đăng xuất thành công', null, null, 200);
});

/**
 * Quên mật khẩu (Giữ nguyên)
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await authService.forgotPassword(email);
  return sendSuccess(res, result?.message || 'Đã xử lý yêu cầu quên mật khẩu', { emailSent: result?.emailSent ?? null }, null, 200);
});

/**
 * Đặt lại mật khẩu mới (Giữ nguyên)
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  await authService.resetPassword(token, newPassword);
  return sendSuccess(res, 'Đặt lại mật khẩu thành công', null, null, 200);
});

/**
 * Lấy thông tin cá nhân hiện tại (Giữ nguyên)
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.user.id);
  return sendSuccess(res, 'Lấy thông tin cá nhân thành công', { user }, null, 200);
});

/**
 * Cập nhật hồ sơ cá nhân (Giữ nguyên)
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, avatarUrl } = req.body;
  const updatedUser = await userService.updateProfile(req.user.id, { fullName, avatarUrl });
  return sendSuccess(res, 'Cập nhật hồ sơ cá nhân thành công', { user: updatedUser }, null, 200);
});

/**
 * Đổi mật khẩu (Giữ nguyên)
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user.id, currentPassword, newPassword);
  return sendSuccess(res, 'Đổi mật khẩu thành công', null, null, 200);
});

/**
 * Xác thực email (Giữ nguyên)
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
 * Gửi lại email xác thực (Giữ nguyên)
 */
const resendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await authService.resendVerificationEmail(email);
  return sendSuccess(res, result?.message || 'Đã xử lý yêu cầu gửi lại email xác thực', { emailSent: result?.emailSent ?? null }, null, 200);
});

// ==========================================
// THÊM XỬ LÝ GOOGLE LOGIN TẠI ĐÂY
// ==========================================
/**
 * Đăng nhập bằng Google Account
 */
const loginGoogle = asyncHandler(async (req, res) => {
  const { idToken } = req.body;

  // Gọi xuống Service xử lý verify & kiểm tra DB
  const result = await authService.loginGoogle(idToken);

  // Trả về response theo đúng format sendSuccess của dự án
  return sendSuccess(res, 'Đăng nhập Google thành công', result, null, 200);
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
  loginGoogle, // <-- Đừng quên export ở đây nha
};