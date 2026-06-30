const express = require('express');
const aiController = require('../controllers/aiController');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

// Chat AI nội bộ: không dùng OpenAI, không cần OPENAI_API_KEY.
router.use(authMiddleware);

router.post('/sessions', aiController.createSession);
router.get('/sessions', aiController.getSessions);
router.get('/sessions/:sessionId/messages', aiController.getMessages);
router.delete('/sessions/:sessionId', aiController.deleteSession);
router.post('/chat', aiController.chat);

module.exports = router;
