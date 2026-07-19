const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const moment = require('moment');
const querystring = require('qs');
const { sortObject } = require('../utils/vnpayUtils');
const { authMiddleware } = require('../middlewares/authMiddleware');
const invoiceService = require('../services/invoiceService');
const planService = require('../services/planService');

function getFrontendResultBase() {
  return (
    process.env.PAYMENT_RESULT_BASE_URL ||
    process.env.FE_PAYMENT_RESULT_PAGE ||
    'http://localhost:5173/payment-status'
  ).replace(/\/$/, '');
}

function buildResultRedirect(suffix, params = {}) {
  const base = `${getFrontendResultBase()}/${suffix}`;
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      qs.set(key, String(value));
    }
  });
  const query = qs.toString();
  return query ? `${base}?${query}` : base;
}

function verifyVnpaySignature(vnp_Params, secureHash) {
  const secretKey = process.env.VNP_HASHSECRET;
  const sorted = sortObject({ ...vnp_Params });
  delete sorted.vnp_SecureHash;
  delete sorted.vnp_SecureHashType;
  const signData = querystring.stringify(sorted, { encode: false });
  const hmac = crypto.createHmac('sha512', secretKey);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
  return secureHash === signed;
}

function buildVnpayUrl({ amount, txnRef, orderInfo, ipAddr, bankCode }) {
  const date = new Date();
  const createDate = moment(date).format('YYYYMMDDHHmmss');
  const tmnCode = process.env.VNP_TMNCODE;
  const secretKey = process.env.VNP_HASHSECRET;
  let vnpUrl = process.env.VNP_URL;
  const returnUrl = process.env.VNP_RETURNURL;

  const vnp_Params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Locale: 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: orderInfo.replace(/#/g, ''),
    vnp_OrderType: 'other',
    vnp_Amount: Math.round(Number(amount) * 100),
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
  };

  if (bankCode && bankCode !== 'string') {
    vnp_Params.vnp_BankCode = bankCode;
  }

  const sortedKeys = Object.keys(vnp_Params).sort();
  let signData = '';
  let urlParams = '';

  for (let i = 0; i < sortedKeys.length; i++) {
    const key = sortedKeys[i];
    const value = vnp_Params[key];
    const encodedKey = encodeURIComponent(key).replace(/%20/g, '+');
    const encodedValue = encodeURIComponent(value).replace(/%20/g, '+');
    signData += `${encodedKey}=${encodedValue}`;
    urlParams += `${encodedKey}=${encodedValue}`;
    if (i < sortedKeys.length - 1) {
      signData += '&';
      urlParams += '&';
    }
  }

  const hmac = crypto.createHmac('sha512', secretKey);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
  vnpUrl += `?${urlParams}&vnp_SecureHash=${signed}`;
  return vnpUrl;
}

/**
 * @swagger
 * /api/vnpay/create_payment_url:
 *   post:
 *     summary: Tạo URL thanh toán VNPAY theo planId (hoặc amount legacy)
 *     tags: [VNPAY]
 */
router.post('/create_payment_url', authMiddleware, async function (req, res) {
  try {
    if (!req.user.isVerified) {
      return res.status(403).json({ message: 'Vui lòng xác thực email trước khi thanh toán.' });
    }

    let ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (ipAddr === '::1' || ipAddr === '127.0.0.1') {
      ipAddr = '127.0.0.1';
    }

    const { planId, bankCode } = req.body;
    let amount = req.body.amount;
    let txnRef;
    let orderInfo;
    let invoice = null;

    if (planId) {
      invoice = await invoiceService.createPendingInvoice(req.user.id, planId);
      amount = invoice.amount;
      txnRef = invoice.txnRef;
      orderInfo = invoice.description;
    } else {
      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ message: 'amount hoặc planId là bắt buộc.' });
      }
      txnRef = moment(new Date()).format('DDHHmmss') + Math.floor(Math.random() * 1000);
      orderInfo = `Thanh toan don hang ${txnRef}`;
    }

    const paymentUrl = buildVnpayUrl({
      amount,
      txnRef,
      orderInfo,
      ipAddr,
      bankCode,
    });

    return res.status(200).json({
      paymentUrl,
      invoice: invoice
        ? {
            id: invoice.id,
            invoiceCode: invoice.invoiceCode,
            amount: invoice.amount,
            planId: invoice.planId,
            txnRef: invoice.txnRef,
            status: invoice.status,
            plan: invoice.plan
              ? {
                  id: invoice.plan.id,
                  code: invoice.plan.code,
                  name: invoice.plan.name,
                  price: invoice.plan.price,
                }
              : null,
          }
        : null,
    });
  } catch (err) {
    console.error('VNPay create_payment_url error:', err);
    return res.status(err.statusCode || 500).json({ message: err.message || 'Không tạo được URL thanh toán.' });
  }
});

/**
 * Xử lý return URL từ VNPay → redirect FE status pages
 */
