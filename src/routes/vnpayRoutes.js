const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const moment = require('moment');
const querystring = require('qs');
const { sortObject } = require('../utils/vnpayUtils');
const { authMiddleware } = require('../middlewares/authMiddleware');
const prisma = require('../config/database');

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
router.post('/create_payment_url', authMiddleware, async function (req, res, next) {
    try {
        let date = new Date();
        let createDate = moment(date).format('YYYYMMDDHHmmss');
        
        let ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        if (ipAddr === '::1' || ipAddr === '127.0.0.1') {
            ipAddr = '127.0.0.1';
        }

        let tmnCode = process.env.VNPAY_TMN_CODE || process.env.VNP_TMNCODE;
        let secretKey = process.env.VNPAY_HASH_SECRET || process.env.VNP_HASHSECRET;
        let vnpUrl = process.env.VNPAY_URL || process.env.VNP_URL;
        let returnUrl = process.env.VNPAY_RETURN_URL || process.env.VNP_RETURNURL;

        let amount = req.body.amount;
        if (!amount || isNaN(amount)) {
            return res.status(400).json({ message: 'Số tiền không hợp lệ' });
        }

        // Tạo giao dịch PENDING trong Database trước
        const transaction = await prisma.transaction.create({
            data: {
                userId: req.user.id,
                amount: parseFloat(amount),
                status: 'PENDING',
                paymentMethod: 'VNPAY',
                description: `Thanh toán nâng cấp dung lượng Pro (Giao dịch VNPay)`
            }
        });

        let orderId = transaction.id; // Sử dụng UUID của giao dịch làm vnp_TxnRef
        
        let vnp_Params = {};
        vnp_Params['vnp_Version'] = '2.1.0';
        vnp_Params['vnp_Command'] = 'pay';
        vnp_Params['vnp_TmnCode'] = tmnCode;
        vnp_Params['vnp_Locale'] = 'vn';
        vnp_Params['vnp_CurrCode'] = 'VND';
        vnp_Params['vnp_TxnRef'] = orderId;
        vnp_Params['vnp_OrderInfo'] = 'Thanh toan cho don hang ' + orderId;
        vnp_Params['vnp_OrderType'] = 'other';
        vnp_Params['vnp_Amount'] = amount * 100;
        vnp_Params['vnp_ReturnUrl'] = returnUrl;
        vnp_Params['vnp_IpAddr'] = ipAddr;
        vnp_Params['vnp_CreateDate'] = createDate;

        let bankCode = req.body.bankCode;
        if (bankCode && bankCode !== 'string') {
            vnp_Params['vnp_BankCode'] = bankCode;
        }

        let sortedKeys = Object.keys(vnp_Params).sort();
        
        let signData = '';
        let urlParams = '';
        
        for (let i = 0; i < sortedKeys.length; i++) {
            let key = sortedKeys[i];
            let value = vnp_Params[key];
            
            let encodedKey = encodeURIComponent(key).replace(/%20/g, "+");
            let encodedValue = encodeURIComponent(value).replace(/%20/g, "+");
            
            signData += encodedKey + '=' + encodedValue;
            urlParams += encodedKey + '=' + encodedValue;
            
            if (i < sortedKeys.length - 1) {
                signData += '&';
                urlParams += '&';
            }
        }

        let hmac = crypto.createHmac("sha512", secretKey);
        let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex"); 
        
        vnpUrl += '?' + urlParams + '&vnp_SecureHash=' + signed;

        res.status(200).json({ paymentUrl: vnpUrl });
    } catch (error) {
        next(error);
    }
});

