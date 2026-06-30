const prisma = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/hashPassword');
const generateToken = require('../utils/generateToken');
const emailService = require('./emailService');
const crypto = require('crypto');
const { STORAGE_LIMITS } = require('../config/constants');

/**
 * Đăng ký tài khoản mới
 */
const register = async (email, password, fullName, phoneNumber, major) => {
  // 1. Kiểm tra email tồn tại
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const error = new Error('Email đã được đăng ký trong hệ thống.');
    error.statusCode = 409;
    throw error;
  }

  // 2. Hash mật khẩu
  const hashedPassword = await hashPassword(password);

  // 3. Tạo token xác thực
  const verifyToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(verifyToken).digest('hex');
  const expireTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 giờ

  // 3.5 Tìm Role USER
  const defaultRole = await prisma.role.findUnique({ where: { name: 'USER' } });
  if (!defaultRole) {
    throw new Error('Hệ thống chưa được cấu hình Role. Vui lòng liên hệ quản trị viên.');
  }

  // 4. Tạo tài khoản người dùng mặc định (USER, chưa verify)
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      fullName,
      phoneNumber,
      major: major || null,
      roleId: defaultRole.id,
      isVerified: false,
      verifyEmailToken: hashedToken,
      verifyEmailExpire: expireTime,
      storageLimit: STORAGE_LIMITS.BASIC,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      phoneNumber: true,
      role: true,
      isVerified: true,
      createdAt: true,
    },
  });

  // 5. Gửi email xác thực
  await emailService.sendVerificationEmail(user.email, verifyToken);

  // 5. Sinh JWT Token
  const token = generateToken(user);

  return { user, token };
};

/**
 * Đăng nhập hệ thống
 */
const login = async (email, password) => {
  // 1. Tìm người dùng theo email
  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true },
  });
  if (!user) {
    const error = new Error('Email hoặc mật khẩu không đúng');
    error.statusCode = 401;
    throw error;
  }

  // 2. So sánh mật khẩu
  const isMatch = await comparePassword(password, user.password);
  if (!isMatch) {
    const error = new Error('Email hoặc mật khẩu không đúng');
    error.statusCode = 401;
    throw error;
  }

  // 3. Sinh JWT Token
  const token = generateToken(user);

  // 4. Chuẩn hóa thông tin trả về
  const userResponse = {
    id: user.id,
    // email: user.email,
    // fullName: user.fullName,
    role: user.role && user.role.name ? user.role.name : 'GUEST',
    // avatarUrl: user.avatarUrl,
    // isVerified: user.isVerified,
  };

  return { user: userResponse, token };
};

/**
 * Gửi yêu cầu quên mật khẩu
 */
const forgotPassword = async (email) => {
  const user = await prisma.user.findUnique({ where: { email } });

  // Tránh Email Enumeration Attack: Luôn báo thành công cho client
  if (!user) {
    return true;
  }

  // Tạo token ngẫu nhiên thuần (Raw Token)
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Hash token để lưu trữ an toàn trong DB (đề phòng lộ dữ liệu DB)
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  const expireTime = new Date(Date.now() + 10 * 60 * 1000); // 10 phút hiệu lực

  // Lưu thông tin Token vào User
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetPasswordToken: hashedToken,
      resetPasswordExpire: expireTime,
    },
  });

  // Gửi link reset (Console log)
  await emailService.sendResetPassword(user.email, resetToken);

  return true;
};

/**
 * Đặt lại mật khẩu mới qua Token
 */
const resetPassword = async (token, newPassword) => {
  // Hash token nhận được từ request để so khớp với DB
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Tìm người dùng có token hợp lệ và chưa hết hạn
  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: hashedToken,
      resetPasswordExpire: {
        gt: new Date(), // Phải lớn hơn thời gian hiện tại
      },
    },
  });

  if (!user) {
    const error = new Error('Token không hợp lệ hoặc đã hết hạn.');
    error.statusCode = 400;
    throw error;
  }

  // Hash mật khẩu mới và cập nhật
  const hashedPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpire: null,
    },
  });

  return true;
};

/**
 * Đổi mật khẩu
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  // Lấy người dùng kèm mật khẩu
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const error = new Error('Không tìm thấy người dùng.');
    error.statusCode = 404;
    throw error;
  }

  // Verify mật khẩu hiện tại
  const isMatch = await comparePassword(currentPassword, user.password);
  if (!isMatch) {
    const error = new Error('Mật khẩu hiện tại không đúng.');
    error.statusCode = 400;
    throw error;
  }

  // Hash mật khẩu mới và lưu
  const hashedPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  return true;
};

/**
 * Xác thực email
 */
const verifyEmail = async (token) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await prisma.user.findFirst({
    where: {
      verifyEmailToken: hashedToken,
      verifyEmailExpire: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    const error = new Error('Token không hợp lệ hoặc đã hết hạn.');
    error.statusCode = 400;
    throw error;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isVerified: true,
      verifyEmailToken: null,
      verifyEmailExpire: null,
    },
  });

  return true;
};

/**
 * Gửi lại email xác thực
 */
const resendVerificationEmail = async (email) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return true; // Tránh Email Enumeration
  }

  if (user.isVerified) {
    const error = new Error('Email đã được xác thực trước đó.');
    error.statusCode = 400;
    throw error;
  }

  const verifyToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(verifyToken).digest('hex');
  const expireTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 giờ

  await prisma.user.update({
    where: { id: user.id },
    data: {
      verifyEmailToken: hashedToken,
      verifyEmailExpire: expireTime,
    },
  });

  await emailService.sendVerificationEmail(user.email, verifyToken);

  return true;
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  verifyEmail,
  resendVerificationEmail,
};
