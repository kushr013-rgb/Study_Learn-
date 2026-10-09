import { Router } from 'express';
import { studentController } from '../controllers/studentController';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

// Student profile view & update (Self or Admin)
router.get('/:id', requireAuth, studentController.getStudentById);
router.patch('/:id', requireAuth, studentController.updateProfile);

// Admin student administration routes
router.get('/', requireAuth, requireRole('admin'), studentController.getStudents);
router.patch('/:id/status', requireAuth, requireRole('admin'), studentController.updateStatus);

export default router;
