const express = require('express');
const router = express.Router();

const prisma = require('../config/database');
const { authMiddleware } = require('../middlewares/authMiddleware');
const planService = require('../services/planService');

router.get('/', authMiddleware, async (req, res) => {
  try {
    let user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        usedStorage: true,
        storageLimit: true,
        plan: true,
        aiQuestionsUsed: true,
        aiQuestionsLimit: true,
        planExpiresAt: true,
        createdAt: true,
      },
    });

    if (user && user.planExpiresAt && new Date(user.planExpiresAt) < new Date() && user.plan !== 'BASIC') {
      user = await planService.applyPlanToUser(req.user.id, 'BASIC');
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * Nâng cấp gói miễn phí / admin-style upgrade.
 * Gói trả phí nên dùng VNPay create_payment_url với planId.
 */
router.put('/upgrade', authMiddleware, async (req, res) => {
  try {
    const { plan, planId } = req.body;

    let targetPlan;
    if (planId) {
      targetPlan = await planService.getPlanById(planId);
    } else if (plan) {
      targetPlan = await planService.getPlanByCode(String(plan).toUpperCase());
    } else {
      return res.status(400).json({ success: false, message: 'plan hoặc planId là bắt buộc.' });
    }

    // Chỉ cho phép upgrade trực tiếp nếu gói miễn phí; gói trả phí → báo dùng VNPay
    if (Number(targetPlan.price) > 0 && req.user.role !== 'ADMIN') {
      return res.status(400).json({
        success: false,
        message: 'Gói trả phí cần thanh toán qua VNPay.',
        data: { planId: targetPlan.id, price: targetPlan.price },
      });
    }

    const updatedUser = await planService.applyPlanToUser(req.user.id, targetPlan);

    res.json({
      success: true,
      message: `Nâng cấp gói ${targetPlan.name} thành công!`,
      data: updatedUser,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
