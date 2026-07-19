const subjectService = require('../services/subjectService');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

const getAllSubjects = asyncHandler(async (req, res) => {
  const includeDeleted = req.user?.role === 'ADMIN';
  const subjects = await subjectService.getAllSubjects({
    ...req.query,
    includeDeleted,
  });

  return sendSuccess(res, 'Lấy danh sách môn học thành công', {
    subjects,
  });
});

const createSubject = asyncHandler(async (req, res) => {
  const subject = await subjectService.createSubject(req.user?.id, req.body);

  return sendSuccess(res, 'Tạo môn học thành công', { subject }, null, 201);
});

const updateSubject = asyncHandler(async (req, res) => {
  const subject = await subjectService.updateSubject(req.params.id, req.body);

  return sendSuccess(res, 'Cập nhật môn học thành công', {
    subject,
  });
});

const deleteSubject = asyncHandler(async (req, res) => {
  await subjectService.deleteSubject(req.params.id);
  return sendSuccess(res, 'Đã xóa mềm môn học', null, null, 200);
});

const restoreSubject = asyncHandler(async (req, res) => {
  const subject = await subjectService.restoreSubject(req.params.id);
  return sendSuccess(res, 'Đã khôi phục môn học', { subject }, null, 200);
});

module.exports = {
  getAllSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  restoreSubject,
};
