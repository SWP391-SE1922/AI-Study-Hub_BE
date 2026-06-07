const bcrypt = require('bcrypt');

/**
 * Mã hóa mật khẩu
 * @param {string} password - Mật khẩu thuần
 * @returns {Promise<string>} Mật khẩu đã hash
 */
const hashPassword = async (password) => {
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
  return bcrypt.hash(password, saltRounds);
};

/**
 * So sánh mật khẩu
 * @param {string} password - Mật khẩu thuần
 * @param {string} hashedPassword - Mật khẩu đã hash
 * @returns {Promise<boolean>} Đúng/Sai
 */
const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

module.exports = {
  hashPassword,
  comparePassword,
};
