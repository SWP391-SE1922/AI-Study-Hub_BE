const express = require('express');
const planController = require('../controllers/planController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Plans
 *   description: Quản lý gói đăng ký
 */

// Public: danh sách gói đang active (landing page)
router.get('/', planController.getActivePlans);

// Admin: tất cả gói (kể cả inactive)
router.get('/all', authMiddleware, requireRole('ADMIN'), planController.getAllPlans);

router.get('/:id', planController.getPlanById);

router.post('/', authMiddleware, requireRole('ADMIN'), planController.createPlan);

router.put('/:id', authMiddleware, requireRole('ADMIN'), planController.updatePlan);

router.post('/:id/restore', authMiddleware, requireRole('ADMIN'), planController.restorePlan);

router.delete('/:id', authMiddleware, requireRole('ADMIN'), planController.deletePlan);

module.exports = router;
