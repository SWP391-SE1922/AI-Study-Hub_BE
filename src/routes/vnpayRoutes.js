const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const moment = require('moment');
const querystring = require('qs');
const { sortObject } = require('../utils/vnpayUtils');

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
 */
router.post('/create_payment_url', function (req, res) {
    let date = new Date();
    let createDate = moment(date).format('YYYYMMDDHHmmss');
    
    // Lấy IP của client
    let ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;

    let tmnCode = process.env.VNP_TMNCODE;
    let secretKey = process.env.VNP_HASHSECRET;
    let vnpUrl = process.env.VNP_URL;
    let returnUrl = process.env.VNP_RETURNURL;

    let orderId = moment(date).format('DDHHmmss'); // Tạo mã đơn hàng tạm thời dạng chuỗi số
    let amount = req.body.amount; // Số tiền truyền lên từ Frontend (ví dụ: 50000)
    let bankCode = req.body.bankCode || ''; // Nếu muốn user chọn trực tiếp ngân hàng (ví dụ: NCB)
    
    let locale = req.body.language || 'vn';
    let currCode = 'VND';
    
    let vnp_Params = {};
    vnp_Params['vnp_Version'] = '2.1.0';
    vnp_Params['vnp_Command'] = 'pay';
    vnp_Params['vnp_TmnCode'] = tmnCode;
    vnp_Params['vnp_Locale'] = locale;
    vnp_Params['vnp_CurrCode'] = currCode;
    vnp_Params['vnp_TxnRef'] = orderId;
    vnp_Params['vnp_OrderInfo'] = 'Thanh toan cho don hang #' + orderId;
    vnp_Params['vnp_OrderType'] = 'other';
    vnp_Params['vnp_Amount'] = amount * 100; // BẮT BUỘC: Nhân với 100 theo quy định VNPAY
    vnp_Params['vnp_ReturnUrl'] = returnUrl;
    vnp_Params['vnp_IpAddr'] = ipAddr;
    vnp_Params['vnp_CreateDate'] = createDate;
    
    if (bankCode !== null && bankCode !== '') {
        vnp_Params['vnp_BankCode'] = bankCode;
    }

    // Sắp xếp object theo alphabet của key
    vnp_Params = sortObject(vnp_Params);

    // Tạo chuỗi query data thô để chuẩn bị băm mã hóa
    let signData = querystring.stringify(vnp_Params, { encode: false });
    
    // Tiến hành băm mã SHA512 bằng chuỗi Secret Key bảo mật
    let hmac = crypto.createHmac("sha512", secretKey);
    let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex"); 
    
    // Đẩy chuỗi băm vào mảng tham số và build thành URL hoàn chỉnh
    vnp_Params['vnp_SecureHash'] = signed;
    vnpUrl += '?' + querystring.stringify(vnp_Params, { encode: false });

    // Trả link thanh toán về cho client để frontend điều hướng trình duyệt sang cổng VNPAY
    res.status(200).json({ paymentUrl: vnpUrl });
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
router.get('/vnpay_return', function (req, res) {
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

    if (secureHash === signed) {
        // Kiểm tra mã phản hồi giao dịch thành công từ VNPAY (Mã thành công là '00')
        if (vnp_Params['vnp_ResponseCode'] === '00') {
            res.json({ code: vnp_Params['vnp_ResponseCode'], message: 'Success' }); 
        } else {
            res.json({ code: vnp_Params['vnp_ResponseCode'], message: 'Error' });
        }
    } else {
        res.status(200).json({ RspCode: '97', Message: 'Chữ ký không hợp lệ (Fail checksum)' });
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
router.get('/vnpay_ipn', function (req, res) {
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
        let orderId = vnp_Params['vnp_TxnRef'];
        let rspCode = vnp_Params['vnp_ResponseCode'];

        // ---- ĐOẠN NÀY BẠN TỰ VIẾT LOGIC XỬ LÝ DATABASE ----
        // B1: Tìm đơn hàng trong Database dựa vào `orderId`
        // B2: Kiểm tra số tiền nhận được (vnp_Params['vnp_Amount'] / 100) có khớp với số tiền của đơn hàng gốc trong DB không.
        // B3: Kiểm tra trạng thái đơn hàng hiện tại có đang là "Chờ thanh toán" hay không.
        
        let checkOrderId = true; // Giả lập tìm thấy đơn hàng trong DB
        let checkAmount = true;  // Giả lập số tiền trùng khớp
        let checkOrderStatus = true; // Giả lập đơn hàng chưa được xử lý trước đó

        if (checkOrderId) {
            if (checkAmount) {
                if (checkOrderStatus) {
                    if (rspCode === "00") {
                        // Thao tác DB: Đổi trạng thái đơn hàng thành => "Thành công"
                    } else {
                        // Thao tác DB: Đổi trạng thái đơn hàng thành => "Thất bại"
                    }
                    // Trả về JSON đúng cấu trúc bắt buộc của VNPAY
                    res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
                } else {
                    res.status(200).json({ RspCode: '02', Message: 'Order already confirmed' });
                }
            } else {
                res.status(200).json({ RspCode: '04', Message: 'Invalid amount' });
            }
        } else {
            res.status(200).json({ RspCode: '01', Message: 'Order not found' });
        }
    } else {
        res.status(200).json({ RspCode: '97', Message: 'Invalid signature' });
    }
});

module.exports = router;