router.get('/vnpay_return', async function (req, res) {
  try {
    let vnp_Params = { ...req.query };
    const secureHash = vnp_Params.vnp_SecureHash;
    delete vnp_Params.vnp_SecureHash;
    delete vnp_Params.vnp_SecureHashType;

    if (!verifyVnpaySignature(vnp_Params, secureHash)) {
      return res.redirect(
        buildResultRedirect('invalid', {
          code: '97',
          message: 'Chữ ký không hợp lệ',
          method: 'VNPAY',
        })
      );
    }

    const responseCode = vnp_Params.vnp_ResponseCode;
    const amount = parseInt(vnp_Params.vnp_Amount || 0, 10) / 100;
    const txnRef = vnp_Params.vnp_TxnRef || '';
    const orderInfo = vnp_Params.vnp_OrderInfo || '';

    const invoice = await invoiceService.getInvoiceByTxnRef(txnRef);

    if (!invoice) {
      // Legacy payment without invoice
      if (responseCode === '00') {
        return res.redirect(
          buildResultRedirect('success', {
            code: responseCode,
            txnRef,
            amount,
            orderInfo,
            method: 'VNPAY',
          })
        );
      }
      return res.redirect(
        buildResultRedirect('failed', {
          code: responseCode,
          txnRef,
          method: 'VNPAY',
        })
      );
    }

    // Amount mismatch → invalid
    if (Math.round(Number(invoice.amount)) !== Math.round(amount)) {
      return res.redirect(
        buildResultRedirect('invalid', {
          code: '04',
          txnRef,
          message: 'Số tiền không khớp',
          method: 'VNPAY',
        })
      );
    }

    if (responseCode === '00') {
      await invoiceService.markInvoicePaid(invoice, 'VNPAY');
      return res.redirect(
        buildResultRedirect('success', {
          code: responseCode,
          txnRef,
          amount,
          orderInfo,
          method: 'VNPAY',
          plan: invoice.plan?.code || '',
          invoiceCode: invoice.invoiceCode,
        })
      );
    }

    await invoiceService.markInvoiceFailed(invoice, 'VNPAY');
    return res.redirect(
      buildResultRedirect('failed', {
        code: responseCode,
        txnRef,
        method: 'VNPAY',
        invoiceCode: invoice.invoiceCode,
      })
    );
  } catch (err) {
    console.error('VNPay return error:', err);
    return res.redirect(
      buildResultRedirect('error', {
        code: '99',
        message: 'Lỗi xử lý thanh toán',
        method: 'VNPAY',
      })
    );
  }
});

/**
 * IPN server-to-server từ VNPay
 */
router.get('/vnpay_ipn', async function (req, res) {
  try {
    let vnp_Params = { ...req.query };
    const secureHash = vnp_Params.vnp_SecureHash;
    delete vnp_Params.vnp_SecureHash;
    delete vnp_Params.vnp_SecureHashType;

    if (!verifyVnpaySignature(vnp_Params, secureHash)) {
      return res.status(200).json({ RspCode: '97', Message: 'Invalid signature' });
    }

    const orderId = vnp_Params.vnp_TxnRef;
    const rspCode = vnp_Params.vnp_ResponseCode;
    const amount = parseInt(vnp_Params.vnp_Amount || 0, 10) / 100;

    const invoice = await invoiceService.getInvoiceByTxnRef(orderId);
    if (!invoice) {
      return res.status(200).json({ RspCode: '01', Message: 'Order not found' });
    }

    if (Math.round(Number(invoice.amount)) !== Math.round(amount)) {
      return res.status(200).json({ RspCode: '04', Message: 'Invalid amount' });
    }

    if (invoice.status === 'PAID') {
      return res.status(200).json({ RspCode: '02', Message: 'Order already confirmed' });
    }

    if (rspCode === '00') {
      await invoiceService.markInvoicePaid(invoice, 'VNPAY');
    } else {
      await invoiceService.markInvoiceFailed(invoice, 'VNPAY');
    }

    return res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
  } catch (err) {
    console.error('VNPay IPN error:', err);
    return res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
  }
});

/**
 * Đăng ký gói miễn phí (BASIC) không cần VNPay
 */
router.post('/subscribe-free', authMiddleware, async function (req, res) {
  try {
    const { planId, planCode } = req.body;
    let plan;
    if (planId) {
      plan = await planService.getPlanById(planId);
    } else if (planCode) {
      plan = await planService.getPlanByCode(planCode);
    } else {
      plan = await planService.getPlanByCode('BASIC');
    }

    if (Number(plan.price) > 0) {
      return res.status(400).json({ message: 'Gói này cần thanh toán. Vui lòng dùng create_payment_url.' });
    }

    const user = await planService.applyPlanToUser(req.user.id, plan);
    return res.status(200).json({
      success: true,
      message: `Đăng ký gói ${plan.name} thành công!`,
      data: { user, plan },
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ message: err.message || 'Không đăng ký được gói.' });
  }
});

module.exports = router;
