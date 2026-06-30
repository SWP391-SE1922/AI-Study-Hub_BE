const swaggerJSDoc = require('swagger-jsdoc');

const port = process.env.PORT || 3636;
const tunnelUrl = process.env.TUNNEL_URL || process.env.NGROK_URL || process.env.BASE_URL;

const servers = [
  {
    url: `http://localhost:${port}`,
    description: 'Local server',
  },
];

if (tunnelUrl) {
  servers.push({
    url: tunnelUrl,
    description: 'Tunnel/Ngrok/Cloudflare server',
  });
}

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI Management System API',
      version: '1.0.0',
      description: 'API Documentation for AI Management System Backend',
    },
    servers,
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
