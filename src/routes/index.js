const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const categoryRoutes = require('./categoryRoutes');
const documentRoutes = require('./documentRoutes');
const folderRoutes = require('./folderRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const profileRoutes = require('./profileRoutes');
const subjectRoutes = require('./subjectRoutes');
const aiRoutes = require('./aiRoutes');
const vnpayRoutes = require('./vnpayRoutes');
const transactionRoutes = require('./transactionRoutes');
const planRoutes = require('./planRoutes');
const invoiceRoutes = require('./invoiceRoutes');

const router = express.Router();

// Mount các routes chức năng
// LƯU Ý: vnpay/momo/payos phải đứng TRƯỚC folderRoutes.
// folderRoutes mount tại '/' và có authMiddleware global — nếu đặt trước
// sẽ chặn mọi request không có JWT (kể cả VNPay return).
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/documents', documentRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/profile', profileRoutes);
router.use('/subjects', subjectRoutes);
router.use('/ai', aiRoutes);
router.use('/plans', planRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/vnpay', vnpayRoutes);
router.use('/transactions', transactionRoutes);
router.use('/', folderRoutes); // /folders, /resources — đặt cuối vì mount root + auth global

module.exports = router;
