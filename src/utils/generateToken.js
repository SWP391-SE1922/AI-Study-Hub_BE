const { signToken } = require('../config/jwt');

/**
 * Hàm sinh JWT token cho User
 * @param {object} user - User object { id, email, role }
 * @returns {string} jwt token
 */
const generateToken = (user) => {
  return signToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });
};

module.exports = generateToken;
