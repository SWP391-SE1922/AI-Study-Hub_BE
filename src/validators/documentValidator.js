const Joi = require('joi');

const createDocumentSchema = Joi.object({
  title: Joi.string().trim().required().messages({
    'string.empty': 'Tiêu đề tài liệu không được để trống',
    'any.required': 'Tiêu đề tài liệu là bắt buộc',
  }),
  description: Joi.string().trim().allow('', null).optional(),
  subject: Joi.string().trim().allow('', null).optional(),
  categoryId: Joi.string().uuid().allow('', null).optional().messages({
    'string.uuid': 'Mã danh mục không đúng định dạng UUID',
  }),
  isPublic: Joi.boolean().default(true).optional(),
});

const updateDocumentSchema = Joi.object({
  title: Joi.string().trim().optional(),
  description: Joi.string().trim().allow('', null).optional(),
  subject: Joi.string().trim().allow('', null).optional(),
  categoryId: Joi.string().uuid().allow('', null).optional().messages({
    'string.uuid': 'Mã danh mục không đúng định dạng UUID',
  }),
  isPublic: Joi.boolean().optional(),
});

const queryDocumentSchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(50).optional(),
  search: Joi.string().trim().allow('', null).optional(),
  categoryId: Joi.string().uuid().optional(),
  subject: Joi.string().trim().optional(),
  uploadedBy: Joi.string().uuid().optional(),
  sortBy: Joi.string().valid('createdAt', 'title', 'downloadCount', 'fileSize').default('createdAt').messages({
    'any.only': 'Trường sắp xếp phải thuộc một trong các giá trị: createdAt, title, downloadCount, fileSize',
  }),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

module.exports = {
  createDocumentSchema,
  updateDocumentSchema,
  queryDocumentSchema,
};
