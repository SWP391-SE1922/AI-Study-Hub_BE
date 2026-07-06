const documentService = require('../services/documentService');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * Tải lên tài liệu mới
 */
const createDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    return sendError(res, 'Vui lòng tải lên tệp tin tài liệu', 400);
  }

  try {
    const document = await documentService.createDocument(
      req.user.id,
      req.file,
      req.body
    );

    return sendSuccess(
      res,
      'Tải lên tài liệu thành công',
      { document },
      null,
      201
    );
  } catch (error) {
    const fs = require('fs');

    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    throw error;
  }
});

/**
 * Lấy danh sách tài liệu
 * Guest/User/Admin đều có thể xem tùy quyền trong service
 */
const getAllDocuments = asyncHandler(async (req, res) => {
  const currentUser = req.user || null;

  const result = await documentService.getAllDocuments(
    currentUser,
    req.query
  );

  return sendSuccess(
    res,
    'Lấy danh sách tài liệu thành công',
    result.documents,
    result.pagination,
    200
  );
});

/**
 * Lấy chi tiết tài liệu theo ID
 */
const getDocumentById = asyncHandler(async (req, res) => {
  const currentUser = req.user || null;

  const document = await documentService.getDocumentById(
    currentUser,
    req.params.id
  );

  return sendSuccess(
    res,
    'Lấy thông tin tài liệu thành công',
    { document },
    null,
    200
  );
});

/**
 * Cập nhật tài liệu
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

  return sendSuccess(
    res,
    'Cập nhật tài liệu thành công',
    { document: updatedDocument },
    null,
    200
  );
});

/**
 * Xóa tài liệu
 */
const deleteDocument = asyncHandler(async (req, res) => {
  await documentService.deleteDocument(
    req.user.id,
    req.user.role,
    req.params.id
  );

  return res.status(204).end();
});

/**
 * Tải file tài liệu hiện tại
 */
const downloadDocument = asyncHandler(async (req, res) => {
  const currentUser = req.user || null;

  const result = await documentService.downloadDocument(
    currentUser,
    req.params.id
  );

  if (result.downloadUrl && result.downloadUrl.startsWith('http')) {
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
        return res.status(500).json({
          success: false,
          message: 'Không thể tải file về',
        });
      }
    }
  });
});

/**
 * Xem một phiên bản cụ thể của tài liệu trên web
 */
const previewDocumentVersion = asyncHandler(async (req, res) => {
  const currentUser = req.user || null;

  const result = await documentService.previewDocumentVersion(
    currentUser,
    req.params.id,
    req.params.versionId
  );

  if (result.localPath) {
    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(result.fileName)}`
    );

    res.setHeader('Cache-Control', 'private, max-age=300');

    if (result.mimeType) {
      res.type(result.mimeType);
    }

    return res.sendFile(result.localPath, (err) => {
      if (err) {
        console.error('Lỗi khi mở preview version file:', err);

        if (!res.headersSent) {
          return res.status(500).json({
            success: false,
            message: 'Không thể mở phiên bản file trên web',
          });
        }
      }
    });
  }

  return sendSuccess(
    res,
    'Lấy link xem phiên bản tài liệu thành công',
    {
      previewUrl: result.previewUrl,
      fileName: result.fileName,
      mimeType: result.mimeType,
      version: result.version,
    },
    null,
    200
  );
});

/**
 * Tải một phiên bản cụ thể của tài liệu
 */
const downloadDocumentVersion = asyncHandler(async (req, res) => {
  const currentUser = req.user || null;

  const result = await documentService.downloadDocumentVersion(
    currentUser,
    req.params.id,
    req.params.versionId
  );

  if (result.downloadUrl && result.downloadUrl.startsWith('http')) {
    return sendSuccess(
      res,
      'Lấy link tải phiên bản tài liệu thành công',
      {
        downloadUrl: result.downloadUrl,
        fileName: result.fileName,
        mimeType: result.mimeType,
        version: result.version,
      },
      null,
      200
    );
  }

  return res.download(result.downloadUrl, result.fileName, (err) => {
    if (err) {
      console.error('Lỗi khi stream download version file:', err);

      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: 'Không thể tải phiên bản file về',
        });
      }
    }
  });
});

/**
 * Lấy tài liệu của bản thân
 */
const getMyDocuments = asyncHandler(async (req, res) => {
  const result = await documentService.getMyDocuments(
    req.user.id,
    req.query
  );

  return sendSuccess(
    res,
    'Lấy danh sách tài liệu cá nhân thành công',
    result.documents,
    result.pagination,
    200
  );
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

  return sendSuccess(
    res,
    'Lấy danh sách phiên bản thành công',
    { versions },
    null,
    200
  );
});

module.exports = {
  createDocument,
  getAllDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  downloadDocument,
  previewDocumentVersion,
  downloadDocumentVersion,
  getMyDocuments,
  getDocumentVersions,
};