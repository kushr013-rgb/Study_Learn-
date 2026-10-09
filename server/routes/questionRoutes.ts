import { Router } from 'express';
import { questionController } from '../controllers/questionController';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

// All question reads require an authenticated role and are scoped in the controller.
router.get('/', requireAuth, questionController.getQuestions);
router.get('/categories', requireAuth, questionController.getCategories);
router.get('/stats', requireAuth, questionController.getStats);
router.get('/practice-set', requireAuth, questionController.getPracticeSet);
router.get('/:id', requireAuth, questionController.getQuestionById);

// Faculty & Admin mutation endpoints
router.post('/', requireAuth, requireRole('faculty', 'admin'), questionController.createQuestion);
router.patch('/:id', requireAuth, requireRole('faculty', 'admin'), questionController.updateQuestion);
router.patch('/:id/status', requireAuth, requireRole('faculty', 'admin'), questionController.updateStatus);
router.delete('/:id', requireAuth, requireRole('faculty', 'admin'), questionController.deleteQuestion);

export default router;
