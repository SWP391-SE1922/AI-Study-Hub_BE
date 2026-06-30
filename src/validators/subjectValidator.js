const Joi = require('joi');

const createSubjectSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'string.empty': 'Tên bộ môn không được để trống',
    'any.required': 'Tên bộ môn là bắt buộc',
  }),
  description: Joi.string().trim().allow('', null).optional(),
  teacherId: Joi.string().uuid().allow('', null).optional().messages({
    'string.uuid': 'Mã giảng viên không đúng định dạng UUID',
  }),
});

const updateSubjectSchema = Joi.object({
  name: Joi.string().trim().optional(),
  description: Joi.string().trim().allow('', null).optional(),
  teacherId: Joi.string().uuid().allow('', null).optional().messages({
    'string.uuid': 'Mã giảng viên không đúng định dạng UUID',
  }),
});

module.exports = {
  createSubjectSchema,
  updateSubjectSchema,
};
