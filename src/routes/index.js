const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const categoryRoutes = require('./categoryRoutes');
const documentRoutes = require('./documentRoutes');
const folderRoutes = require('./folderRoutes');
const chatRoutes = require('./chatRoutes');
const subjectRoutes = require('./subjectRoutes');

const router = express.Router();

// Mount các routes chức năng
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/documents', documentRoutes);
router.use('/chat', chatRoutes);
router.use('/subjects', subjectRoutes);
router.use('/', folderRoutes); // Mount tại root của /api vì route bên trong đã ghi rõ /folders và /resources

module.exports = router;
