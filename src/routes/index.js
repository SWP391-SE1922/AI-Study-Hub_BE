const express = require('express');
const authRoutes = require('./authRoutes');
const documentRoutes = require('./documentRoutes');
const categoryRoutes = require('./categoryRoutes');
const userRoutes = require('./userRoutes');

const router = express.Router();

// Mount các routes chức năng
router.use('/auth', authRoutes);
router.use('/documents', documentRoutes);
router.use('/categories', categoryRoutes);
router.use('/users', userRoutes);

module.exports = router;
