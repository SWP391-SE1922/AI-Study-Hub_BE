const { sendError } = require('../utils/response');

/**
 * Middleware phân quyền người dùng (Role Authorization)
 * @param {...string} roles - Danh sách các quyền được phép truy cập (ví dụ: 'ADMIN', 'USER')
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Chưa xác thực người dùng', 401);
    }

    if (!roles.includes(req.user.role)) {
      return sendError(res, 'Bạn không có quyền thực hiện hành động này', 403);
    }

    next();
  };
};

module.exports = requireRole;
