const express = require('express');
const documentController = require('../controllers/documentController');
const { authMiddleware, authMiddlewareOptional } = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');
const upload = require('../middlewares/uploadMiddleware');
const validate = require('../middlewares/validationMiddleware');
const {
  createDocumentSchema,
  updateDocumentSchema,
  queryDocumentSchema,
} = require('../validators/documentValidator');

const router = express.Router();

/**
 * @swagger
 * /api/documents:
 *   get:
 *     summary: Lấy danh sách tài liệu kèm bộ lọc, tìm kiếm, phân trang và sắp xếp
 *     tags: [Documents]
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
 *         description: Tìm kiếm theo tiêu đề, mô tả hoặc môn học
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: Lọc theo mã danh mục (UUID)
 *       - in: query
 *         name: subject
 *         schema:
 *           type: string
 *       - in: query
 *         name: uploadedBy
 *         schema:
 *           type: string
 *         description: Lọc theo mã người dùng tải lên (Chỉ Admin)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, title, downloadCount, fileSize]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 */
router.get('/', authMiddlewareOptional, validate(queryDocumentSchema, 'query'), documentController.getAllDocuments);

/**
 * @swagger
 * /api/documents:
 *   post:
 *     summary: Tải lên tài liệu mới (Học sinh/Admin)
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - title
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File cần upload (Tối đa 10MB, hỗ trợ PDF, DOC, DOCX, TXT...)
 *               title:
 *                 type: string
 *                 example: "Tài liệu Đại số tuyến tính"
 *               description:
 *                 type: string
 *                 example: "Tập tài liệu ôn tập giữa kỳ"
 *               subject:
 *                 type: string
 *                 example: "Đại số tuyến tính"
 *               categoryId:
 *                 type: string
 *                 description: Mã UUID danh mục tài liệu
 *               isPublic:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Tải lên thành công
 *       400:
 *         description: Thiếu file hoặc file không hợp lệ
 */
router.post('/', authMiddleware, requireRole('USER', 'ADMIN'), upload.single('file'), validate(createDocumentSchema), documentController.createDocument);

/**
 * @swagger
 * /api/documents/my-documents:
 *   get:
 *     summary: Lấy danh sách tài liệu cá nhân đã tải lên
 *     tags: [Documents]
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
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, title, downloadCount, fileSize]
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 */
router.get('/my-documents', authMiddleware, validate(queryDocumentSchema, 'query'), documentController.getMyDocuments);

/**
 * @swagger
 * /api/documents/{id}:
 *   get:
 *     summary: Lấy chi tiết thông tin tài liệu
 *     tags: [Documents]
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
 *         description: Lấy chi tiết thành công
 *       403:
 *         description: Không có quyền truy cập tài liệu riêng tư
 *       404:
 *         description: Không tìm thấy tài liệu
 */
router.get('/:id', authMiddlewareOptional, documentController.getDocumentById);

/**
 * @swagger
 * /api/documents/{id}:
 *   put:
 *     summary: Cập nhật thông tin chi tiết tài liệu (Chỉ owner hoặc Admin)
 *     tags: [Documents]
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
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               subject:
 *                 type: string
 *               categoryId:
 *                 type: string
 *               isPublic:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       403:
 *         description: Không có quyền chỉnh sửa
 */
router.put('/:id', authMiddleware, validate(updateDocumentSchema), documentController.updateDocument);

/**
 * @swagger
 * /api/documents/{id}:
 *   delete:
 *     summary: Xóa tài liệu khỏi hệ thống và ổ đĩa (Chỉ owner hoặc Admin)
 *     tags: [Documents]
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
 *       403:
 *         description: Không có quyền xóa
 */
router.delete('/:id', authMiddleware, documentController.deleteDocument);

/**
 * @swagger
 * /api/documents/{id}/download:
 *   get:
 *     summary: Tải tệp tin tài liệu xuống máy (Tự động tăng số lượt tải)
 *     tags: [Documents]
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
 *         description: Trả về tệp tin tài liệu tải xuống (File Stream)
 *       403:
 *         description: Không có quyền tải tài liệu riêng tư
 */
router.get('/:id/download', authMiddlewareOptional, documentController.downloadDocument);

module.exports = router;
