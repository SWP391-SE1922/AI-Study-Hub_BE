const { PrismaClient } = require('@prisma/client');

// Prisma Client Singleton
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

module.exports = prisma;
