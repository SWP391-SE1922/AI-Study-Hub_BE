const express = require('express');
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');
const validate = require('../middlewares/validationMiddleware');
const Joi = require('joi');

const router = express.Router();

// Schema validate thay đổi role của admin
const changeRoleSchema = Joi.object({
  role: Joi.string().valid('GUEST', 'USER', 'TEACHER', 'ADMIN').required().messages({
    'any.only': 'Quyền chỉ được phép là GUEST, USER hoặc ADMIN',
    'any.required': 'Quyền mới (role) là bắt buộc',
  }),
});

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Lấy danh sách toàn bộ người dùng kèm tìm kiếm & phân trang (Chỉ Admin)
 *     tags: [Users (Admin Management)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo tên hoặc email
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 */
router.get('/', authMiddleware, requireRole('ADMIN'), userController.getAllUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Lấy thông tin chi tiết một tài khoản (Chỉ Admin)
 *     tags: [Users (Admin Management)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lấy thông tin thành công
 */
router.get('/:id', authMiddleware, requireRole('ADMIN'), userController.getUserById);

/**
 * @swagger
 * /api/users/{id}/role:
 *   put:
 *     summary: Cập nhật vai trò người dùng (Chỉ Admin)
 *     tags: [Users (Admin Management)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [GUEST, USER, ADMIN]
 *                 example: ADMIN
 *     responses:
 *       200:
 *         description: Thay đổi thành công
 */
router.put('/:id/role', authMiddleware, requireRole('ADMIN'), validate(changeRoleSchema), userController.updateUserRole);

/**
 * @swagger
 * /api/users/{id}/lock:
 *   put:
 *     summary: Khóa người dùng (Chỉ Admin)
 *     tags: [Users (Admin Management)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - duration
 *             properties:
 *               duration:
 *                 type: string
 *                 enum: [3d, 7d, permanent, unlock]
 *                 example: 3d
 *     responses:
 *       200:
 *         description: Thay đổi thành công
 *       400:
 *         description: Lỗi đầu vào
 */
router.put('/:id/lock', authMiddleware, requireRole('ADMIN'), userController.lockUser);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Xóa vĩnh viễn tài khoản người dùng (Chỉ Admin)
 *     tags: [Users (Admin Management)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Xóa tài khoản thành công
 */
router.delete('/:id', authMiddleware, requireRole('ADMIN'), userController.deleteUser);

module.exports = router;
