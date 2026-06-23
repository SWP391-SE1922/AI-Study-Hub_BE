const swaggerJSDoc = require('swagger-jsdoc');

const port = process.env.PORT || 5000;

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI Management System API',
      version: '1.0.0',
      description: 'API Documentation for AI Management System Backend',
    },
    servers: [
      {
        url: process.env.BASE_URL || 'https://xxxx-xx-xx.ngrok-free.app',
        description: 'Ngrok Server (Cấu hình BASE_URL trong .env)',
      },
      {
        url: `http://localhost:${port}`,
        description: 'Local Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Nhập token JWT dạng: Bearer <token>',
        },
      },
    },
  },
  apis: ['./src/routes/*.js'], // Đường dẫn tới các file định nghĩa API
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
