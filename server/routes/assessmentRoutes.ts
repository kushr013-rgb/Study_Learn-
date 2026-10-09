import { Router } from 'express';
import { assessmentController } from '../controllers/assessmentController';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

// Submissions & Attempts
router.post('/attempts', requireAuth, assessmentController.submitAssessment);
router.get('/attempts', requireAuth, assessmentController.getAttempts);
router.get('/attempts/mine', requireAuth, assessmentController.getAttempts);
router.get('/attempts/list', requireAuth, assessmentController.getAttempts);
router.get('/attempts/:id', requireAuth, assessmentController.getAttemptById);

// Mistakes
router.get('/mistakes', requireAuth, assessmentController.getMistakes);
router.get('/mistakes/list', requireAuth, assessmentController.getMistakes);
router.post('/mistakes/:questionId/reattempt', requireAuth, assessmentController.reattemptMistake);

// Assessments / Tests
router.get('/', requireAuth, assessmentController.getAssessments);
router.post('/', requireAuth, requireRole('faculty', 'admin'), assessmentController.createAssessment);
router.get('/:id', requireAuth, assessmentController.getAssessmentById);
router.get('/:id/questions', requireAuth, assessmentController.getAssessmentQuestions);
router.post('/:id/submit', requireAuth, assessmentController.submitAssessment);
router.patch('/:id', requireAuth, requireRole('faculty', 'admin'), assessmentController.updateAssessment);
router.delete('/:id', requireAuth, requireRole('faculty', 'admin'), assessmentController.deleteAssessment);

export default router;
