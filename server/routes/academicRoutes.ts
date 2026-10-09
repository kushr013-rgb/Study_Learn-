import { Router } from 'express';
import { academicController } from '../controllers/academicController';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

// Departments
router.get('/departments', requireAuth, academicController.getDepartments);
router.post('/departments', requireAuth, requireRole('admin'), academicController.createDepartment);

// Subjects
router.get('/subjects', requireAuth, academicController.getSubjects);
router.post('/subjects', requireAuth, requireRole('faculty', 'admin'), academicController.createSubject);

// Curriculum
router.get('/curriculum', requireAuth, academicController.getCurriculum);
router.post('/curriculum', requireAuth, requireRole('faculty', 'admin'), academicController.createCurriculum);
router.delete('/curriculum/:id', requireAuth, requireRole('faculty', 'admin'), academicController.deleteCurriculum);

export default router;
