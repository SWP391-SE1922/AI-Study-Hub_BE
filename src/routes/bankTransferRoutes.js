const express = require('express');
const {
    authMiddleware,
} = require('../middlewares/authMiddleware');

const bankTransferController = require(
    '../controllers/bankTransferController'
);

const router = express.Router();

router.post(
    '/create',
    authMiddleware,
    bankTransferController.createBankTransfer
);

router.patch(
    '/:id/confirm',
    authMiddleware,
    bankTransferController.confirmTransferred
);

module.exports = router;