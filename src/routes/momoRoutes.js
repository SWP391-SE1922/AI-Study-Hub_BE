const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { authMiddleware } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: MOMO
 *   description: API thanh toán MoMo
 */

/**
 * @swagger
 * /api/momo/create_payment_url:
 *   post:
 *     summary: 1. API TẠO URL THANH TOÁN MOMO
 *     tags: [MOMO]
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
 *     responses:
 *       200:
 *         description: Trả về URL thanh toán MoMo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 paymentUrl:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Lỗi máy chủ
 */
router.post('/create_payment_url', authMiddleware, async function (req, res) {
    try {
        const partnerCode = process.env.MOMO_PARTNER_CODE;
        const accessKey = process.env.MOMO_ACCESS_KEY;
        const secretKey = process.env.MOMO_SECRET_KEY;
        const apiUrl = process.env.MOMO_API_URL;
        const redirectUrl = process.env.MOMO_RETURN_URL;
        const ipnUrl = process.env.MOMO_NOTIFY_URL;

        const amount = req.body.amount;
        const orderId = partnerCode + new Date().getTime();
        const requestId = orderId;
        const orderInfo = "Thanh toan don hang " + orderId;
        const requestType = "captureWallet";
        const extraData = ""; // pass empty string

        // Build raw signature string
        const rawSignature = "accessKey=" + accessKey + "&amount=" + amount + "&extraData=" + extraData + "&ipnUrl=" + ipnUrl + "&orderId=" + orderId + "&orderInfo=" + orderInfo + "&partnerCode=" + partnerCode + "&redirectUrl=" + redirectUrl + "&requestId=" + requestId + "&requestType=" + requestType;
        
        // HMAC SHA256 signature
        const signature = crypto.createHmac('sha256', secretKey)
            .update(rawSignature)
            .digest('hex');

        // Build request body
        const requestBody = JSON.stringify({
            partnerCode: partnerCode,
            accessKey: accessKey,
            requestId: requestId,
            amount: amount,
            orderId: orderId,
            orderInfo: orderInfo,
            redirectUrl: redirectUrl,
            ipnUrl: ipnUrl,
            extraData: extraData,
            requestType: requestType,
            signature: signature,
            lang: 'vi'
        });

        // Use native fetch to call MoMo API
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(requestBody)
            },
            body: requestBody
        });

        const data = await response.json();

        if (data.resultCode === 0) {
            res.status(200).json({ paymentUrl: data.payUrl });
        } else {
            res.status(500).json({ message: "Lỗi tạo thanh toán MoMo", data: data });
        }
    } catch (error) {
        console.error("MoMo Create Payment Error:", error);
        res.status(500).json({ message: "Lỗi hệ thống khi tạo thanh toán MoMo", error: error.message });
    }
});

/**
 * @swagger
 * /api/momo/momo_return:
 *   get:
 *     summary: 2. API XỬ LÝ RETURN URL MOMO (Redirect Frontend)
 *     description: Trình duyệt của Client tự động nhảy về đây kèm query params từ MoMo sau khi thanh toán
 *     tags: [MOMO]
 *     responses:
 *       200:
 *         description: Kết quả thanh toán
 */
router.get('/momo_return', function (req, res) {
    const {
        partnerCode,
        orderId,
        requestId,
        amount,
        orderInfo,
        orderType,
        transId,
        resultCode,
        message,
        payType,
        responseTime,
        extraData,
        signature
    } = req.query;

    const accessKey = process.env.MOMO_ACCESS_KEY;
    const secretKey = process.env.MOMO_SECRET_KEY;

    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;

    const checkSignature = crypto.createHmac('sha256', secretKey)
        .update(rawSignature)
        .digest('hex');

    if (signature === checkSignature) {
        if (resultCode == 0) {
            res.status(200).json({ code: resultCode, message: 'Thanh toán MoMo thành công' });
        } else {
            res.status(200).json({ code: resultCode, message: 'Thanh toán MoMo thất bại hoặc bị hủy' });
        }
    } else {
        res.status(200).json({ code: 97, message: 'Chữ ký MoMo không hợp lệ' });
    }
});

/**
 * @swagger
 * /api/momo/momo_ipn:
 *   post:
 *     summary: 3. API XỬ LÝ IPN URL MOMO (Webhook Server)
 *     description: MoMo gọi Server-to-Server ngầm về để cập nhật trạng thái hóa đơn
 *     tags: [MOMO]
 *     responses:
 *       204:
 *         description: Đã nhận thông báo
 */
router.post('/momo_ipn', function (req, res) {
    const {
        partnerCode,
        orderId,
        requestId,
        amount,
        orderInfo,
        orderType,
        transId,
        resultCode,
        message,
        payType,
        responseTime,
        extraData,
        signature
    } = req.body;

    const accessKey = process.env.MOMO_ACCESS_KEY;
    const secretKey = process.env.MOMO_SECRET_KEY;

    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;

    const checkSignature = crypto.createHmac('sha256', secretKey)
        .update(rawSignature)
        .digest('hex');

    if (signature === checkSignature) {
        if (resultCode == 0) {
            // Thanh toán thành công -> Cập nhật Database
            console.log(`MoMo IPN: Đơn hàng ${orderId} thanh toán thành công`);
        } else {
            // Thanh toán thất bại -> Cập nhật Database
            console.log(`MoMo IPN: Đơn hàng ${orderId} thanh toán thất bại`);
        }
        res.status(204).send();
    } else {
        console.log("MoMo IPN: Chữ ký không hợp lệ");
        res.status(400).json({ message: 'Invalid signature' });
    }
});

module.exports = router;
