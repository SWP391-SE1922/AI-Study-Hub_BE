const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');

const swaggerSpec = require('./config/swagger');
const routes = require('./routes/index');
const errorMiddleware = require('./middlewares/errorMiddleware');

const app = express();

// Đảm bảo thư mục uploads tồn tại
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 1. Middlewares bảo mật & ghi log
app.use(helmet({
  crossOriginResourcePolicy: false, // Cho phép truy cập file tĩnh từ nguồn khác
}));
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
  credentials: true
}));
app.use(morgan('dev'));

// 2. Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Phục vụ file tĩnh thư mục /uploads
app.use('/uploads', express.static(uploadDir));

// 4. Swagger API Documentation
const swaggerUiOptions = {
  swaggerOptions: {
    requestInterceptor: (req) => {
      // Tự động thêm header này để bỏ qua trang cảnh báo của Ngrok (Ngrok Free Tier)
      req.headers['ngrok-skip-browser-warning'] = 'true';
      return req;
    }
  }
};
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// 5. Mount Routes
app.use('/api', routes);

// 6. Xử lý Route 404 Not Found
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `API Route không tồn tại: ${req.method} ${req.originalUrl}`
  });
});

// 7. Global Error Handler Middleware (đặt CUỐI CÙNG)
app.use(errorMiddleware);

module.exports = app;
