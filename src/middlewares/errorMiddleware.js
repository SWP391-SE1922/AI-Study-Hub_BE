const { sendError } = require('../utils/response');
const { Prisma } = require('@prisma/client');
const multer = require('multer');

/**
 * Global Error Handler Middleware
 */
const errorMiddleware = (err, req, res, next) => {
  // Ghi log chi tiết lỗi tại server
  console.error('💥 LỖI HỆ THỐNG:', err);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Đã xảy ra lỗi hệ thống';
  let errors = err.errors || null;

  // 1. Xử lý lỗi từ Prisma (Database ORM)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': // Trùng trường unique (Unique constraint fail)
        statusCode = 409;
        const field = err.meta?.target || 'dữ liệu';
        message = `Giá trị trường này đã tồn tại trong hệ thống.`;
        break;
      case 'P2025': // Không tìm thấy bản ghi (Record not found)
        statusCode = 404;
        message = 'Không tìm thấy tài nguyên yêu cầu trong cơ sở dữ liệu.';
        break;
      default:
        statusCode = 400;
        message = `Lỗi truy vấn cơ sở dữ liệu (${err.code}).`;
        break;
    }
  }

  // 2. Xử lý lỗi từ Multer (Upload File)
  if (err instanceof multer.MulterError) {
    statusCode = 400;
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'Dung lượng file tải lên vượt quá giới hạn cho phép (Tối đa 10MB).';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Trường tải lên file không hợp lệ hoặc số lượng file vượt quá giới hạn.';
        break;
      default:
        message = `Lỗi tải lên tệp tin: ${err.message}`;
        break;
    }
  }

  // Xử lý lỗi lọc file tùy chỉnh từ Multer
  if (err.name === 'MulterCustomError') {
    statusCode = 400;
    message = err.message;
  }

  // 3. Xử lý lỗi xác thực Token JWT
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token xác thực không hợp lệ.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token xác thực đã hết hạn.';
  }

  // 4. Phản hồi lỗi cho khách hàng (Ẩn chi tiết lỗi / stack trace ở môi trường Production)
  const isProduction = process.env.NODE_ENV === 'production';
  const responseMessage = isProduction && statusCode === 500 ? 'Lỗi hệ thống nghiêm trọng' : message;

  return sendError(res, responseMessage, statusCode, errors);
};

module.exports = errorMiddleware;
