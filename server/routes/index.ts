import { Router } from 'express';
import mongoose from 'mongoose';
import authRoutes from './authRoutes';
import studentRoutes from './studentRoutes';
import facultyRoutes from './facultyRoutes';
import questionPaperRoutes from './questionPaperRoutes';
import questionRoutes from './questionRoutes';
import assessmentRoutes from './assessmentRoutes';
import academicRoutes from './academicRoutes';
import analyticsRoutes from './analyticsRoutes';
import notificationRoutes from './notificationRoutes';
import settingsRoutes from './settingsRoutes';

// Direct controller imports for full backward compatibility
import { studentController } from '../controllers/studentController';
import { facultyController } from '../controllers/facultyController';
import { assessmentController } from '../controllers/assessmentController';
import { academicController } from '../controllers/academicController';
import { settingsController } from '../controllers/settingsController';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { redis } from '../lib/redis';

const router = Router();

// Health check endpoints
router.get('/health', (_req, res) => {
  res.json({
    data: {
      ok: true,
      database: mongoose.connection.readyState === 1,
      status: 'healthy',
      version: '2.0.0',
    },
  });
});

router.get('/health/ready', async (_req, res) => {
  const database = mongoose.connection.readyState === 1;
  let cache = false;
  try {
    cache = (await redis.ping()) === 'PONG';
  } catch {
    cache = false;
  }
  return res.status(database ? 200 : 503).json({
    data: { ready: database, database, redis: cache },
  });
});

// Mount modular sub-routers
router.use('/auth', authRoutes);
router.use('/students', studentRoutes);
router.use('/faculty', facultyRoutes);
router.use('/questions', questionRoutes);
router.use('/question-papers', questionPaperRoutes);
router.use('/tests', assessmentRoutes);
router.use('/assessments', assessmentRoutes);
router.use('/academic', academicRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/notifications', notificationRoutes);
router.use('/settings', settingsRoutes);

// Compatibility aliases matching existing prototype and spec
// Admin endpoints
router.get('/admin/students', requireAuth, requireRole('admin'), studentController.getStudents);
router.patch('/admin/students/:id/status', requireAuth, requireRole('admin'), studentController.updateStatus);
router.get('/admin/faculty', requireAuth, requireRole('admin'), facultyController.getFaculty);
router.post('/admin/faculty', requireAuth, requireRole('admin'), facultyController.createFaculty);
router.patch('/admin/faculty/:id', requireAuth, requireRole('admin'), facultyController.updateFaculty);
router.patch('/admin/faculty/:id/status', requireAuth, requireRole('admin'), facultyController.setFacultyStatus);
router.get('/admin/verification', requireAuth, requireRole('admin'), studentController.getStudents);
router.patch('/admin/verification/:id', requireAuth, requireRole('admin'), studentController.updateStatus);
router.get('/admin/audit-logs', requireAuth, requireRole('admin'), settingsController.getAuditLogs);

// Assessment & Attempt root aliases
router.post('/attempts', requireAuth, assessmentController.submitAssessment);
router.get('/attempts', requireAuth, assessmentController.getAttempts);
router.get('/attempts/:id', requireAuth, assessmentController.getAttemptById);
router.get('/mistakes', requireAuth, assessmentController.getMistakes);
router.post('/mistakes/:questionId/reattempt', requireAuth, assessmentController.reattemptMistake);

// Curriculum aliases
router.get('/curriculum', requireAuth, academicController.getCurriculum);
router.post('/curriculum', requireAuth, requireRole('faculty', 'admin'), academicController.createCurriculum);
router.delete('/curriculum/:id', requireAuth, requireRole('faculty', 'admin'), academicController.deleteCurriculum);

export default router;
