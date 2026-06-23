const prisma = require('../config/database');
const { hashPassword } = require('./hashPassword');
const { STORAGE_LIMITS } = require('../config/constants');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function ensureDefaultAdmin() {
  if (process.env.AUTO_CREATE_ADMIN === 'false') {
    console.log('ℹ️ AUTO_CREATE_ADMIN=false, bỏ qua tạo tài khoản admin mặc định.');
    return null;
  }

  const email = normalizeEmail(process.env.ADMIN_EMAIL || 'admin@gmail.com');
  const password = process.env.ADMIN_PASSWORD || '123456';
  const fullName = process.env.ADMIN_FULL_NAME || 'Admin System';

  if (!email || !password) {
    console.warn('⚠️ Thiếu ADMIN_EMAIL hoặc ADMIN_PASSWORD, bỏ qua tạo admin mặc định.');
    return null;
  }

  const hashedPassword = await hashPassword(password);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      fullName,
      role: 'ADMIN',
      isVerified: true,
      storageLimit: STORAGE_LIMITS.BASIC,
      verifyEmailToken: null,
      verifyEmailExpire: null,
      resetPasswordToken: null,
      resetPasswordExpire: null,
    },
    create: {
      email,
      password: hashedPassword,
      fullName,
      role: 'ADMIN',
      isVerified: true,
      usedStorage: 0,
      storageLimit: STORAGE_LIMITS.BASIC,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isVerified: true,
    },
  });

  console.log(`✅ Admin sẵn sàng: ${admin.email} / ${password}`);
  return admin;
}

module.exports = ensureDefaultAdmin;
