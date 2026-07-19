const express = require('express');
const subjectController = require('../controllers/subjectController');
const { authMiddleware, authMiddlewareOptional } = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');
const validate = require('../middlewares/validationMiddleware');
const {
  createSubjectSchema,
  updateSubjectSchema,
} = require('../validators/subjectValidator');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Subjects
 *   description: Quản lý môn học
 */

/**
 * @swagger
 * /api/subjects:
 *   get:
 *     summary: Lấy danh sách môn học
 *     tags: [Subjects]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo tên, mã môn học hoặc mô tả
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/', authMiddlewareOptional, subjectController.getAllSubjects);

/**
 * @swagger
 * /api/subjects:
 *   post:
 *     summary: Tạo môn học mới
 *     tags: [Subjects]
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
 *                 example: Java Web
 *               code:
 *                 type: string
 *                 example: PRJ301
 *               description:
 *                 type: string
 *                 example: Môn học Java Web
 *     responses:
 *       201:
 *         description: Tạo môn học thành công
 *       409:
 *         description: Môn học đã tồn tại
 */
router.post(
  '/',
  authMiddleware,
  requireRole('ADMIN'),
  validate(createSubjectSchema),
  subjectController.createSubject
);

/**
 * @swagger
 * /api/subjects/{id}:
 *   put:
 *     summary: Cập nhật môn học
 *     tags: [Subjects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mã UUID môn học
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Java Web Advanced
 *               code:
 *                 type: string
 *                 example: PRJ301
 *               description:
 *                 type: string
 *                 example: Cập nhật mô tả môn học
 *     responses:
 *       200:
 *         description: Cập nhật môn học thành công
 *       404:
 *         description: Không tìm thấy môn học
 */
router.put(
  '/:id',
  authMiddleware,
  requireRole('ADMIN'),
  validate(updateSubjectSchema),
  subjectController.updateSubject
);

/**
 * @swagger
 * /api/subjects/{id}:
 *   delete:
 *     summary: Xóa môn học
 *     tags: [Subjects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mã UUID môn học
 *     responses:
 *       204:
 *         description: Xóa môn học thành công
 *       404:
 *         description: Không tìm thấy môn học
 */
router.delete(
  '/:id',
  authMiddleware,
  requireRole('ADMIN'),
  subjectController.deleteSubject
);

router.post(
  '/:id/restore',
  authMiddleware,
  requireRole('ADMIN'),
  subjectController.restoreSubject
);

module.exports = router;