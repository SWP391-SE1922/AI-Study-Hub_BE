const express = require('express');
const transactionController = require('../controllers/transactionController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');

const router = express.Router();

// Bắt buộc đăng nhập cho các route này
router.use(authMiddleware);

/**
 * @swagger
 * /api/transactions/my-transactions:
 *   get:
 *     summary: Lấy lịch sử giao dịch của bản thân
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/my-transactions', transactionController.getMyTransactions);

/**
 * @swagger
 * /api/transactions/all:
 *   get:
 *     summary: Lấy toàn bộ lịch sử giao dịch trên hệ thống (Chỉ Admin)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 *       403:
 *         description: Không có quyền truy cập
 */
router.get('/all', requireRole('ADMIN'), transactionController.getAllTransactions);

module.exports = router;
