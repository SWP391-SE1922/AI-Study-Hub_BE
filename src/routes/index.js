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
const momoRoutes = require('./momoRoutes');
const payosRoutes = require('./payosRoutes');
const transactionRoutes = require('./transactionRoutes');
const subscriptionRoutes = require('./subscriptionRoutes');
const bankTransferRoutes = require('./bankTransferRoutes');

const router = express.Router();

// Public hoặc có middleware riêng
router.use('/auth', authRoutes);

// Đặt Subscription trước folderRoutes vì /plans là API public
router.use('/subscriptions', subscriptionRoutes);

// Các module chức năng
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/documents', documentRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/profile', profileRoutes);
router.use('/subjects', subjectRoutes);
router.use('/ai', aiRoutes);
router.use('/vnpay', vnpayRoutes);
router.use('/momo', momoRoutes);
router.use('/payos', payosRoutes);
router.use('/transactions', transactionRoutes);
router.use('/bank-transfer', bankTransferRoutes);

// Phải để cuối vì folderRoutes đang mount tại "/"
router.use('/', folderRoutes);

module.exports = router;