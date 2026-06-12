const express = require('express');
const authRoutes = require('./authRoutes');
const documentRoutes = require('./documentRoutes');
const categoryRoutes = require('./categoryRoutes');
const userRoutes = require('./userRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const profileRoutes = require('./profileRoutes');
const aiRoutes = require('./aiRoutes');
const subjectRoutes = require('./subjectRoutes');

const router = express.Router();

// Mount các routes chức năng
router.use('/auth', authRoutes);
router.use('/documents', documentRoutes);
router.use('/categories', categoryRoutes);
router.use('/users', userRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/profile', profileRoutes);
router.use('/ai', aiRoutes);
router.use('/subjects', subjectRoutes);

module.exports = router;
