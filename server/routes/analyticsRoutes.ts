import { Router } from 'express';
import { analyticsController } from '../controllers/analyticsController';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

router.get('/overview', requireAuth, analyticsController.getOverview);
router.get('/platform', requireAuth, requireRole('admin'), analyticsController.getPlatformStats);

export default router;
