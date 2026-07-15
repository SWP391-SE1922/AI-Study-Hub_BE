const express = require('express');
const subscriptionController = require('../controllers/subscriptionController');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Subscription
 *   description: API quản lý gói nâng cấp
 */

/**
 * @swagger
 * /api/subscriptions/plans:
 *   get:
 *     summary: Lấy danh sách gói nâng cấp
 *     tags: [Subscription]
 *     responses:
 *       200:
 *         description: Lấy danh sách gói thành công
 *       500:
 *         description: Lỗi máy chủ
 */
router.get('/plans', subscriptionController.getPlans);

/**
 * @swagger
 * /api/subscriptions/current:
 *   get:
 *     summary: Lấy gói hiện tại của người dùng
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy gói hiện tại thành công
 *       401:
 *         description: Chưa đăng nhập
 */
router.get(
    '/current',
    authMiddleware,
    subscriptionController.getCurrentSubscription
);

module.exports = router;