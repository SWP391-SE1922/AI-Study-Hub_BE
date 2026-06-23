const express = require('express');
const chatController = require('../controllers/chatController');
const { authMiddlewareOptional, authMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/chat:
 *   post:
 *     summary: Chat với AI Trợ giảng (Hỏi đáp, tóm tắt tài liệu)
 *     tags: [AI Chatbot]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Hãy tóm tắt tài liệu Toán rời rạc cho tôi."
 *     responses:
 *       200:
 *         description: Trả lời thành công
 */
router.post('/', authMiddlewareOptional, chatController.chatWithDocument);

/**
 * @swagger
 * /api/chat/history:
 *   get:
 *     summary: Lấy lịch sử hội thoại của người dùng
 *     tags: [AI Chatbot]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         schema:
 *           type: string
 *         description: ID phiên chat (nếu có)
 *     responses:
 *       200:
 *         description: Lấy lịch sử thành công
 *       401:
 *         description: Cần đăng nhập
 */
router.get('/history', authMiddleware, chatController.getChatHistory);

module.exports = router;
