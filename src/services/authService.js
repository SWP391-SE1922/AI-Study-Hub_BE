const prisma = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/hashPassword');
const generateToken = require('../utils/generateToken');
const emailService = require('./emailService');
const crypto = require('crypto');
const { STORAGE_LIMITS } = require('../config/constants');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

/**
 * Đăng ký tài khoản mới
 */
const register = async (email, password, fullName, phoneNumber) => {
  email = normalizeEmail(email);
  fullName = String(fullName || '').trim();

  // 1. Kiểm tra email tồn tại
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser && !existingUser.deletedAt) {
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

  // 3b. Email đã xóa mềm → khôi phục tài khoản với mật khẩu mới
  if (existingUser && existingUser.deletedAt) {
    const revived = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        password: hashedPassword,
        fullName,
        phoneNumber,
        deletedAt: null,
        isVerified: false,
        verifyEmailToken: hashedToken,
        verifyEmailExpire: expireTime,
        resetPasswordToken: null,
        resetPasswordExpire: null,
      },
    });
    await emailService.sendVerificationEmail(revived.email, verifyToken).catch(() => null);
    return {
      user: {
        id: revived.id,
        email: revived.email,
        fullName: revived.fullName,
        role: revived.role,
        isVerified: revived.isVerified,
      },
      emailSent: true,
      message: 'Tài khoản đã được khôi phục. Vui lòng xác thực email.',
    };
  }

  // 4. Tạo tài khoản người dùng mặc định (USER, chưa verify)
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      fullName,
      phoneNumber,
      role: 'USER',
      isVerified: false,
      verifyEmailToken: hashedToken,
      verifyEmailExpire: expireTime,
      storageLimit: STORAGE_LIMITS.BASIC,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isVerified: true,
      createdAt: true,
    },
  });

  // 5. Gửi email xác thực nếu cấu hình SMTP đầy đủ.
  if (process.env.SEND_EMAIL !== 'false') {
    try {
      await emailService.sendVerificationEmail(user.email, verifyToken);
    } catch (error) {
      console.warn('⚠️ Không gửi được email xác thực, tài khoản vẫn được tạo:', error.message);
    }
  }

  // 6. Sinh JWT Token
  const token = generateToken(user);

  return { user, token };
};

/**
 * Đăng nhập hệ thống
 */
const login = async (email, password) => {
  email = normalizeEmail(email);

  // 1. Tìm người dùng theo email
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.deletedAt) {
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

  // 3. Nếu tài khoản cũ đang là 100MB thì nâng về mặc định mới 5GB
  let normalizedStorageLimit = user.storageLimit;
  if (Number(normalizedStorageLimit || 0) < STORAGE_LIMITS.BASIC) {
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { storageLimit: STORAGE_LIMITS.BASIC },
    });
    normalizedStorageLimit = updatedUser.storageLimit;
  }

  // 4. Sinh JWT Token
  const token = generateToken(user);

  // 5. Chuẩn hóa thông tin trả về cho FE hiển thị đúng tài khoản đang đăng nhập
  const userResponse = {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    avatarUrl: user.avatarUrl,
    isVerified: user.isVerified,
    usedStorage: user.usedStorage,
    storageLimit: normalizedStorageLimit,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  return { user: userResponse, token };
};

/**
 * Đăng nhập / Đăng ký tự động bằng Google Token
 */
