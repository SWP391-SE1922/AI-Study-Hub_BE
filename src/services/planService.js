const prisma = require('../config/database');
const { DEFAULT_PLANS, STORAGE_LIMITS, AI_QUESTION_LIMITS, AI_MODELS } = require('../config/constants');

function parseFeatures(features) {
  if (Array.isArray(features)) return features;
  if (typeof features === 'string') {
    try {
      const parsed = JSON.parse(features);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return features.split('\n').map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

function serializeFeatures(features) {
  if (Array.isArray(features)) return JSON.stringify(features);
  if (typeof features === 'string') {
    try {
      const parsed = JSON.parse(features);
      if (Array.isArray(parsed)) return JSON.stringify(parsed);
    } catch {
      // treat as newline-separated
    }
    return JSON.stringify(features.split('\n').map((s) => s.trim()).filter(Boolean));
  }
  return JSON.stringify([]);
}

function formatPlan(plan) {
  if (!plan) return null;
  const isDeleted = Boolean(plan.deletedAt);
  return {
    ...plan,
    features: parseFeatures(plan.features),
    isDeleted,
    // status dùng cho UI admin: active | inactive | deleted
    status: isDeleted ? 'deleted' : plan.isActive ? 'active' : 'inactive',
  };
}

async function ensureDefaultPlans() {
  for (const plan of DEFAULT_PLANS) {
    await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: {},
      create: plan,
    });
  }
}

const getActivePlans = async () => {
  await ensureDefaultPlans();
  const plans = await prisma.subscriptionPlan.findMany({
    where: {
      isActive: true,
      deletedAt: null,
    },
    orderBy: { sortOrder: 'asc' },
  });
  return plans.map(formatPlan);
};

const getAllPlans = async () => {
  await ensureDefaultPlans();
  // Admin thấy cả gói đã soft-delete
  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: [{ deletedAt: 'asc' }, { sortOrder: 'asc' }],
  });
  return plans.map(formatPlan);
};

const getPlanById = async (id, { includeDeleted = true } = {}) => {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });
  if (!plan || (!includeDeleted && plan.deletedAt)) {
    const error = new Error('Không tìm thấy gói đăng ký.');
    error.statusCode = 404;
    throw error;
  }
  return formatPlan(plan);
};

const getPlanByCode = async (code, { includeDeleted = false } = {}) => {
  await ensureDefaultPlans();
  const plan = await prisma.subscriptionPlan.findUnique({ where: { code } });
  if (!plan || (!includeDeleted && plan.deletedAt)) {
    const error = new Error('Không tìm thấy gói đăng ký.');
    error.statusCode = 404;
    throw error;
  }
  return formatPlan(plan);
};

const createPlan = async (data) => {
  const code = String(data.code || '').trim().toUpperCase();
  if (!code) {
    const error = new Error('Mã gói (code) là bắt buộc.');
    error.statusCode = 400;
    throw error;
  }

  const existing = await prisma.subscriptionPlan.findUnique({ where: { code } });
  if (existing && !existing.deletedAt) {
    const error = new Error('Mã gói đã tồn tại.');
    error.statusCode = 409;
    throw error;
  }

  // Nếu đã soft-delete cùng mã → khôi phục và cập nhật lại
  if (existing && existing.deletedAt) {
    const restored = await prisma.subscriptionPlan.update({
      where: { id: existing.id },
      data: {
        name: data.name?.trim() || code,
        price: Number(data.price) || 0,
        currency: data.currency || 'VND',
        storageLimit: Number(data.storageLimit) || STORAGE_LIMITS[code] || STORAGE_LIMITS.BASIC,
        aiQuestionsLimit: Number(data.aiQuestionsLimit) || AI_QUESTION_LIMITS[code] || 20,
        aiModel: data.aiModel || AI_MODELS[code] || 'llama3',
        durationDays: Number(data.durationDays ?? 30),
        features: serializeFeatures(data.features || data.permissions || []),
        description: data.description || null,
        isActive: data.isActive !== false && data.status !== 'inactive',
        sortOrder: Number(data.sortOrder) || existing.sortOrder || 0,
        deletedAt: null,
      },
    });
    return formatPlan(restored);
  }

  const plan = await prisma.subscriptionPlan.create({
    data: {
      code,
      name: data.name?.trim() || code,
      price: Number(data.price) || 0,
      currency: data.currency || 'VND',
      storageLimit: Number(data.storageLimit) || STORAGE_LIMITS[code] || STORAGE_LIMITS.BASIC,
      aiQuestionsLimit: Number(data.aiQuestionsLimit) || AI_QUESTION_LIMITS[code] || 20,
      aiModel: data.aiModel || AI_MODELS[code] || 'llama3',
      durationDays: Number(data.durationDays ?? 30),
      features: serializeFeatures(data.features || data.permissions || []),
      description: data.description || null,
      isActive: data.isActive !== false && data.status !== 'inactive',
      sortOrder: Number(data.sortOrder) || 0,
      deletedAt: null,
    },
  });

  return formatPlan(plan);
};

