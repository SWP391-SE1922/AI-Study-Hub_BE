const planService = require('../services/planService');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

const getActivePlans = asyncHandler(async (req, res) => {
  const plans = await planService.getActivePlans();
  return sendSuccess(res, 'Lấy danh sách gói đăng ký thành công', { plans }, null, 200);
});

const getAllPlans = asyncHandler(async (req, res) => {
  const plans = await planService.getAllPlans();
  return sendSuccess(res, 'Lấy danh sách gói đăng ký thành công', { plans }, null, 200);
});

const getPlanById = asyncHandler(async (req, res) => {
  const plan = await planService.getPlanById(req.params.id);
  return sendSuccess(res, 'Lấy chi tiết gói thành công', { plan }, null, 200);
});

const createPlan = asyncHandler(async (req, res) => {
  const plan = await planService.createPlan(req.body);
  return sendSuccess(res, 'Tạo gói đăng ký thành công', { plan }, null, 201);
});

const updatePlan = asyncHandler(async (req, res) => {
  const plan = await planService.updatePlan(req.params.id, req.body);
  return sendSuccess(res, 'Cập nhật gói đăng ký thành công', { plan }, null, 200);
});

const deletePlan = asyncHandler(async (req, res) => {
  const plan = await planService.deletePlan(req.params.id);
  return sendSuccess(res, 'Đã xóa mềm gói đăng ký', { plan }, null, 200);
});

const restorePlan = asyncHandler(async (req, res) => {
  const plan = await planService.restorePlan(req.params.id);
  return sendSuccess(res, 'Đã khôi phục gói đăng ký', { plan }, null, 200);
});

module.exports = {
  getActivePlans,
  getAllPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  restorePlan,
};
