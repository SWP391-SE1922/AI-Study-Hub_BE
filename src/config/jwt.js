const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Tạo mã JWT Token từ Payload
 * @param {object} payload - Dữ liệu đưa vào token (id, email, role)
 * @returns {string} token
 */
const signToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

/**
 * Giải mã và xác thực mã JWT Token
 * @param {string} token - JWT Token cần giải mã
 * @returns {object} payload giải mã
 */
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  signToken,
  verifyToken,
};
