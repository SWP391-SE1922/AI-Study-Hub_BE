/**
 * Gửi phản hồi thành công (Success Response)
 * @param {object} res - Express Response object
 * @param {string} message - Mô tả kết quả
 * @param {object|array|null} data - Dữ liệu trả về (null nếu không có)
 * @param {object|null} pagination - Thông tin phân trang (nếu là dạng danh sách)
 * @param {number} statusCode - HTTP status code (mặc định 200)
 */
const sendSuccess = (res, message, data = null, pagination = null, statusCode = 200) => {
  const response = {
    success: true,
    message,
    data,
  };

  if (pagination) {
    response.pagination = pagination;
  }

  return res.status(statusCode).json(response);
};

/**
 * Gửi phản hồi lỗi (Error Response)
 * @param {object} res - Express Response object
 * @param {string} message - Mô tả lỗi
 * @param {number} statusCode - HTTP status code (mặc định 400)
 * @param {array|null} errors - Mảng chi tiết lỗi (nếu có, ví dụ: validation fail)
 */
const sendError = (res, message, statusCode = 400, errors = null) => {
  const response = {
    success: false,
    message,
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

module.exports = {
  sendSuccess,
  sendError,
};
