const express = require('express');
const router = express.Router();
const PayOS = require('@payos/node');
const { authMiddleware } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: PAYOS
 *   description: API thanh toán PayOS (VietQR)
 */

/**
 * @swagger
 * /api/payos/create_payment_link:
 *   post:
 *     summary: 1. API TẠO LINK THANH TOÁN (Mã QR) PAYOS
 *     tags: [PAYOS]
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
 *               - description
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Số tiền cần thanh toán
 *                 example: 10000
 *               description:
 *                 type: string
 *                 description: Nội dung chuyển khoản (Tối đa 25 ký tự)
 *                 example: "Thanh toan don hang"
 *     responses:
 *       200:
 *         description: Trả về URL thanh toán PayOS chứa mã VietQR
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 checkoutUrl:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Lỗi máy chủ
 */
router.post('/create_payment_link', authMiddleware, async function (req, res) {
    try {
        const clientId = process.env.PAYOS_CLIENT_ID;
        const apiKey = process.env.PAYOS_API_KEY;
        const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

        const payOS = new PayOS(clientId, apiKey, checksumKey);

        const orderCode = Number(String(new Date().getTime()).slice(-6)); // Tạo mã đơn hàng số nguyên ngẫu nhiên (PayOS yêu cầu)
        const amount = req.body.amount || 2000;
        const description = req.body.description || "Thanh toan don hang";
        const returnUrl = process.env.PAYOS_RETURN_URL;
        const cancelUrl = process.env.PAYOS_CANCEL_URL;

        const body = {
            orderCode: orderCode,
            amount: amount,
            description: description,
            returnUrl: returnUrl,
            cancelUrl: cancelUrl
        };

        const paymentLinkResponse = await payOS.createPaymentLink(body);

        res.status(200).json({ 
            checkoutUrl: paymentLinkResponse.checkoutUrl, 
            orderCode: orderCode 
        });
    } catch (error) {
        console.error("PayOS Create Payment Error:", error);
        res.status(500).json({ message: "Lỗi hệ thống khi tạo thanh toán PayOS", error: error.message });
    }
});

/**
 * @swagger
 * /api/payos/payos_return:
 *   get:
 *     summary: 2. API XỬ LÝ RETURN URL PAYOS (Redirect Frontend)
 *     description: Trình duyệt của Client tự động nhảy về đây sau khi thanh toán thành công/hủy
 *     tags: [PAYOS]
 *     responses:
 *       200:
 *         description: Kết quả thanh toán
 */
router.get('/payos_return', function (req, res) {
    // PayOS sẽ trả về các query param như: code, id, cancel, status, orderCode
    const { code, id, cancel, status, orderCode } = req.query;

    if (cancel === 'true') {
        return res.status(200).json({ code: cancel, message: 'Thanh toán PayOS đã bị hủy', orderCode });
    }

    if (code === '00') {
        res.status(200).json({ code: code, message: 'Thanh toán PayOS thành công', orderCode, transactionId: id });
    } else {
        res.status(200).json({ code: code, message: 'Thanh toán PayOS thất bại', orderCode });
    }
});

/**
 * @swagger
 * /api/payos/payos_ipn:
 *   post:
 *     summary: 3. API XỬ LÝ IPN URL PAYOS (Webhook Server)
 *     description: PayOS gọi Server-to-Server ngầm về để cập nhật trạng thái hóa đơn
 *     tags: [PAYOS]
 *     responses:
 *       200:
 *         description: Đã nhận thông báo
 */
router.post('/payos_ipn', async function (req, res) {
    try {
        const clientId = process.env.PAYOS_CLIENT_ID;
        const apiKey = process.env.PAYOS_API_KEY;
        const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

        const payOS = new PayOS(clientId, apiKey, checksumKey);

        // Verify webhook signature (sử dụng thư viện SDK cung cấp sẵn)
        const webhookData = payOS.verifyPaymentWebhookData(req.body);

        if (webhookData.code === '00') {
            console.log(`PayOS IPN: Đơn hàng ${webhookData.orderCode} thanh toán thành công!`);
            // Tiến hành cập nhật Database của bạn ở đây
            
            res.json({
                error: 0,
                message: "Webhook xử lý thành công",
                data: null
            });
        } else {
            console.log(`PayOS IPN: Trạng thái không hợp lệ hoặc thất bại cho đơn hàng ${webhookData.orderCode}`);
            res.json({
                error: 1,
                message: "Webhook xử lý thất bại hoặc hủy",
                data: null
            });
        }
    } catch (error) {
        console.error("PayOS Webhook Error:", error);
        res.json({
            error: 1,
            message: "Lỗi xác thực webhook (sai chữ ký)",
            data: null
        });
    }
});

module.exports = router;
