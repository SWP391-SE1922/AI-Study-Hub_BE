/**
 * Hàm phân tích và làm sạch (sanitize) tham số truy vấn phân trang
 * @param {object} query - req.query
 * @param {number} defaultLimit - Số lượng dòng mặc định (10)
 * @param {number} maxLimit - Số lượng dòng tối đa (50)
 */
const getPaginationParams = (query, defaultLimit = 10, maxLimit = 50) => {
  let page = parseInt(query.page) || 1;
  let limit = parseInt(query.limit) || defaultLimit;

  // Giới hạn biên (Clamping)
  if (page < 1) page = 1;
  if (limit < 1) limit = 1;
  if (limit > maxLimit) limit = maxLimit; // Cưỡng chế về maxLimit nếu vượt quá

  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
    take: limit,
  };
};

/**
 * Hàm tính toán và format metadata phân trang trả về cho client
 * @param {number} total - Tổng số bản ghi thỏa mãn điều kiện
 * @param {number} page - Trang hiện tại
 * @param {number} limit - Số lượng dòng mỗi trang
 */
const getPaginationMetadata = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages: totalPages === 0 && total === 0 ? 1 : totalPages,
  };
};

module.exports = {
  getPaginationParams,
  getPaginationMetadata,
};
