const express = require('express');
const crypto = require('crypto');
const moment = require('moment');

const { authMiddleware } = require('../middlewares/authMiddleware');
const prisma = require('../config/database');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: VNPAY
 *   description: API thanh toán và nâng cấp gói bằng VNPay
 */

/**
 * Chuyển object thành chuỗi query theo thứ tự alphabet,
 * dùng cùng một cách encoding khi tạo URL và kiểm tra chữ ký.
 */
function buildQueryString(params) {
    return Object.keys(params)
        .sort()
        .map((key) => {
            const rawValue = params[key];

            const value = Array.isArray(rawValue)
                ? rawValue[0]
                : rawValue;

            const encodedKey = encodeURIComponent(key).replace(/%20/g, '+');
            const encodedValue = encodeURIComponent(String(value ?? '')).replace(
                /%20/g,
                '+'
            );

            return `${encodedKey}=${encodedValue}`;
        })
        .join('&');
}

/**
 * So sánh chữ ký an toàn.
 */
function isValidSignature(receivedHash, calculatedHash) {
    if (!receivedHash || !calculatedHash) {
        return false;
    }

    const receivedBuffer = Buffer.from(
        String(receivedHash).toLowerCase(),
        'utf8'
    );

    const calculatedBuffer = Buffer.from(
        String(calculatedHash).toLowerCase(),
        'utf8'
    );

    if (receivedBuffer.length !== calculatedBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(receivedBuffer, calculatedBuffer);
}

/**
 * Cộng thêm số ngày.
 */
function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + Number(days));
    return result;
}

/**
 * Lấy IP của người dùng.
 */
function getClientIp(req) {
    const forwardedFor = req.headers['x-forwarded-for'];

    let ipAddress = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor || req.socket.remoteAddress;

    if (typeof ipAddress === 'string' && ipAddress.includes(',')) {
        ipAddress = ipAddress.split(',')[0].trim();
    }

    if (
        !ipAddress ||
        ipAddress === '::1' ||
        ipAddress === '::ffff:127.0.0.1'
    ) {
        return '127.0.0.1';
    }

    return String(ipAddress).replace('::ffff:', '');
}

/**
 * Kiểm tra các biến môi trường VNPay cần thiết.
 */
function getVnpayConfig() {
    const tmnCode =
        process.env.VNPAY_TMN_CODE ||
        process.env.VNP_TMNCODE;

    const secretKey =
        process.env.VNPAY_HASH_SECRET ||
        process.env.VNP_HASHSECRET;

    const paymentUrl =
        process.env.VNPAY_URL ||
        process.env.VNP_URL;

    const returnUrl =
        process.env.VNPAY_RETURN_URL ||
        process.env.VNP_RETURNURL;

    if (!tmnCode || !secretKey || !paymentUrl || !returnUrl) {
        throw new Error(
            'Thiếu cấu hình VNPay: TMN_CODE, HASH_SECRET, URL hoặc RETURN_URL'
        );
    }

    return {
        tmnCode,
        secretKey,
        paymentUrl,
        returnUrl,
    };
}

/**
 * Tạo chữ ký SHA-512.
 */
function createSecureHash(signData, secretKey) {
    return crypto
        .createHmac('sha512', secretKey)
        .update(Buffer.from(signData, 'utf8'))
        .digest('hex');
}

/**
 * @swagger
 * /api/vnpay/create_payment_url:
 *   post:
 *     summary: Tạo URL thanh toán VNPay theo gói nâng cấp
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
 *               - planId
 *             properties:
 *               planId:
 *                 type: string
 *                 description: ID của gói SubscriptionPlan
 *                 example: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
 *               bankCode:
 *                 type: string
 *                 description: Mã ngân hàng tùy chọn
 *                 example: "NCB"
 *               language:
 *                 type: string
 *                 enum: [vn, en]
 *                 default: vn
 *                 example: vn
 *     responses:
 *       200:
 *         description: Tạo URL thanh toán thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 paymentUrl:
 *                   type: string
 *                 transactionId:
 *                   type: string
 *       400:
 *         description: Thiếu planId
 *       401:
 *         description: Chưa đăng nhập
 *       404:
 *         description: Không tìm thấy gói
 */