// Hàm dùng chung cập nhật kết quả thanh toán & cộng dung lượng cho User
async function completePayment(txnId, responseCode, vnpayAmount) {
    try {
        const transaction = await prisma.transaction.findUnique({
            where: { id: txnId },
            include: { user: true }
        });

        if (!transaction) {
            console.error(`Giao dịch không tồn tại: ${txnId}`);
            return { success: false, message: 'Transaction not found' };
        }

        if (transaction.status !== 'PENDING') {
            console.log(`Giao dịch ${txnId} đã được xử lý trước đó với trạng thái: ${transaction.status}`);
            return { success: true, status: transaction.status, user: transaction.user };
        }

        if (responseCode === '00') {
            // Xác thực số tiền
            if (Math.abs(transaction.amount - vnpayAmount) > 1) {
                console.error(`Số tiền không khớp cho giao dịch ${txnId}: DB=${transaction.amount}, VNPAY=${vnpayAmount}`);
                await prisma.transaction.update({
                    where: { id: txnId },
                    data: { status: 'FAILED', description: transaction.description + ' (Thất bại: Số tiền không khớp)' }
                });
                return { success: false, message: 'Amount mismatch' };
            }

            // Tính dung lượng tương ứng dựa trên số tiền
            // Mặc định 5GB = 5368709120 bytes
            // Pro 10 GB (29k) -> 10737418240 bytes (10GB)
            // Pro 50 GB (79k) -> 53687091200 bytes (50GB)
            // Pro 200 GB (199k) -> 214748364800 bytes (200GB)
            let newStorageLimit = transaction.user.storageLimit;
            if (transaction.amount === 29000) {
                newStorageLimit = 10 * 1024 * 1024 * 1024;
            } else if (transaction.amount === 79000) {
                newStorageLimit = 50 * 1024 * 1024 * 1024;
            } else if (transaction.amount === 199000) {
                newStorageLimit = 200 * 1024 * 1024 * 1024;
            } else {
                newStorageLimit = Math.max(transaction.user.storageLimit, (transaction.amount / 29000) * 10 * 1024 * 1024 * 1024);
            }

            // Cập nhật giao dịch thành SUCCESS và cập nhật dung lượng user
            const [updatedTxn, updatedUser] = await prisma.$transaction([
                prisma.transaction.update({
                    where: { id: txnId },
                    data: { status: 'SUCCESS' }
                }),
                prisma.user.update({
                    where: { id: transaction.userId },
                    data: { storageLimit: newStorageLimit }
                })
            ]);

            console.log(`Giao dịch thành công! Đã nâng dung lượng cho user ${transaction.userId} lên ${newStorageLimit} bytes`);
            return { success: true, status: 'SUCCESS', user: updatedUser };
        } else {
            // Giao dịch thất bại
            await prisma.transaction.update({
                where: { id: txnId },
                data: { status: 'FAILED' }
            });
            return { success: true, status: 'FAILED' };
        }
    } catch (err) {
        console.error('Lỗi khi hoàn thành giao dịch:', err);
        return { success: false, error: err.message };
    }
}

// Xử lý return (GET) - cả hai tuyến /vnpay_return và /return
const handleVnpayReturn = async function (req, res, next) {
    try {
        let vnp_Params = req.query;
        let secureHash = vnp_Params['vnp_SecureHash'];

        delete vnp_Params['vnp_SecureHash'];
        delete vnp_Params['vnp_SecureHashType'];

        vnp_Params = sortObject(vnp_Params);

        let secretKey = process.env.VNPAY_HASH_SECRET || process.env.VNP_HASHSECRET;
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

            await completePayment(txnRef, responseCode, amount);

            if (responseCode === '00') {
                const redirectUrl = `${successUrl}?code=${responseCode}&txnRef=${txnRef}&amount=${amount}&orderInfo=${encodeURIComponent(orderInfo)}&method=VNPAY`;
                return res.redirect(redirectUrl);
            } else {
                const redirectUrl = `${failedUrl}?code=${responseCode}&txnRef=${txnRef}&method=VNPAY`;
                return res.redirect(redirectUrl);
            }
        } else {
            const redirectUrl = `${failedUrl}?code=97&message=${encodeURIComponent('Chữ ký không hợp lệ')}&method=VNPAY`;
            return res.redirect(redirectUrl);
        }
    } catch (error) {
        next(error);
    }
};

router.get('/vnpay_return', handleVnpayReturn);
router.get('/return', handleVnpayReturn);

// Xử lý IPN (GET) - cả hai tuyến /vnpay_ipn và /ipn
const handleVnpayIpn = async function (req, res, next) {
    try {
        let vnp_Params = req.query;
        let secureHash = vnp_Params['vnp_SecureHash'];

        delete vnp_Params['vnp_SecureHash'];
        delete vnp_Params['vnp_SecureHashType'];

        vnp_Params = sortObject(vnp_Params);
        let secretKey = process.env.VNPAY_HASH_SECRET || process.env.VNP_HASHSECRET;
        let signData = querystring.stringify(vnp_Params, { encode: false });
        let hmac = crypto.createHmac("sha512", secretKey);
        let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

        if (secureHash === signed) {
            let txnRef = vnp_Params['vnp_TxnRef'];
            let rspCode = vnp_Params['vnp_ResponseCode'];
            let amount = parseInt(vnp_Params['vnp_Amount'] || 0) / 100;

            const result = await completePayment(txnRef, rspCode, amount);

            if (result.success) {
                return res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
            } else {
                if (result.message === 'Transaction not found') {
                    return res.status(200).json({ RspCode: '01', Message: 'Order not found' });
                }
                if (result.message === 'Amount mismatch') {
                    return res.status(200).json({ RspCode: '04', Message: 'Invalid amount' });
                }
                return res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
            }
        } else {
            return res.status(200).json({ RspCode: '97', Message: 'Invalid signature' });
        }
    } catch (error) {
        next(error);
    }
};

router.get('/vnpay_ipn', handleVnpayIpn);
router.get('/ipn', handleVnpayIpn);

module.exports = router;
