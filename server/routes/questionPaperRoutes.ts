import { Router } from 'express';
import { questionPaperController } from '../controllers/questionPaperController';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { uploadQuestionPaper } from '../middleware/upload';

const router = Router();

// Faculty and Admin can upload question papers
router.post(
  '/upload',
  requireAuth,
  requireRole('faculty', 'admin'),
  uploadQuestionPaper.single('file'),
  questionPaperController.uploadPaper
);

// List papers
router.get('/', requireAuth, requireRole('faculty', 'admin'), questionPaperController.listPapers);

// View paper details
router.get('/:id', requireAuth, requireRole('faculty', 'admin'), questionPaperController.getPaperById);

// Approve extracted questions into Question bank
router.post('/:id/approve', requireAuth, requireRole('faculty', 'admin'), questionPaperController.approveQuestions);

// Reject paper
router.post('/:id/reject', requireAuth, requireRole('faculty', 'admin'), questionPaperController.rejectPaper);

export default router;
