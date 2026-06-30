require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function main() {
  const email = normalizeEmail(process.env.ADMIN_EMAIL || 'admin@gmail.com');
  const password = process.env.ADMIN_PASSWORD || '123456';
  const fullName = process.env.ADMIN_FULL_NAME || 'Admin System';
  const storageLimit = 5 * 1024 * 1024 * 1024;

  if (!email || !password) {
    throw new Error('Thiếu ADMIN_EMAIL hoặc ADMIN_PASSWORD trong .env');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      fullName,
      role: 'ADMIN',
      isVerified: true,
      storageLimit,
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
      storageLimit,
    },
  });

  console.log('✅ Đã tạo/cập nhật admin thành công');
  console.log(`Email: ${admin.email}`);
  console.log(`Password: ${password}`);
}

main()
  .catch((error) => {
    console.error('❌ Không tạo được admin:', error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
