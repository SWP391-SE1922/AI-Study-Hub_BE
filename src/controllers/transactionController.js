const prisma = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

function buildDateFilter(fromDate, toDate) {
  if (!fromDate && !toDate) return undefined;
  const createdAt = {};
  if (fromDate) {
    const from = new Date(fromDate);
    from.setHours(0, 0, 0, 0);
    createdAt.gte = from;
  }
  if (toDate) {
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);
    createdAt.lte = to;
  }
  return createdAt;
}

/**
 * Get current user's transactions
 */
const getMyTransactions = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      plan: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      invoice: {
        select: {
          id: true,
          invoiceCode: true,
          status: true,
        },
      },
    },
  });

  return sendSuccess(res, 'Lấy lịch sử giao dịch thành công', { transactions }, null, 200);
});

/**
 * Get all transactions (Admin only)
 * Query: search, status, paymentMethod, fromDate, toDate
 */
const getAllTransactions = asyncHandler(async (req, res) => {
  const { search, status, paymentMethod, fromDate, toDate } = req.query;
  const where = {};

  if (status) where.status = String(status).toUpperCase();
  if (paymentMethod) where.paymentMethod = String(paymentMethod).toUpperCase();

  const createdAt = buildDateFilter(fromDate, toDate);
  if (createdAt) where.createdAt = createdAt;

  const q = String(search || '').trim();
  if (q) {
    where.OR = [
      { txnRef: { contains: q } },
      { description: { contains: q } },
      { user: { email: { contains: q } } },
      { user: { fullName: { contains: q } } },
    ];
  }

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
        },
      },
      plan: {
        select: {
          id: true,
          code: true,
          name: true,
          price: true,
        },
      },
      invoice: {
        select: {
          id: true,
          invoiceCode: true,
          status: true,
        },
      },
    },
  });

  const successTxns = transactions.filter((t) => t.status === 'SUCCESS');
  const summary = {
    total: transactions.length,
    success: successTxns.length,
    failed: transactions.filter((t) => t.status === 'FAILED').length,
    pending: transactions.filter((t) => t.status === 'PENDING').length,
    revenue: successTxns.reduce((sum, t) => sum + Number(t.amount || 0), 0),
  };

  return sendSuccess(res, 'Lấy toàn bộ lịch sử giao dịch thành công', { transactions, summary }, null, 200);
});

module.exports = {
  getMyTransactions,
  getAllTransactions,
};
