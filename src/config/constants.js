const GB = 1024 * 1024 * 1024;

const STORAGE_LIMITS = {
  BASIC: 5 * GB,
  PREMIUM: 10 * GB,
  VIP: 50 * GB,
  UNLIMITED: 999 * GB,
};

const AI_QUESTION_LIMITS = {
  BASIC: 20,
  PREMIUM: 50,
  VIP: 250,
  UNLIMITED: 999999,
};

const AI_MODELS = {
  BASIC: 'llama3',
  PREMIUM: 'mistral',
  VIP: 'qwen2.5',
  UNLIMITED: 'qwen2.5',
};

const DEFAULT_PLANS = [
  {
    code: 'BASIC',
    name: 'BASIC (FREE)',
    price: 0,
    storageLimit: STORAGE_LIMITS.BASIC,
    aiQuestionsLimit: AI_QUESTION_LIMITS.BASIC,
    aiModel: AI_MODELS.BASIC,
    durationDays: 0,
    features: JSON.stringify([
      '5 GB dung lượng lưu trữ',
      '20 lượt hỏi AI',
      'Mô hình Llama3 tiêu chuẩn',
    ]),
    description: 'Gói miễn phí cho người mới bắt đầu',
    sortOrder: 1,
  },
  {
    code: 'PREMIUM',
    name: 'PREMIUM',
    price: 250000,
    storageLimit: STORAGE_LIMITS.PREMIUM,
    aiQuestionsLimit: AI_QUESTION_LIMITS.PREMIUM,
    aiModel: AI_MODELS.PREMIUM,
    durationDays: 30,
    features: JSON.stringify([
      '10 GB dung lượng lưu trữ',
      '50 lượt hỏi AI',
      'Ưu tiên xử lý nhanh',
      'Mô hình Mistral',
    ]),
    description: 'Gói trả phí cơ bản',
    sortOrder: 2,
  },
  {
    code: 'VIP',
    name: 'VIP',
    price: 500000,
    storageLimit: STORAGE_LIMITS.VIP,
    aiQuestionsLimit: AI_QUESTION_LIMITS.VIP,
    aiModel: AI_MODELS.VIP,
    durationDays: 30,
    features: JSON.stringify([
      '50 GB dung lượng lưu trữ',
      '250 lượt hỏi AI',
      'Hỗ trợ ưu tiên 24/7',
      'Mô hình Qwen2.5',
    ]),
    description: 'Gói phổ biến nhất',
    sortOrder: 3,
  },
  {
    code: 'UNLIMITED',
    name: 'UNLIMITED',
    price: 1200000,
    storageLimit: STORAGE_LIMITS.UNLIMITED,
    aiQuestionsLimit: AI_QUESTION_LIMITS.UNLIMITED,
    aiModel: AI_MODELS.UNLIMITED,
    durationDays: 30,
    features: JSON.stringify([
      'Vô hạn dung lượng',
      'Không giới hạn lượt hỏi AI',
      'Trải nghiệm thoải mái nhất',
      'Mô hình Qwen2.5',
    ]),
    description: 'Gói không giới hạn',
    sortOrder: 4,
  },
];

module.exports = {
  STORAGE_LIMITS,
  AI_QUESTION_LIMITS,
  AI_MODELS,
  DEFAULT_PLANS,
};
