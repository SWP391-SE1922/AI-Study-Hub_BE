const Joi = require('joi');

const createCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Tên danh mục không được để trống',
    'string.min': 'Tên danh mục phải có tối thiểu 2 ký tự',
    'string.max': 'Tên danh mục không được vượt quá 100 ký tự',
    'any.required': 'Tên danh mục là bắt buộc',
  }),
  description: Joi.string().trim().allow('', null).optional(),
});

const updateCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional().messages({
    'string.empty': 'Tên danh mục không được để trống',
    'string.min': 'Tên danh mục phải có tối thiểu 2 ký tự',
    'string.max': 'Tên danh mục không được vượt quá 100 ký tự',
  }),
  description: Joi.string().trim().allow('', null).optional(),
});

module.exports = {
  createCategorySchema,
  updateCategorySchema,
};
