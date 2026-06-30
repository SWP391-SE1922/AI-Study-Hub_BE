const folderService = require('../services/folderService');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

/**
 * Tạo thư mục mới
 */
const createFolder = asyncHandler(async (req, res) => {
  const folder = await folderService.createFolder(req.user.id, req.body);
  return sendSuccess(res, 'Tạo thư mục thành công', { folder }, null, 201);
});

/**
 * Lấy danh sách nội dung trong thư mục
 */
const getResources = asyncHandler(async (req, res) => {
  const resources = await folderService.getResources(req.user.id, req.query);
  return sendSuccess(res, 'Lấy tài nguyên thành công', resources, null, 200);
});

/**
 * Xóa thư mục
 */
const deleteFolder = asyncHandler(async (req, res) => {
  await folderService.deleteFolder(req.user.id, req.params.id);
  return sendSuccess(res, 'Xóa thư mục thành công', null, null, 200);
});

/**
 * Lấy nội dung thư mục theo URL param (RESTful: GET /folders/:id/contents)
 * :id = 'root' để lấy thư mục gốc
 */
const getFolderContents = asyncHandler(async (req, res) => {
  const folderId = req.params.id;
  const resources = await folderService.getFolderContents(req.user.id, folderId);
  return sendSuccess(res, 'Lấy tài nguyên thành công', resources, null, 200);
});

module.exports = {
  createFolder,
  getResources,
  getFolderContents,
  deleteFolder,
};