router.post(
    '/create_payment_url',
    authMiddleware,
    async (req, res, next) => {
        try {
            const { planId, bankCode, language = 'vn' } = req.body;

            if (!planId || typeof planId !== 'string') {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng chọn gói nâng cấp',
                });
            }

            const plan = await prisma.subscriptionPlan.findFirst({
                where: {
                    id: planId,
                    isActive: true,
                },
            });

            if (!plan) {
                return res.status(404).json({
                    success: false,
                    message: 'Gói nâng cấp không tồn tại hoặc đã ngừng hoạt động',
                });
            }

            const amount = Number(plan.price);

            if (!Number.isFinite(amount) || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Giá gói nâng cấp không hợp lệ',
                });
            }

            const {
                tmnCode,
                secretKey,
                paymentUrl,
                returnUrl,
            } = getVnpayConfig();

            const now = new Date();
            const createDate = moment(now).format('YYYYMMDDHHmmss');
            const expireDate = moment(
                new Date(now.getTime() + 15 * 60 * 1000)
            ).format('YYYYMMDDHHmmss');

            const transaction = await prisma.transaction.create({
                data: {
                    userId: req.user.id,
                    planId: plan.id,
                    amount,
                    status: 'PENDING',
                    paymentMethod: 'VNPAY',
                    description: `Thanh toán gói ${plan.name}`,
                    orderInfo: `Thanh toan goi ${plan.code}`,
                },
            });

            const vnpParams = {
                vnp_Version: '2.1.0',
                vnp_Command: 'pay',
                vnp_TmnCode: tmnCode,
                vnp_Locale: language === 'en' ? 'en' : 'vn',
                vnp_CurrCode: 'VND',
                vnp_TxnRef: transaction.id,
                vnp_OrderInfo: `Thanh toan goi ${plan.code}`,
                vnp_OrderType: 'other',
                vnp_Amount: Math.round(amount * 100),
                vnp_ReturnUrl: returnUrl,
                vnp_IpAddr: getClientIp(req),
                vnp_CreateDate: createDate,
                vnp_ExpireDate: expireDate,
            };

            if (
                typeof bankCode === 'string' &&
                bankCode.trim() !== ''
            ) {
                vnpParams.vnp_BankCode = bankCode.trim();
            }

            const signData = buildQueryString(vnpParams);
            const secureHash = createSecureHash(
                signData,
                secretKey
            );

            const finalPaymentUrl =
                `${paymentUrl}?${signData}` +
                `&vnp_SecureHash=${secureHash}`;

            return res.status(200).json({
                success: true,
                message: 'Tạo URL thanh toán thành công',
                paymentUrl: finalPaymentUrl,
                transactionId: transaction.id,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Hoàn tất giao dịch.
 *
 * Hàm này được dùng chung cho Return URL và IPN.
 * Có cơ chế PROCESSING để hạn chế xử lý trùng khi Return và IPN
 * cùng gọi gần như đồng thời.
 */
async function completePayment({
    txnId,
    responseCode,
    transactionStatus,
    vnpayAmount,
    transactionNo,
    bankCode,
    orderInfo,
}) {
    try {
        const transaction = await prisma.transaction.findUnique({
            where: {
                id: txnId,
            },
            include: {
                user: true,
                plan: true,
            },
        });

        if (!transaction) {
            return {
                success: false,
                message: 'Transaction not found',
            };
        }

        /*
         * Nếu giao dịch đã được xử lý trước đó bởi Return hoặc IPN,
         * không kích hoạt gói thêm lần nữa.
         */
        if (transaction.status !== 'PENDING') {
            return {
                success:
                    transaction.status === 'SUCCESS' ||
                    transaction.status === 'FAILED',
                status: transaction.status,
                alreadyProcessed: true,
            };
        }

        const databaseAmount = Number(transaction.amount);
        const receivedAmount = Number(vnpayAmount);

        if (
            !Number.isFinite(receivedAmount) ||
            Math.abs(databaseAmount - receivedAmount) > 0.01
        ) {
            await prisma.transaction.updateMany({
                where: {
                    id: txnId,
                    status: 'PENDING',
                },
                data: {
                    status: 'FAILED',
                    responseCode: responseCode || '04',
                    transactionNo: transactionNo || null,
                    bankCode: bankCode || null,
                    orderInfo: orderInfo || transaction.orderInfo,
                    description:
                        `${transaction.description || ''}` +
                        ' - Thất bại: Số tiền không khớp',
                },
            });

            return {
                success: false,
                status: 'FAILED',
                message: 'Amount mismatch',
            };
        }

        const paymentSucceeded =
            responseCode === '00' &&
            (!transactionStatus || transactionStatus === '00');

        /*
         * Người dùng hủy hoặc VNPay trả về mã lỗi.
         */
        if (!paymentSucceeded) {
            await prisma.transaction.updateMany({
                where: {
                    id: txnId,
                    status: 'PENDING',
                },
                data: {
                    status: 'FAILED',
                    responseCode: responseCode || transactionStatus || '99',
                    transactionNo: transactionNo || null,
                    bankCode: bankCode || null,
                    orderInfo: orderInfo || transaction.orderInfo,
                },
            });

            return {
                success: true,
                status: 'FAILED',
            };
        }

        if (!transaction.planId || !transaction.plan) {
            await prisma.transaction.updateMany({
                where: {
                    id: txnId,
                    status: 'PENDING',
                },
                data: {
                    status: 'FAILED',
                    responseCode: '99',
                    description:
                        `${transaction.description || ''}` +
                        ' - Thất bại: Không tìm thấy gói nâng cấp',
                },
            });

            return {
                success: false,
                status: 'FAILED',
                message: 'Subscription plan not found',
            };
        }

        const result = await prisma.$transaction(
            async (tx) => {
                /*
                 * Chuyển PENDING thành PROCESSING.
                 * Nếu update count = 0, request khác đã xử lý trước.
                 */
                const claimedTransaction =
                    await tx.transaction.updateMany({
                        where: {
                            id: txnId,
                            status: 'PENDING',
                        },
                        data: {
                            status: 'PROCESSING',
                        },
                    });

                if (claimedTransaction.count === 0) {
                    const latestTransaction =
                        await tx.transaction.findUnique({
                            where: {
                                id: txnId,
                            },
                        });

                    return {
                        alreadyProcessed: true,
                        status: latestTransaction?.status || 'UNKNOWN',
                    };
                }

                const now = new Date();

                const currentSubscription =
                    await tx.userSubscription.findFirst({
                        where: {
                            userId: transaction.userId,
                            status: 'ACTIVE',
                        },
                        orderBy: {
                            expireDate: 'desc',
                        },
                    });

                let subscription;

                const hasValidCurrentSubscription =
                    currentSubscription &&
                    currentSubscription.expireDate > now;

                /*
                 * Gia hạn nếu người dùng đang dùng đúng gói
                 * và gói đó vẫn còn hiệu lực.
                 */
                if (
                    hasValidCurrentSubscription &&
                    currentSubscription.planId === transaction.plan.id
                ) {
                    const newExpireDate = addDays(
                        currentSubscription.expireDate,
                        transaction.plan.durationDays
                    );

                    subscription =
                        await tx.userSubscription.update({
                            where: {
                                id: currentSubscription.id,
                            },
                            data: {
                                expireDate: newExpireDate,
                                status: 'ACTIVE',
                            },
                            include: {
                                plan: true,
                            },
                        });
                } else {
                    /*
                     * Nếu đang dùng gói khác hoặc gói cũ đã hết hạn,
                     * chuyển các subscription ACTIVE cũ thành EXPIRED.
                     */
                    await tx.userSubscription.updateMany({
                        where: {
                            userId: transaction.userId,
                            status: 'ACTIVE',
                        },
                        data: {
                            status: 'EXPIRED',
                        },
                    });

                    subscription =
                        await tx.userSubscription.create({
                            data: {
                                userId: transaction.userId,
                                planId: transaction.plan.id,
                                status: 'ACTIVE',
                                startDate: now,
                                expireDate: addDays(
                                    now,
                                    transaction.plan.durationDays
                                ),
                            },
                            include: {
                                plan: true,
                            },
                        });
                }

                const updatedUser = await tx.user.update({
                    where: {
                        id: transaction.userId,
                    },
                    data: {
                        storageLimit: transaction.plan.storageLimit,
                        dailyChatLimit:
                            transaction.plan.dailyChatLimit,
                    },
                });

                const updatedTransaction =
                    await tx.transaction.update({
                        where: {
                            id: txnId,
                        },
                        data: {
                            status: 'SUCCESS',
                            transactionNo: transactionNo || null,
                            bankCode: bankCode || null,
                            responseCode: responseCode || '00',
                            orderInfo: orderInfo || transaction.orderInfo,
                            paidAt: now,
                        },
                    });

                return {
                    alreadyProcessed: false,
                    status: 'SUCCESS',
                    subscription,
                    user: updatedUser,
                    transaction: updatedTransaction,
                };
            },
            {
                timeout: 15000,
            }
        );

        if (result.alreadyProcessed) {
            return {
                success: result.status === 'SUCCESS',
                status: result.status,
                alreadyProcessed: true,
            };
        }

        console.log(
            `Thanh toán thành công: transaction=${txnId}, ` +
            `user=${transaction.userId}, plan=${transaction.plan.code}`
        );

        return {
            success: true,
            status: 'SUCCESS',
            subscription: result.subscription,
            user: result.user,
        };
    } catch (error) {
        console.error('Lỗi completePayment:', error);

        /*
         * Nếu lỗi xảy ra trước hoặc ngoài interactive transaction,
         * cố gắng đưa PROCESSING về PENDING để IPN có thể xử lý lại.
         */
        try {
            await prisma.transaction.updateMany({
                where: {
                    id: txnId,
                    status: 'PROCESSING',
                },
                data: {
                    status: 'PENDING',
                },
            });
        } catch (rollbackError) {
            console.error(
                'Không thể hoàn nguyên transaction:',
                rollbackError
            );
        }

        return {
            success: false,
            status: 'ERROR',
            error: error.message,
        };
    }
}

/**
 * Lấy và xác thực dữ liệu trả về từ VNPay.
 */
function verifyVnpayRequest(queryParams) {
    const params = {
        ...queryParams,
    };

    const secureHash = params.vnp_SecureHash;

    delete params.vnp_SecureHash;
    delete params.vnp_SecureHashType;

    const { secretKey } = getVnpayConfig();

    const signData = buildQueryString(params);
    const calculatedHash = createSecureHash(
        signData,
        secretKey
    );

    return {
        isValid: isValidSignature(
            secureHash,
            calculatedHash
        ),
        params,
    };
}

/**
 * @swagger
 * /api/vnpay/vnpay_return:
 *   get:
 *     summary: VNPay chuyển trình duyệt người dùng về Backend
 *     tags: [VNPAY]
 *     responses:
 *       302:
 *         description: Chuyển hướng về trang kết quả thanh toán
 */
const handleVnpayReturn = async (req, res, next) => {
    try {
        const { isValid, params } =
            verifyVnpayRequest(req.query);

        const successUrl =
            process.env.PAYMENT_SUCCESS_URL ||
            'http://localhost:5173/payment-status/success';

        const failedUrl =
            process.env.PAYMENT_FAILED_URL ||
            'http://localhost:5173/payment-status/failed';

        if (!isValid) {
            return res.redirect(
                `${failedUrl}` +
                `?code=97` +
                `&message=${encodeURIComponent(
                    'Chữ ký VNPay không hợp lệ'
                )}` +
                `&method=VNPAY`
            );
        }

        const txnRef = String(
            params.vnp_TxnRef || ''
        );

        const responseCode = String(
            params.vnp_ResponseCode || ''
        );

        const transactionStatus = params.vnp_TransactionStatus
            ? String(params.vnp_TransactionStatus)
            : null;

        const amount =
            Number(params.vnp_Amount || 0) / 100;

        const transactionNo = params.vnp_TransactionNo
            ? String(params.vnp_TransactionNo)
            : null;

        const bankCode = params.vnp_BankCode
            ? String(params.vnp_BankCode)
            : null;

        const orderInfo = params.vnp_OrderInfo
            ? String(params.vnp_OrderInfo)
            : null;

        const result = await completePayment({
            txnId: txnRef,
            responseCode,
            transactionStatus,
            vnpayAmount: amount,
            transactionNo,
            bankCode,
            orderInfo,
        });

        if (
            result.success &&
            result.status === 'SUCCESS'
        ) {
            return res.redirect(
                `${successUrl}` +
                `?code=00` +
                `&txnRef=${encodeURIComponent(txnRef)}` +
                `&amount=${encodeURIComponent(amount)}` +
                `&orderInfo=${encodeURIComponent(
                    orderInfo || ''
                )}` +
                `&method=VNPAY`
            );
        }

        let message =
            'Giao dịch không thành công hoặc đã bị hủy';

        if (result.message === 'Amount mismatch') {
            message = 'Số tiền thanh toán không khớp';
        }

        if (
            result.message === 'Transaction not found'
        ) {
            message = 'Không tìm thấy giao dịch';
        }

        if (result.status === 'ERROR') {
            message =
                'Thanh toán đã được ghi nhận nhưng hệ thống chưa thể kích hoạt gói';
        }

        return res.redirect(
            `${failedUrl}` +
            `?code=${encodeURIComponent(
                responseCode || '99'
            )}` +
            `&txnRef=${encodeURIComponent(txnRef)}` +
            `&message=${encodeURIComponent(message)}` +
            `&method=VNPAY`
        );
    } catch (error) {
        next(error);
    }
};

router.get('/vnpay_return', handleVnpayReturn);
router.get('/return', handleVnpayReturn);

/**
 * @swagger
 * /api/vnpay/vnpay_ipn:
 *   get:
 *     summary: VNPay gửi thông báo kết quả thanh toán IPN
 *     tags: [VNPAY]
 *     responses:
 *       200:
 *         description: Kết quả xác nhận cho VNPay
 */
const handleVnpayIpn = async (req, res) => {
    try {
        const { isValid, params } =
            verifyVnpayRequest(req.query);

        if (!isValid) {
            return res.status(200).json({
                RspCode: '97',
                Message: 'Invalid signature',
            });
        }

        const txnRef = String(
            params.vnp_TxnRef || ''
        );

        const responseCode = String(
            params.vnp_ResponseCode || ''
        );

        const transactionStatus = params.vnp_TransactionStatus
            ? String(params.vnp_TransactionStatus)
            : null;

        const amount =
            Number(params.vnp_Amount || 0) / 100;

        const transactionNo = params.vnp_TransactionNo
            ? String(params.vnp_TransactionNo)
            : null;

        const bankCode = params.vnp_BankCode
            ? String(params.vnp_BankCode)
            : null;

        const orderInfo = params.vnp_OrderInfo
            ? String(params.vnp_OrderInfo)
            : null;

        const result = await completePayment({
            txnId: txnRef,
            responseCode,
            transactionStatus,
            vnpayAmount: amount,
            transactionNo,
            bankCode,
            orderInfo,
        });

        if (
            result.status === 'SUCCESS' ||
            result.status === 'FAILED'
        ) {
            return res.status(200).json({
                RspCode: '00',
                Message: 'Confirm Success',
            });
        }

        if (
            result.message === 'Transaction not found'
        ) {
            return res.status(200).json({
                RspCode: '01',
                Message: 'Order not found',
            });
        }

        if (result.message === 'Amount mismatch') {
            return res.status(200).json({
                RspCode: '04',
                Message: 'Invalid amount',
            });
        }

        return res.status(200).json({
            RspCode: '99',
            Message: 'Unknown error',
        });
    } catch (error) {
        console.error('VNPay IPN error:', error);

        return res.status(200).json({
            RspCode: '99',
            Message: 'Unknown error',
        });
    }
};

router.get('/vnpay_ipn', handleVnpayIpn);
router.get('/ipn', handleVnpayIpn);

module.exports = router;