const express = require('express');
const transactionController = require('../controllers/transactionController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');

const router = express.Router();

// Bắt buộc đăng nhập
router.use(authMiddleware);

/**
 * @swagger
 * /api/transactions/my-transactions:
 *   get:
 *     summary: Lấy lịch sử giao dịch của bản thân
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 */
router.get(
    '/my-transactions',
    transactionController.getMyTransactions
);

/**
 * @swagger
 * /api/transactions/all:
 *   get:
 *     summary: Lấy toàn bộ lịch sử giao dịch (Admin)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 */
router.get(
    '/all',
    requireRole('ADMIN'),
    transactionController.getAllTransactions
);

/**
 * @swagger
 * /api/transactions/{id}/approve:
 *   patch:
 *     summary: Admin xác nhận giao dịch chuyển khoản
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 */
router.patch(
    '/:id/approve',
    requireRole('ADMIN'),
    transactionController.approveTransaction
);

module.exports = router;