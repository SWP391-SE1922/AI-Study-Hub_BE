const express = require('express');
const categoryController = require('../controllers/categoryController');
const { authMiddleware, authMiddlewareOptional } = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');
const validate = require('../middlewares/validationMiddleware');
const { createCategorySchema, updateCategorySchema } = require('../validators/categoryValidator');

const router = express.Router();

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Lấy danh sách toàn bộ danh mục tài liệu
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 */
router.get('/', authMiddlewareOptional, categoryController.getAllCategories);

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Tạo danh mục mới (Chỉ Admin)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Kỹ thuật phần mềm"
 *               description:
 *                 type: string
 *                 example: "Tài liệu chuyên ngành CNTT"
 *     responses:
 *       201:
 *         description: Tạo thành công
 *       409:
 *         description: Trùng tên danh mục
 */
router.post('/', authMiddleware, requireRole('ADMIN'), validate(createCategorySchema), categoryController.createCategory);

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Cập nhật thông tin danh mục (Chỉ Admin)
 *     tags: [Categories]
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
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       409:
 *         description: Trùng tên danh mục mới với danh mục đã có
 */
router.put('/:id', authMiddleware, requireRole('ADMIN'), validate(updateCategorySchema), categoryController.updateCategory);

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Xóa danh mục (Chỉ Admin)
 *     tags: [Categories]
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
 *         description: Xóa thành công
 */
router.delete('/:id', authMiddleware, requireRole('ADMIN'), categoryController.deleteCategory);
router.post('/:id/restore', authMiddleware, requireRole('ADMIN'), categoryController.restoreCategory);

module.exports = router;
