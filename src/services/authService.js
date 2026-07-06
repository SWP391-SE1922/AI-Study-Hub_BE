const prisma = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/hashPassword');
const generateToken = require('../utils/generateToken');
const emailService = require('./emailService');
const crypto = require('crypto');
const { STORAGE_LIMITS } = require('../config/constants');
// 1. IMPORT THƯ VIỆN GOOGLE AUTH
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

/**
 * Đăng ký tài khoản mới (Giữ nguyên code cũ của bạn)
 */
const register = async (email, password, fullName) => {
  // ... code cũ giữ nguyên ...
};

/**
 * Đăng nhập hệ thống (Giữ nguyên code cũ của bạn)
 */
const login = async (email, password) => {
  // ... code cũ giữ nguyên ...
};

/**
 * Gửi yêu cầu quên mật khẩu (Giữ nguyên code cũ của bạn)
 */
const forgotPassword = async (email) => {
  // ... code cũ giữ nguyên ...
};

/**
 * Đặt lại mật khẩu mới qua Token (Giữ nguyên code cũ của bạn)
 */
const resetPassword = async (token, newPassword) => {
  // ... code cũ giữ nguyên ...
};

/**
 * Đổi mật khẩu (Giữ nguyên code cũ của bạn)
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  // ... code cũ giữ nguyên ...
};

/**
 * Xác thực email (Giữ nguyên code cũ của bạn)
 */
const verifyEmail = async (token) => {
  // ... code cũ giữ nguyên ...
};

/**
 * Gửi lại email xác thực (Giữ nguyên code cũ của bạn)
 */
const resendVerificationEmail = async (email) => {
  // ... code cũ giữ nguyên ...
};

// ==========================================
// 2. THÊM HÀM XỬ LÝ ĐĂNG NHẬP GOOGLE TẠI ĐÂY
// ==========================================
/**
 * Đăng nhập / Đăng ký bằng Google Token
 */
const loginGoogle = async (idToken) => {
  if (!idToken) {
    const error = new Error('Thiếu mã xác thực Google (idToken).');
    error.statusCode = 400;
    throw error;
  }

  let payload;
  try {
    // Xác thực token với Google Server
    const ticket = await googleClient.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    const error = new Error('Mã xác thực Google không hợp lệ hoặc đã hết hạn.');
    error.statusCode = 401;
    throw error;
  }

  const email = normalizeEmail(payload.email);
  const fullName = String(payload.name || '').trim();
  const avatarUrl = payload.picture || null;

  // 1. Tìm xem người dùng đã tồn tại trong DB chưa
  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    // 2. Nếu CHƯA có tài khoản -> Tự động đăng ký mới
    // Vì đăng nhập qua Google nên mặc định tài khoản đã được Verify
    user = await prisma.user.create({
      data: {
        email,
        fullName,
        avatarUrl,
        role: 'USER',
        isVerified: true, // Google đã verify email này rồi
        storageLimit: STORAGE_LIMITS.BASIC,
        // Password có thể để trống hoặc tạo một chuỗi ngẫu nhiên nếu DB bắt buộc string
        password: await hashPassword(crypto.randomBytes(16).toString('hex')), 
      },
    });
  } else {
    // 3. Nếu ĐÃ có tài khoản -> Cập nhật lại avatar mới nhất từ Google (nếu cần)
    // Và đồng thời áp dụng luôn logic kiểm tra nâng dung lượng 5GB giống hàm login truyền thống của bạn
    let targetStorageLimit = user.storageLimit;
    if (Number(targetStorageLimit || 0) < STORAGE_LIMITS.BASIC) {
      targetStorageLimit = STORAGE_LIMITS.BASIC;
    }

    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        avatarUrl: user.avatarUrl || avatarUrl, // Cập nhật nếu cũ đang trống
        storageLimit: targetStorageLimit,
        isVerified: true // Đảm bảo chuyển thành true nếu trước đó họ đăng ký thường chưa verify
      },
    });
  }

  // 4. Sinh JWT Token hệ thống dựa trên hàm generateToken sẵn có của bạn
  const token = generateToken(user);

  // 5. Chuẩn hóa dữ liệu trả về giống cấu trúc hàm login() của bạn
  const userResponse = {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    avatarUrl: user.avatarUrl,
    isVerified: user.isVerified,
    usedStorage: user.usedStorage,
    storageLimit: user.storageLimit,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  return { user: userResponse, token };
};

// 3. ĐỪNG QUÊN EXPORT HÀM MỚI RA BÊN NGOÀI
module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  verifyEmail,
  resendVerificationEmail,
  loginGoogle, // <-- Thêm ở đây
};