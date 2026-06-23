const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');
const validate = require('../middlewares/validationMiddleware');
const { createSubjectSchema, updateSubjectSchema } = require('../validators/subjectValidator');
const { authMiddleware, authMiddlewareOptional } = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');

router.post('/', authMiddleware, requireRole('ADMIN'), validate(createSubjectSchema), subjectController.createSubject);
router.get('/', subjectController.getAllSubjects);
router.get('/:id', subjectController.getSubjectById);
router.put('/:id', authMiddleware, requireRole('ADMIN'), validate(updateSubjectSchema), subjectController.updateSubject);
router.delete('/:id', authMiddleware, requireRole('ADMIN'), subjectController.deleteSubject);

module.exports = router;
