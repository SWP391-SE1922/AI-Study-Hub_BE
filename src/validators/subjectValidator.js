const Joi = require('joi');

const createSubjectSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'any.required': 'Tên môn học là bắt buộc',
    'string.empty': 'Tên môn học không được để trống',
  }),
  code: Joi.string().trim().max(30).allow('', null).optional(),
  description: Joi.string().trim().allow('', null).optional(),
});

const updateSubjectSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  code: Joi.string().trim().max(30).allow('', null).optional(),
  description: Joi.string().trim().allow('', null).optional(),
});

module.exports = {
  createSubjectSchema,
  updateSubjectSchema,
};