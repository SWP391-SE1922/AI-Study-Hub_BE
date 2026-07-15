const prisma = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

/**
 * Cộng thêm số ngày vào một thời điểm.
 */
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + Number(days));
  return result;
}

/**
 * Get current user's transactions
 */
const getMyTransactions = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      plan: {
        select: {
          id: true,
          name: true,
          code: true,
          price: true,
          storageLimit: true,
          dailyChatLimit: true,
          durationDays: true,
        },
      },
    },
  });

  return sendSuccess(
    res,
    'Lấy lịch sử giao dịch thành công',
    { transactions },
    null,
    200
  );
});

/**
 * Get all transactions (Admin only)
 */
const getAllTransactions = asyncHandler(async (req, res) => {
  const transactions = await prisma.transaction.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true,
        },
      },
      plan: {
        select: {
          id: true,
          name: true,
          code: true,
          price: true,
          storageLimit: true,
          dailyChatLimit: true,
          durationDays: true,
        },
      },
    },
  });

  return sendSuccess(
    res,
    'Lấy toàn bộ lịch sử giao dịch thành công',
    { transactions },
    null,
    200
  );
});

/**
 * Admin duyệt giao dịch chuyển khoản.
 *
 * Flow:
 * WAITING_CONFIRMATION
 * -> SUCCESS
 * -> tạo/gia hạn subscription
 * -> cập nhật storageLimit và dailyChatLimit của user
 */
const approveTransaction = asyncHandler(async (req, res) => {
  const transactionId = req.params.id;

  if (!transactionId) {
    return res.status(400).json({
      success: false,
      message: 'Thiếu mã giao dịch',
    });
  }

  const transaction = await prisma.transaction.findUnique({
    where: {
      id: transactionId,
    },
    include: {
      user: true,
      plan: true,
    },
  });

  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy giao dịch',
    });
  }

  if (!transaction.planId || !transaction.plan) {
    return res.status(400).json({
      success: false,
      message: 'Giao dịch không có gói nâng cấp hợp lệ',
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
      message: 'Giao dịch đã được duyệt trước đó',
    });
  }

  if (transaction.status !== 'WAITING_CONFIRMATION') {
    return res.status(400).json({
      success: false,
      message:
        `Chỉ có thể duyệt giao dịch đang chờ xác nhận. ` +
        `Trạng thái hiện tại: ${transaction.status}`,
    });
  }

  const durationDays = Number(transaction.plan.durationDays);
  const storageLimit = Number(transaction.plan.storageLimit);
  const dailyChatLimit = Number(transaction.plan.dailyChatLimit);

  if (!Number.isFinite(durationDays) || durationDays <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Thời hạn của gói nâng cấp không hợp lệ',
    });
  }

  if (!Number.isFinite(storageLimit) || storageLimit <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Dung lượng của gói nâng cấp không hợp lệ',
    });
  }

  if (!Number.isFinite(dailyChatLimit) || dailyChatLimit < 0) {
    return res.status(400).json({
      success: false,
      message: 'Giới hạn AI Chat của gói không hợp lệ',
    });
  }

  const now = new Date();

  const result = await prisma.$transaction(
    async (tx) => {
      /*
       * Claim giao dịch trước để tránh Admin bấm duyệt nhiều lần
       * hoặc hai request chạy đồng thời.
       */
      const claimedTransaction =
        await tx.transaction.updateMany({
          where: {
            id: transaction.id,
            status: 'WAITING_CONFIRMATION',
          },
          data: {
            status: 'PROCESSING',
          },
        });

      if (claimedTransaction.count === 0) {
        const latestTransaction =
          await tx.transaction.findUnique({
            where: {
              id: transaction.id,
            },
          });

        throw new Error(
          latestTransaction?.status === 'SUCCESS'
            ? 'Giao dịch đã được duyệt trước đó'
            : `Giao dịch không thể xử lý. Trạng thái hiện tại: ${latestTransaction?.status || 'UNKNOWN'
            }`
        );
      }

      /*
       * Tìm subscription ACTIVE mới nhất của user.
       */
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

      const hasValidCurrentSubscription =
        currentSubscription &&
        new Date(currentSubscription.expireDate) > now;

      let subscription;

      /*
       * Nếu user đang sử dụng đúng gói và gói chưa hết hạn:
       * cộng thêm durationDays vào ngày hết hạn hiện tại.
       */
      if (
        hasValidCurrentSubscription &&
        currentSubscription.planId === transaction.planId
      ) {
        subscription =
          await tx.userSubscription.update({
            where: {
              id: currentSubscription.id,
            },
            data: {
              status: 'ACTIVE',
              expireDate: addDays(
                currentSubscription.expireDate,
                durationDays
              ),
            },
            include: {
              plan: true,
            },
          });
      } else {
        /*
         * Nếu user đổi gói hoặc subscription cũ đã hết hạn:
         * đóng các subscription ACTIVE cũ và tạo subscription mới.
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
              planId: transaction.planId,
              status: 'ACTIVE',
              startDate: now,
              expireDate: addDays(now, durationDays),
            },
            include: {
              plan: true,
            },
          });
      }

      /*
       * Cập nhật quyền lợi tài khoản.
       */
      const updatedUser = await tx.user.update({
        where: {
          id: transaction.userId,
        },
        data: {
          storageLimit,
          dailyChatLimit,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          avatarUrl: true,
          storageLimit: true,
          usedStorage: true,
          dailyChatLimit: true,
        },
      });

      /*
       * Hoàn tất giao dịch.
       */
      const updatedTransaction =
        await tx.transaction.update({
          where: {
            id: transaction.id,
          },
          data: {
            status: 'SUCCESS',
            paidAt: now,
            responseCode: 'MANUAL_APPROVED',
            description:
              `${transaction.description || ''}` +
              ' - Admin đã xác nhận chuyển khoản',
          },
          include: {
            plan: true,
            user: {
              select: {
                id: true,
                email: true,
                fullName: true,
              },
            },
          },
        });

      return {
        transaction: updatedTransaction,
        subscription,
        user: updatedUser,
      };
    },
    {
      timeout: 15000,
    }
  );

  return sendSuccess(
    res,
    'Duyệt giao dịch và kích hoạt gói thành công',
    result,
    null,
    200
  );
});

module.exports = {
  getMyTransactions,
  getAllTransactions,
  approveTransaction,
};