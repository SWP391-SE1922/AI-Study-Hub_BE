const prisma = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

/**
 * Get current user's transactions
 */
const getMyTransactions = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return sendSuccess(res, 'Lấy lịch sử giao dịch thành công', { transactions }, null, 200);
});

/**
 * Get all transactions (Admin only)
 */
const getAllTransactions = asyncHandler(async (req, res) => {
  const transactions = await prisma.transaction.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
        }
      }
    }
  });

  return sendSuccess(res, 'Lấy toàn bộ lịch sử giao dịch thành công', { transactions }, null, 200);
});

module.exports = {
  getMyTransactions,
  getAllTransactions,
};
