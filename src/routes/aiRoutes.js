const express = require('express');
const aiController = require('../controllers/aiController');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

// Tất cả route AI đều yêu cầu đăng nhập
router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: AI Chat
 *   description: Tính năng Chat với AI (Ollama) - Phân tích tài liệu của riêng người dùng
 */

/**
 * @swagger
 * /api/ai/chat:
 *   post:
 *     summary: Gửi tin nhắn chat với AI (Ollama)
 *     tags: [AI Chat]
 *     security:
 *       - bearerAuth: []
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
 *                 example: "Tóm tắt tài liệu Toán rời rạc cho tôi"
 *               sessionId:
 *                 type: string
 *                 description: ID phiên chat (để tiếp tục chat cũ, bỏ trống để tạo phiên mới)
 *                 example: ""
 *     responses:
 *       200:
 *         description: Trả lời thành công từ AI
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ
 */
router.post('/chat', aiController.chat);

/**
 * @swagger
 * /api/ai/sessions:
 *   post:
 *     summary: Tạo phiên chat mới
 *     tags: [AI Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Tạo phiên thành công
 *       401:
 *         description: Chưa đăng nhập
 */
router.post('/sessions', aiController.createSession);

/**
 * @swagger
 * /api/ai/sessions:
 *   get:
 *     summary: Lấy danh sách phiên chat của người dùng hiện tại
 *     tags: [AI Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách phiên chat
 *       401:
 *         description: Chưa đăng nhập
 */
router.get('/sessions', aiController.getSessions);

/**
 * @swagger
 * /api/ai/sessions/{sessionId}/messages:
 *   get:
 *     summary: Lấy tin nhắn trong một phiên chat
 *     tags: [AI Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của phiên chat
 *     responses:
 *       200:
 *         description: Danh sách tin nhắn
 *       404:
 *         description: Không tìm thấy phiên chat
 */
router.get('/sessions/:sessionId/messages', aiController.getMessages);

/**
 * @swagger
 * /api/ai/sessions/{sessionId}:
 *   delete:
 *     summary: Xoá một phiên chat
 *     tags: [AI Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của phiên chat cần xoá
 *     responses:
 *       200:
 *         description: Xoá thành công
 *       404:
 *         description: Không tìm thấy phiên chat
 */
router.delete('/sessions/:sessionId', aiController.deleteSession);

module.exports = router;

