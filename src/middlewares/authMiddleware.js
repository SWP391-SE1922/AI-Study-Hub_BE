const { verifyToken } = require('../config/jwt');
const prisma = require('../config/database');
const { sendError } = require('../utils/response');

/**
 * Middleware bắt buộc xác thực tài khoản qua JWT
 */
const authMiddleware = async (req, res, next) => {
  const authHeader = req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'Token không được cung cấp', 401);
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      return sendError(res, 'Token không hợp lệ hoặc người dùng không tồn tại', 401);
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role ? (user.role.name || user.role) : 'GUEST',
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 'Token đã hết hạn', 401);
    }
    return sendError(res, 'Token không hợp lệ', 401);
  }
};

/**
 * Middleware xác thực tùy chọn (Không bắt buộc)
 * Nếu có token hợp lệ thì lưu thông tin vào req.user, nếu không có/hết hạn thì coi như Guest và cho đi qua.
 */
const authMiddlewareOptional = async (req, res, next) => {
  const authHeader = req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // Không có token, bỏ qua xác thực và coi là GUEST
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true },
    });

    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role ? (user.role.name || user.role) : 'GUEST',
      };
    }
  } catch (error) {
    // Nếu token hết hạn hoặc không hợp lệ, tiếp tục xử lý như GUEST (không chặn request)
  }

  next();
};

module.exports = {
  authMiddleware,
  authMiddlewareOptional,
};
