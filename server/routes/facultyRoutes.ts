import { Router } from 'express';
import { facultyController } from '../controllers/facultyController';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

// Admin creates, lists, edits, and manages faculty
router.get('/', requireAuth, requireRole('admin'), facultyController.getFaculty);
router.post('/', requireAuth, requireRole('admin'), facultyController.createFaculty);
router.get('/:id', requireAuth, facultyController.getFacultyById);
router.patch('/:id', requireAuth, facultyController.updateFaculty);
router.patch('/:id/status', requireAuth, requireRole('admin'), facultyController.setFacultyStatus);

export default router;
