const express = require('express');
const router = express.Router();

const prisma = require('../config/database');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const totalDocuments = await prisma.document.count({
      where: {
        uploadedBy: req.user.id
      }
    });

    res.json({
      success: true,
      data: {
        totalDocuments,
        totalCourses: 6,
        totalQuizzes: 12
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;