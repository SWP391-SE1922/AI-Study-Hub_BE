const dotenv = require('dotenv');
// Load environment variables
dotenv.config();

// Validate crucial environment variables
const requiredEnv = ['DATABASE_URL', 'JWT_SECRET'];
const missingEnv = requiredEnv.filter((envVar) => !process.env[envVar]);

if (missingEnv.length > 0) {
  console.error(`❌ THIẾU CẤU HÌNH BIẾN MÔI TRƯỜNG: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const app = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy thành công tại http://localhost:${PORT}`);
  console.log(`📄 Tài liệu API (Swagger UI): http://localhost:${PORT}/api-docs`);
});
