const subjectService = require('../services/subjectService');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

const createSubject = asyncHandler(async (req, res) => {
  const subject = await subjectService.createSubject(req.body);
  return sendSuccess(res, 'Tạo bộ môn thành công', { subject }, null, 201);
});

const getAllSubjects = asyncHandler(async (req, res) => {
  const subjects = await subjectService.getAllSubjects();
  return sendSuccess(res, 'Lấy danh sách bộ môn thành công', { subjects }, null, 200);
});

const getSubjectById = asyncHandler(async (req, res) => {
  const subject = await subjectService.getSubjectById(req.params.id);
  return sendSuccess(res, 'Lấy thông tin bộ môn thành công', { subject }, null, 200);
});

const updateSubject = asyncHandler(async (req, res) => {
  const subject = await subjectService.updateSubject(req.params.id, req.body);
  return sendSuccess(res, 'Cập nhật bộ môn thành công', { subject }, null, 200);
});

const deleteSubject = asyncHandler(async (req, res) => {
  await subjectService.deleteSubject(req.params.id);
  return res.status(204).end();
});

module.exports = {
  createSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
};
