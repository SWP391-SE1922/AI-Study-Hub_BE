const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middlewares/authMiddleware');

router.post('/chat', authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;

    res.json({
      success: true,
      reply: `AI trả lời: ${message}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;