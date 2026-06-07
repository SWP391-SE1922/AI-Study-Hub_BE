/**
 * Wrapper bắt lỗi cho các hàm async trong Controller để truyền sang Global Error Handler.
 * Tránh việc phải viết lặp lại try-catch trong các Controller.
 * @param {Function} fn - Hàm async controller
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
