const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Allow guest to ask question? Better to require auth or allow optional auth.
// If optional auth, protect middleware needs to be bypassed or adjusted,
// but let's assume it's protected for now to match the user's plan requirements.
// Tích hợp AI cơ bản
router.post('/ask', authMiddleware, aiController.askQuestion);

// Lịch sử Chat AI (Tích hợp với ChatPage)
router.get('/sessions', authMiddleware, aiController.getChatSessions);
router.post('/sessions', authMiddleware, aiController.createChatSession);
router.get('/sessions/:id/messages', authMiddleware, aiController.getChatMessages);
router.post('/chat', authMiddleware, aiController.sendChatMessage);
router.delete('/sessions/:id', authMiddleware, aiController.deleteChatSession);

module.exports = router;
