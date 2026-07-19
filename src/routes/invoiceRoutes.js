const express = require('express');
const invoiceService = require('../services/invoiceService');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const { authMiddleware } = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get(
  '/my',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const invoices = await invoiceService.getInvoices({ userId: req.user.id });
    return sendSuccess(res, 'Lấy hóa đơn của bạn thành công', { invoices }, null, 200);
  })
);

router.get(
  '/',
  authMiddleware,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const invoices = await invoiceService.getInvoices({
      status: req.query.status,
      search: req.query.search,
      fromDate: req.query.fromDate,
      toDate: req.query.toDate,
      paymentMethod: req.query.paymentMethod,
    });
    return sendSuccess(res, 'Lấy danh sách hóa đơn thành công', { invoices }, null, 200);
  })
);

module.exports = router;
