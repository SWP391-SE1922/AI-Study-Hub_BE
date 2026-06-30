const { sendError } = require('../utils/response');

/**
 * Middleware xác thực dữ liệu đầu vào sử dụng Joi
 * @param {object} schema - Joi Schema cần kiểm tra
 * @param {string} source - Nguồn dữ liệu ('body' | 'query' | 'params', mặc định 'body')
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false, // Thu thập toàn bộ lỗi thay vì dừng lại ở lỗi đầu tiên
      stripUnknown: true, // Loại bỏ các trường thừa không nằm trong schema
    });

    if (error) {
      const formattedErrors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, ''),
      }));

      return sendError(res, 'Dữ liệu đầu vào không hợp lệ', 400, formattedErrors);
    }

    // Gán lại dữ liệu đã được sanitize/validate vào request
    req[source] = value;
    next();
  };
};

module.exports = validate;
