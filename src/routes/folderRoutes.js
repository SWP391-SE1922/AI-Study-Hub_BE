const express = require('express');
const folderController = require('../controllers/folderController');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

// Bắt buộc đăng nhập cho mọi thao tác với thư mục
router.use(authMiddleware);

/**
 * @swagger
 * /api/folders:
 *   post:
 *     summary: Tạo thư mục ảo mới
 *     tags: [Folders]
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
 *                 example: "Tài liệu môn học"
 *               parentId:
 *                 type: string
 *                 description: ID của thư mục cha (Để null nếu tạo ở Root)
 *                 example: null
 *     responses:
 *       201:
 *         description: Tạo thành công
 */
router.post('/folders', folderController.createFolder);

/**
 * @swagger
 * /api/folders/{id}:
 *   delete:
 *     summary: Xóa thư mục
 *     tags: [Folders]
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
 *         description: Xóa thành công
 */
router.delete('/folders/:id', folderController.deleteFolder);

/**
 * @swagger
 * /api/resources:
 *   get:
 *     summary: Lấy danh sách thư mục con và files bên trong thư mục hiện tại
 *     tags: [Folders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: folderId
 *         schema:
 *           type: string
 *         description: ID của thư mục (Truyền 'root' hoặc bỏ trống để lấy thư mục gốc)
 *     responses:
 *       200:
 *         description: Lấy thành công
 */
router.get('/resources', folderController.getResources);

module.exports = router;
