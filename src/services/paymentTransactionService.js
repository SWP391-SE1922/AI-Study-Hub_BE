const prisma = require('../config/database');

const PAYMENT_STATUS = Object.freeze({
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
});

const PAYMENT_METHOD = Object.freeze({
  VNPAY: 'VNPAY',
  MOMO: 'MOMO',
  PAYOS: 'PAYOS',
});

const normalizeAmount = (amount) => {
  const value = Number(amount);
  return Number.isFinite(value) && value > 0 ? value : null;
};

const createPendingTransaction = ({ userId, amount, paymentMethod, orderCode, description }) => {
  return prisma.transaction.create({
    data: {
      userId,
      amount,
      status: PAYMENT_STATUS.PENDING,
      paymentMethod,
      orderCode: String(orderCode),
      description,
    },
  });
};

const markTransactionSuccess = async ({ paymentMethod, orderCode, amount, providerTransactionId, description }) => {
  const data = {
    status: PAYMENT_STATUS.SUCCESS,
    paidAt: new Date(),
  };

  if (providerTransactionId !== undefined && providerTransactionId !== null) {
    data.providerTransactionId = String(providerTransactionId);
  }
  if (description) data.description = description;

  const where = {
    paymentMethod,
    orderCode: String(orderCode),
    status: { not: PAYMENT_STATUS.SUCCESS },
  };
  if (amount !== undefined && amount !== null) where.amount = Number(amount);

  return prisma.transaction.updateMany({
    where,
    data,
  });
};

const markTransactionFailed = ({ paymentMethod, orderCode }) => {
  return prisma.transaction.updateMany({
    where: {
      paymentMethod,
      orderCode: String(orderCode),
      status: PAYMENT_STATUS.PENDING,
    },
    data: { status: PAYMENT_STATUS.FAILED },
  });
};

module.exports = {
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  normalizeAmount,
  createPendingTransaction,
  markTransactionSuccess,
  markTransactionFailed,
};
