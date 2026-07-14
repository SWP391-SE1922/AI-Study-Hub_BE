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

const router = express.Router();

// Mount các routes chức năng
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/documents', documentRoutes);
router.use('/', folderRoutes); // Mount tại root của /api vì route bên trong đã ghi rõ /folders và /resources
router.use('/dashboard', dashboardRoutes);
router.use('/profile', profileRoutes);
router.use('/subjects', subjectRoutes);
router.use('/ai', aiRoutes);
router.use('/vnpay', vnpayRoutes);
router.use('/momo', momoRoutes);
router.use('/payos', payosRoutes);
router.use('/transactions', transactionRoutes);

module.exports = router;
