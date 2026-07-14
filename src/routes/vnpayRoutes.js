const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const moment = require('moment');
const querystring = require('qs');
const { sortObject } = require('../utils/vnpayUtils');
const { authMiddleware } = require('../middlewares/authMiddleware');
const {
    PAYMENT_METHOD,
    normalizeAmount,
    createPendingTransaction,
    markTransactionSuccess,
    markTransactionFailed
} = require('../services/paymentTransactionService');

/**
 * @swagger
 * tags:
 *   name: VNPAY
 *   description: API thanh toán VNPAY
 */

/**
 * @swagger
 * /api/vnpay/create_payment_url:
 *   post:
 *     summary: 1. API TẠO URL THANH TOÁN (Gửi sang VNPAY)
 *     tags: [VNPAY]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Số tiền cần thanh toán
 *                 example: 50000
 *               bankCode:
 *                 type: string
 *                 description: Mã ngân hàng (tuỳ chọn)
 *               language:
 *                 type: string
 *                 description: Ngôn ngữ (vn hoặc en)
 *                 example: vn
 *     responses:
 *       200:
 *         description: Trả về URL thanh toán
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 paymentUrl:
 *                   type: string
 *       401:
 *         description: Unauthorized - Không có token hoặc token không hợp lệ
 */
router.post('/create_payment_url', authMiddleware, async function (req, res) {
    let date = new Date();
    // Định dạng thời gian chuẩn yyyyMMddHHmmss
    let createDate = moment(date).format('YYYYMMDDHHmmss');
    
    // Fix triệt để lỗi IPAddr ::1 bằng cách ép về IPv4 local chuẩn
    let ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (ipAddr === '::1' || ipAddr === '127.0.0.1') {
        ipAddr = '127.0.0.1';
    }

    let tmnCode = process.env.VNP_TMNCODE;
    let secretKey = process.env.VNP_HASHSECRET;
    let vnpUrl = process.env.VNP_URL;
    let returnUrl = process.env.VNP_RETURNURL;

    let orderId = `${moment(date).format('YYYYMMDDHHmmss')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    let amount = normalizeAmount(req.body.amount);
    if (!amount || !Number.isInteger(amount)) {
        return res.status(400).json({ message: 'Số tiền phải là số nguyên dương' });
    }
    
    let vnp_Params = {};
    vnp_Params['vnp_Version'] = '2.1.0';
    vnp_Params['vnp_Command'] = 'pay';
    vnp_Params['vnp_TmnCode'] = tmnCode;
    vnp_Params['vnp_Locale'] = 'vn';
    vnp_Params['vnp_CurrCode'] = 'VND';
    vnp_Params['vnp_TxnRef'] = orderId;
    // Bỏ ký tự thăng # đi để chuỗi text thuần túy không bị lỗi mã hóa ký tự đặc biệt
    vnp_Params['vnp_OrderInfo'] = 'Thanh toan cho don hang ' + orderId;
    vnp_Params['vnp_OrderType'] = 'other';
    vnp_Params['vnp_Amount'] = amount * 100;
    vnp_Params['vnp_ReturnUrl'] = returnUrl;
    vnp_Params['vnp_IpAddr'] = ipAddr;
    vnp_Params['vnp_CreateDate'] = createDate;

    // Lấy bankCode nếu có
    let bankCode = req.body.bankCode;
    if (bankCode && bankCode !== 'string') {
        vnp_Params['vnp_BankCode'] = bankCode;
    }

    // 1. Sắp xếp các key theo thứ tự bảng chữ cái ABC
    let sortedKeys = Object.keys(vnp_Params).sort();
    
    // 2. Tự lắp ráp chuỗi thô (Mã hóa thủ công đồng bộ cho cả chuỗi băm lẫn URL gửi đi)
    let signData = '';
    let urlParams = '';
    
    for (let i = 0; i < sortedKeys.length; i++) {
        let key = sortedKeys[i];
        let value = vnp_Params[key];
        
        // Tiến hành encode chuẩn: Khoảng trắng -> dấu +, các ký tự khác theo đúng chuẩn encodeURIComponent
        let encodedKey = encodeURIComponent(key).replace(/%20/g, "+");
        let encodedValue = encodeURIComponent(value).replace(/%20/g, "+");
        
        signData += encodedKey + '=' + encodedValue;
        urlParams += encodedKey + '=' + encodedValue;
        
        if (i < sortedKeys.length - 1) {
            signData += '&';
            urlParams += '&';
        }
    }

    // 3. Tiến hành băm mã SHA512 bằng SecretKey của bạn
    let hmac = crypto.createHmac("sha512", secretKey);
    let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex"); 
    
    // 4. Cộng chuỗi băm hoàn chỉnh vào cuối URL chính
    vnpUrl += '?' + urlParams + '&vnp_SecureHash=' + signed;

    await createPendingTransaction({
        userId: req.user.id,
        amount,
        paymentMethod: PAYMENT_METHOD.VNPAY,
        orderCode: orderId,
        description: vnp_Params['vnp_OrderInfo']
    });

    res.status(200).json({ paymentUrl: vnpUrl, orderCode: orderId });
});

/**
 * @swagger
 * /api/vnpay/vnpay_return:
 *   get:
 *     summary: 2. API XỬ LÝ RETURN URL (Hiển thị kết quả client - Phương thức GET)
 *     description: Trình duyệt của Client tự động nhảy về đây kèm query params từ VNPAY sau khi thanh toán xong
 *     tags: [VNPAY]
 *     responses:
 *       200:
 *         description: Kết quả thanh toán
 */
router.get('/vnpay_return', async function (req, res) {
    let vnp_Params = req.query;

    let secureHash = vnp_Params['vnp_SecureHash'];

    // Xóa thuộc tính hash khỏi object trước khi băm đối chiếu
    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    // Sắp xếp lại để kiểm tra tính toàn vẹn
    vnp_Params = sortObject(vnp_Params);

    let secretKey = process.env.VNP_HASHSECRET;
    let signData = querystring.stringify(vnp_Params, { encode: false });
    let hmac = crypto.createHmac("sha512", secretKey);
    let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

    const successUrl = process.env.PAYMENT_SUCCESS_URL || 'http://localhost:5173/payment-status/success';
    const failedUrl = process.env.PAYMENT_FAILED_URL || 'http://localhost:5173/payment-status/failed';

    if (secureHash === signed) {
        const responseCode = vnp_Params['vnp_ResponseCode'];
        const amount = parseInt(vnp_Params['vnp_Amount'] || 0) / 100;
        const txnRef = vnp_Params['vnp_TxnRef'] || '';
        const orderInfo = vnp_Params['vnp_OrderInfo'] || '';

        const transactionStatus = vnp_Params['vnp_TransactionStatus'];

        if (responseCode === '00' && transactionStatus === '00') {
            await markTransactionSuccess({
                paymentMethod: PAYMENT_METHOD.VNPAY,
                orderCode: txnRef,
                amount,
                providerTransactionId: vnp_Params['vnp_TransactionNo'],
                description: orderInfo
            });
            // Thanh toán thành công → redirect về trang success kèm thông tin
            const redirectUrl = `${successUrl}?code=${responseCode}&txnRef=${txnRef}&amount=${amount}&orderInfo=${encodeURIComponent(orderInfo)}&method=VNPAY`;
            return res.redirect(redirectUrl);
        } else {
            await markTransactionFailed({ paymentMethod: PAYMENT_METHOD.VNPAY, orderCode: txnRef });
            // Thanh toán thất bại
            const redirectUrl = `${failedUrl}?code=${responseCode}&txnRef=${txnRef}&method=VNPAY`;
            return res.redirect(redirectUrl);
        }
    } else {
        // Chữ ký không hợp lệ
        const redirectUrl = `${failedUrl}?code=97&message=${encodeURIComponent('Chữ ký không hợp lệ')}&method=VNPAY`;
        return res.redirect(redirectUrl);
    }
});

/**
 * @swagger
 * /api/vnpay/vnpay_ipn:
 *   get:
 *     summary: 3. API XỬ LÝ IPN URL (Cập nhật Database ngầm - Phương thức GET)
 *     description: VNPAY gọi Server-to-Server ngầm độc lập về để cập nhật trạng thái hóa đơn
 *     tags: [VNPAY]
 *     responses:
 *       200:
 *         description: Trạng thái cập nhật giao dịch
 */
router.get('/vnpay_ipn', async function (req, res) {
    let vnp_Params = req.query;
    let secureHash = vnp_Params['vnp_SecureHash'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = sortObject(vnp_Params);
    let secretKey = process.env.VNP_HASHSECRET;
    let signData = querystring.stringify(vnp_Params, { encode: false });
    let hmac = crypto.createHmac("sha512", secretKey);
    let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

    if (secureHash === signed) {
        const orderId = vnp_Params['vnp_TxnRef'];
        const rspCode = vnp_Params['vnp_ResponseCode'];
        const transactionStatus = vnp_Params['vnp_TransactionStatus'];

        if (rspCode === '00' && transactionStatus === '00') {
            const result = await markTransactionSuccess({
                paymentMethod: PAYMENT_METHOD.VNPAY,
                orderCode: orderId,
                amount: parseInt(vnp_Params['vnp_Amount'] || 0, 10) / 100,
                providerTransactionId: vnp_Params['vnp_TransactionNo'],
                description: vnp_Params['vnp_OrderInfo']
            });

            if (result.count === 0) {
                return res.status(200).json({ RspCode: '02', Message: 'Order not found or already confirmed' });
            }
        } else {
            await markTransactionFailed({ paymentMethod: PAYMENT_METHOD.VNPAY, orderCode: orderId });
        }

        return res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
    } else {
        res.status(200).json({ RspCode: '97', Message: 'Invalid signature' });
    }
});

module.exports = router;
