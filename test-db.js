const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');

dotenv.config();

const prisma = new PrismaClient();

async function testConnection() {
  console.log('Đang thử kết nối database...');
  console.log(`DATABASE_URL hiện tại: ${process.env.DATABASE_URL}`);
  
  try {
    // Thử kết nối bằng cách chạy một câu lệnh SQL đơn giản
    await prisma.$queryRaw`SELECT 1`;
    console.log('\x1b[32m%s\x1b[0m', '🎉 KẾT NỐI DATABASE THÀNH CÔNG!');
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', '❌ KẾT NỐI DATABASE THẤT BẠI!');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
