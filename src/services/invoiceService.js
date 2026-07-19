const prisma = require('../config/database');
const planService = require('./planService');

function generateInvoiceCode() {
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const rand = Math.floor(Math.random() * 900 + 100);
  return `INV${stamp}${rand}`;
}

function generateTxnRef() {
  // VNPay txnRef max 100 chars; keep short unique value
  const stamp = Date.now().toString().slice(-10);
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${stamp}${rand}`;
}

const createPendingInvoice = async (userId, planId) => {
  const plan = await planService.getPlanById(planId);
  if (plan.deletedAt || plan.isDeleted) {
    const error = new Error('Gói đăng ký này đã bị xóa.');
    error.statusCode = 400;
    throw error;
  }
  if (!plan.isActive) {
    const error = new Error('Gói đăng ký này hiện không khả dụng.');
    error.statusCode = 400;
    throw error;
  }

  if (Number(plan.price) <= 0) {
    const error = new Error('Gói miễn phí không cần tạo hóa đơn thanh toán.');
    error.statusCode = 400;
    throw error;
  }

  const invoiceCode = generateInvoiceCode();
  const txnRef = generateTxnRef();

  const invoice = await prisma.invoice.create({
    data: {
      invoiceCode,
      userId,
      planId: plan.id,
      amount: Number(plan.price),
      status: 'PENDING',
      paymentMethod: 'VNPAY',
      txnRef,
      description: `Thanh toan goi ${plan.name} - ${invoiceCode}`,
    },
    include: {
      plan: true,
      user: {
        select: { id: true, email: true, fullName: true },
      },
    },
  });

  return {
    ...invoice,
    plan: planService.parseFeatures
      ? { ...invoice.plan, features: planService.parseFeatures(invoice.plan.features) }
      : invoice.plan,
  };
};

const getInvoiceByTxnRef = async (txnRef) => {
  return prisma.invoice.findUnique({
    where: { txnRef },
    include: { plan: true, user: true },
  });
};

const markInvoicePaid = async (invoice, paymentMethod = 'VNPAY') => {
  if (invoice.status === 'PAID') {
    return { invoice, alreadyPaid: true };
  }

  const existingTxn = await prisma.transaction.findFirst({
    where: { txnRef: invoice.txnRef || undefined, status: 'SUCCESS' },
  });
  if (existingTxn) {
    const already = await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: 'PAID', paymentMethod, paidAt: new Date() },
      include: { plan: true },
    });
    return { invoice: already, alreadyPaid: true };
  }

  const updatedInvoice = await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: 'PAID',
      paymentMethod,
      paidAt: new Date(),
    },
    include: { plan: true },
  });

  const user = await planService.applyPlanToUser(invoice.userId, updatedInvoice.plan);

  await prisma.transaction.create({
    data: {
      userId: invoice.userId,
      invoiceId: invoice.id,
      planId: invoice.planId,
      amount: Number(invoice.amount),
      status: 'SUCCESS',
      paymentMethod,
      txnRef: invoice.txnRef,
      description: invoice.description || `Thanh toán gói ${updatedInvoice.plan?.name || ''}`,
    },
  });

  return { invoice: updatedInvoice, user, alreadyPaid: false };
};

const markInvoiceFailed = async (invoice, paymentMethod = 'VNPAY') => {
  if (invoice.status === 'PAID') {
    return invoice;
  }

  const updated = await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: 'FAILED',
      paymentMethod,
    },
  });

  await prisma.transaction.create({
    data: {
      userId: invoice.userId,
      invoiceId: invoice.id,
      planId: invoice.planId,
      amount: Number(invoice.amount),
      status: 'FAILED',
      paymentMethod,
      txnRef: invoice.txnRef,
      description: invoice.description || 'Thanh toán thất bại',
    },
  });

  return updated;
};

const getInvoices = async ({ userId, status, search, fromDate, toDate, paymentMethod, includeDeleted } = {}) => {
  const where = {};
  if (!includeDeleted) where.deletedAt = null;
  if (userId) where.userId = userId;
  if (status) where.status = String(status).toUpperCase();
  if (paymentMethod) where.paymentMethod = String(paymentMethod).toUpperCase();

  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      where.createdAt.gte = from;
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      where.createdAt.lte = to;
    }
  }

  const q = String(search || '').trim();
  if (q) {
    where.OR = [
      { invoiceCode: { contains: q } },
      { txnRef: { contains: q } },
      { description: { contains: q } },
      { user: { email: { contains: q } } },
      { user: { fullName: { contains: q } } },
    ];
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      plan: true,
      user: { select: { id: true, email: true, fullName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return invoices.map((inv) => ({
    ...inv,
    plan: inv.plan
      ? { ...inv.plan, features: planService.parseFeatures(inv.plan.features) }
      : null,
  }));
};

module.exports = {
  createPendingInvoice,
  getInvoiceByTxnRef,
  markInvoicePaid,
  markInvoiceFailed,
  getInvoices,
  generateInvoiceCode,
  generateTxnRef,
};
