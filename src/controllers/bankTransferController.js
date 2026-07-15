const prisma = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

function createPaymentCode() {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(100 + Math.random() * 900);

    return `SH${timestamp}${random}`;
}

/**
 * Tạo yêu cầu chuyển khoản.
 */
const createBankTransfer = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { planId } = req.body;

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

    const paymentCode = createPaymentCode();

    const transaction = await prisma.transaction.create({
        data: {
            userId,
            planId: plan.id,
            amount,
            status: 'PENDING',
            paymentMethod: 'BANK_TRANSFER',
            description: `Chuyển khoản mua gói ${plan.name}`,
            orderInfo: paymentCode,
        },
    });

    const bankId = process.env.PAYMENT_BANK_ID || 'MB';
    const accountNo =
        process.env.PAYMENT_ACCOUNT_NO || '0349411633';
    const accountName =
        process.env.PAYMENT_ACCOUNT_NAME || 'NGUYEN HUU KHA';

    const transferContent = `${paymentCode} ${userId
        .slice(-6)
        .toUpperCase()}`;

    const qrUrl =
        `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png` +
        `?amount=${Math.round(amount)}` +
        `&addInfo=${encodeURIComponent(transferContent)}` +
        `&accountName=${encodeURIComponent(accountName)}`;

    return sendSuccess(
        res,
        'Tạo yêu cầu chuyển khoản thành công',
        {
            transaction: {
                id: transaction.id,
                status: transaction.status,
                amount,
                paymentCode,
            },
            bank: {
                bankId,
                bankName: 'MB Bank',
                accountNo,
                accountName,
            },
            transferContent,
            qrUrl,
        },
        null,
        201
    );
});

/**
 * User báo đã chuyển khoản.
 */
const confirmTransferred = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const transactionId = req.params.id;

    const transaction = await prisma.transaction.findFirst({
        where: {
            id: transactionId,
            userId,
        },
    });

    if (!transaction) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy giao dịch',
        });
    }

    if (transaction.paymentMethod !== 'BANK_TRANSFER') {
        return res.status(400).json({
            success: false,
            message: 'Đây không phải giao dịch chuyển khoản ngân hàng',
        });
    }

    if (transaction.status === 'SUCCESS') {
        return res.status(400).json({
            success: false,
            message: 'Giao dịch đã được xác nhận thành công',
        });
    }

    if (transaction.status === 'WAITING_CONFIRMATION') {
        return sendSuccess(
            res,
            'Giao dịch đang chờ Admin xác nhận',
            { transaction },
            null,
            200
        );
    }

    if (transaction.status !== 'PENDING') {
        return res.status(400).json({
            success: false,
            message: `Không thể xác nhận giao dịch có trạng thái ${transaction.status}`,
        });
    }

    const updatedTransaction = await prisma.transaction.update({
        where: {
            id: transaction.id,
        },
        data: {
            status: 'WAITING_CONFIRMATION',
            description:
                `${transaction.description || ''} - Người dùng đã báo chuyển khoản`,
        },
    });

    return sendSuccess(
        res,
        'Đã gửi yêu cầu xác nhận thanh toán',
        { transaction: updatedTransaction },
        null,
        200
    );
});

module.exports = {
    createBankTransfer,
    confirmTransferred,
};