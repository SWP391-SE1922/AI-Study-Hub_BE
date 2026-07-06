const subjectService = require('../services/subjectService');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

const getAllSubjects = asyncHandler(async (req, res) => {
  const subjects = await subjectService.getAllSubjects(req.query);

  return sendSuccess(res, 'Lấy danh sách môn học thành công', {
    subjects,
  });
});

const createSubject = asyncHandler(async (req, res) => {
  const subject = await subjectService.createSubject(req.user?.id, req.body);

  return sendSuccess(
    res,
    'Tạo môn học thành công',
    { subject },
    null,
    201
  );
});

const updateSubject = asyncHandler(async (req, res) => {
  const subject = await subjectService.updateSubject(req.params.id, req.body);

  return sendSuccess(res, 'Cập nhật môn học thành công', {
    subject,
  });
});

const deleteSubject = asyncHandler(async (req, res) => {
  await subjectService.deleteSubject(req.params.id);

  return res.status(204).end();
});

module.exports = {
  getAllSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
};