const loginGoogle = async (idToken) => {
  if (!idToken) {
    const error = new Error('Thiếu mã xác thực Google (idToken).');
    error.statusCode = 400;
    throw error;
  }

  let payload;
  try {
    if (idToken.startsWith('ya29.')) {
      // Xử lý Access Token từ frontend custom button
      googleClient.setCredentials({ access_token: idToken });
      const userInfo = await googleClient.request({
        url: 'https://www.googleapis.com/oauth2/v3/userinfo',
      });
      payload = userInfo.data;
    } else {
      // Xử lý ID Token (JWT) thông thường
      const ticket = await googleClient.verifyIdToken({
        idToken: idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    }
  } catch (err) {
    const error = new Error(err.message);
    error.statusCode = 401;
    throw error;
  }

  const email = normalizeEmail(payload.email);
  const fullName = String(payload.name || '').trim();
  const avatarUrl = payload.picture || null;

  // 1. Tìm xem người dùng đã tồn tại trong DB chưa
  let user = await prisma.user.findUnique({ where: { email } });

  if (user && user.deletedAt) {
    const error = new Error('Tài khoản này đã bị xóa. Vui lòng liên hệ admin để khôi phục.');
    error.statusCode = 403;
    throw error;
  }

  if (!user) {
    // 2. Nếu CHƯA có -> Tự động đăng ký mới (Mặc định được verify)
    user = await prisma.user.create({
      data: {
        email,
        fullName,
        avatarUrl,
        role: 'USER',
        isVerified: true, 
        storageLimit: STORAGE_LIMITS.BASIC,
        password: await hashPassword(crypto.randomBytes(16).toString('hex')), 
      },
    });
  } else {
    // 3. Nếu ĐÃ có -> Đồng bộ dung lượng 5GB và cập nhật avatar nếu cần
    let targetStorageLimit = user.storageLimit;
    if (Number(targetStorageLimit || 0) < STORAGE_LIMITS.BASIC) {
      targetStorageLimit = STORAGE_LIMITS.BASIC;
    }

    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        avatarUrl: user.avatarUrl || avatarUrl, 
        storageLimit: targetStorageLimit,
        isVerified: true
      },
    });
  }

  // 4. Sinh JWT Token hệ thống
  const token = generateToken(user);

  // 5. Chuẩn hóa dữ liệu trả về đồng bộ với hàm login truyền thống
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

/**
 * Gửi yêu cầu quên mật khẩu
 */
const forgotPassword = async (email) => {
  email = normalizeEmail(email);
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.deletedAt) {
    return { success: true, emailSent: null, message: 'Nếu email tồn tại, hệ thống sẽ gửi hướng dẫn đặt lại mật khẩu.' };
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  const expireTime = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetPasswordToken: hashedToken,
      resetPasswordExpire: expireTime,
    },
  });

  const mailResult = await emailService.sendResetPassword(user.email, resetToken);

  return {
    success: true,
    emailSent: Boolean(mailResult.emailSent),
    message: mailResult.emailSent
      ? 'Email hướng dẫn đặt lại mật khẩu đã được gửi.'
      : 'Chưa gửi được email thật. Kiểm tra SMTP trong .env hoặc xem link test trong terminal BE.',
  };
};

/**
 * Đặt lại mật khẩu mới qua Token
 */
const resetPassword = async (token, newPassword) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { gt: new Date() },
    },
  });

  if (!user) {
    const error = new Error('Token không hợp lệ hoặc đã hết hạn.');
    error.statusCode = 400;
    throw error;
  }

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
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const error = new Error('Không tìm thấy người dùng.');
    error.statusCode = 404;
    throw error;
  }

  const isMatch = await comparePassword(currentPassword, user.password);
  if (!isMatch) {
    const error = new Error('Mật khẩu hiện tại không đúng.');
    error.statusCode = 400;
    throw error;
  }

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
      verifyEmailExpire: { gt: new Date() },
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
  email = normalizeEmail(email);
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return { success: true, emailSent: null, message: 'Nếu email tồn tại, hệ thống sẽ gửi email xác thực.' };
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

  const mailResult = await emailService.sendVerificationEmail(user.email, verifyToken);

  return {
    success: true,
    emailSent: Boolean(mailResult.emailSent),
    message: mailResult.emailSent
      ? 'Email xác thực đã được gửi.'
      : 'Chưa gửi được email thật. Kiểm tra SMTP trong .env hoặc xem link test trong terminal BE.',
  };
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  verifyEmail,
  resendVerificationEmail,
  loginGoogle,
};