const documentService = require('../services/documentService');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * Tải lên tài liệu mới
 */
const createDocument = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return sendError(res, 'Vui lòng tải lên tệp tin tài liệu', 400);
  }

  try {
    const document = await documentService.createDocument(req.user.id, req.file, req.body);
    return sendSuccess(res, 'Tải lên tài liệu thành công', { document }, null, 201);
  } catch (error) {
    const fs = require('fs');
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    throw error; // Chuyển cho errorMiddleware xử lý tiếp
  }
});

/**
 * Lấy danh sách tài liệu (Guest/User/Admin)
 */
const getAllDocuments = asyncHandler(async (req, res) => {
  const currentUser = req.user || null;
  const result = await documentService.getAllDocuments(currentUser, req.query);
  return sendSuccess(res, 'Lấy danh sách tài liệu thành công', result.documents, result.pagination, 200);
});

/**
 * Lấy chi tiết tài liệu theo ID
 */
const getDocumentById = asyncHandler(async (req, res) => {
  const currentUser = req.user || null;
  const document = await documentService.getDocumentById(currentUser, req.params.id);
  return sendSuccess(res, 'Lấy thông tin tài liệu thành công', { document }, null, 200);
});

/**
 * Cập nhật tài liệu (Chỉ owner hoặc Admin)
 * Nếu upload file mới thì tạo version mới
 */
const updateDocument = asyncHandler(async (req, res) => {
  const updatedDocument = await documentService.updateDocument(
    req.user.id,
    req.user.role,
    req.params.id,
    req.body,
    req.file || null
  );

  return sendSuccess(res, 'Cập nhật tài liệu thành công', { document: updatedDocument }, null, 200);
});

/**
 * Xóa tài liệu (Chỉ owner hoặc Admin)
 */
const deleteDocument = asyncHandler(async (req, res) => {
  await documentService.deleteDocument(req.user.id, req.user.role, req.params.id);
  return res.status(204).end();
});

/**
 * Tải file tài liệu về
 */
const downloadDocument = asyncHandler(async (req, res) => {
  const currentUser = req.user || null;
  const result = await documentService.downloadDocument(currentUser, req.params.id);

  if (result.downloadUrl.startsWith('http')) {
    return sendSuccess(
      res,
      'Lấy link tải tài liệu thành công',
      {
        downloadUrl: result.downloadUrl,
        fileName: result.fileName,
        mimeType: result.mimeType,
      },
      null,
      200
    );
  }

  return res.download(result.downloadUrl, result.fileName, (err) => {
    if (err) {
      console.error('Lỗi khi stream download file:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Không thể tải file về' });
      }
    }
  });
});

/**
 * Lấy tài liệu của bản thân (My Documents)
 */
const getMyDocuments = asyncHandler(async (req, res) => {
  const result = await documentService.getMyDocuments(req.user.id, req.query);
  return sendSuccess(res, 'Lấy danh sách tài liệu cá nhân thành công', result.documents, result.pagination, 200);
});

/**
 * Lấy lịch sử phiên bản của tài liệu
 */
const getDocumentVersions = asyncHandler(async (req, res) => {
  const versions = await documentService.getDocumentVersions(
    req.user.id,
    req.user.role,
    req.params.id
  );

  return sendSuccess(res, 'Lấy danh sách phiên bản thành công', { versions }, null, 200);
});

module.exports = {
  createDocument,
  getAllDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  downloadDocument,
  getMyDocuments,
  getDocumentVersions,
};