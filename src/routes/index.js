const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const categoryRoutes = require('./categoryRoutes');
const documentRoutes = require('./documentRoutes');
const folderRoutes = require('./folderRoutes');
<<<<<<< HEAD
=======
const dashboardRoutes = require('./dashboardRoutes');
const profileRoutes = require('./profileRoutes');
const aiRoutes = require('./aiRoutes');
const subjectRoutes = require('./subjectRoutes');
>>>>>>> b33f7ce1b8bf0059cec22bb1703c2a4ed8f774a3

const router = express.Router();

// Mount các routes chức năng
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/documents', documentRoutes);
router.use('/', folderRoutes); // Mount tại root của /api vì route bên trong đã ghi rõ /folders và /resources
<<<<<<< HEAD
=======
router.use('/dashboard', dashboardRoutes);
router.use('/profile', profileRoutes);
router.use('/ai', aiRoutes);
router.use('/subjects', subjectRoutes);
>>>>>>> b33f7ce1b8bf0059cec22bb1703c2a4ed8f774a3

module.exports = router;