const updatePlan = async (id, data) => {
  const current = await getPlanById(id, { includeDeleted: true });

  const updateData = {};
  if (data.name !== undefined) updateData.name = String(data.name).trim();
  if (data.price !== undefined) updateData.price = Number(data.price) || 0;
  if (data.currency !== undefined) updateData.currency = data.currency;
  if (data.storageLimit !== undefined) updateData.storageLimit = Number(data.storageLimit);
  if (data.aiQuestionsLimit !== undefined) updateData.aiQuestionsLimit = Number(data.aiQuestionsLimit);
  if (data.aiModel !== undefined) updateData.aiModel = data.aiModel;
  if (data.durationDays !== undefined) updateData.durationDays = Number(data.durationDays);
  if (data.features !== undefined || data.permissions !== undefined) {
    updateData.features = serializeFeatures(data.features || data.permissions);
  }
  if (data.description !== undefined) updateData.description = data.description;
  if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);
  if (data.status === 'active') {
    updateData.isActive = true;
    updateData.deletedAt = null;
  } else if (data.status === 'inactive') {
    updateData.isActive = false;
  }
  if (data.sortOrder !== undefined) updateData.sortOrder = Number(data.sortOrder);

  if (data.code !== undefined) {
    updateData.code = String(data.code).trim().toUpperCase();
  }

  // Không cho sửa khi đang deleted trừ khi restore / set status active
  if (current.deletedAt && data.status !== 'active' && data.deletedAt !== null) {
    // Cho phép update metadata nhưng vẫn giữ deleted trừ khi explicitly restore
  }

  const plan = await prisma.subscriptionPlan.update({
    where: { id },
    data: updateData,
  });

  return formatPlan(plan);
};

/** Soft delete — không xóa khỏi DB */
const deletePlan = async (id) => {
  await getPlanById(id, { includeDeleted: true });

  const plan = await prisma.subscriptionPlan.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      isActive: false,
    },
  });

  return formatPlan(plan);
};

/** Khôi phục gói đã soft-delete */
const restorePlan = async (id) => {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });
  if (!plan) {
    const error = new Error('Không tìm thấy gói đăng ký.');
    error.statusCode = 404;
    throw error;
  }
  if (!plan.deletedAt) {
    const error = new Error('Gói này chưa bị xóa.');
    error.statusCode = 400;
    throw error;
  }

  const restored = await prisma.subscriptionPlan.update({
    where: { id },
    data: {
      deletedAt: null,
      isActive: true,
    },
  });

  return formatPlan(restored);
};

/**
 * Áp dụng quyền lợi gói cho user dựa trên bản ghi SubscriptionPlan.
 */
const applyPlanToUser = async (userId, planOrCode) => {
  let plan;
  if (typeof planOrCode === 'string') {
    plan = await getPlanByCode(planOrCode, { includeDeleted: true });
  } else {
    plan = planOrCode;
  }

  const durationDays = Number(plan.durationDays) || 0;
  const planExpiresAt =
    plan.code === 'BASIC' || durationDays <= 0
      ? null
      : new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

  return prisma.user.update({
    where: { id: userId },
    data: {
      plan: plan.code,
      storageLimit: Number(plan.storageLimit),
      aiQuestionsLimit: Number(plan.aiQuestionsLimit),
      aiQuestionsUsed: 0,
      planExpiresAt,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      plan: true,
      storageLimit: true,
      aiQuestionsLimit: true,
      aiQuestionsUsed: true,
      planExpiresAt: true,
      isVerified: true,
      isLocked: true,
      usedStorage: true,
    },
  });
};

module.exports = {
  ensureDefaultPlans,
  getActivePlans,
  getAllPlans,
  getPlanById,
  getPlanByCode,
  createPlan,
  updatePlan,
  deletePlan,
  restorePlan,
  applyPlanToUser,
  parseFeatures,
};
