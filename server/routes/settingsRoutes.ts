import { Router } from 'express';
import { settingsController } from '../controllers/settingsController';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

router.get('/', requireAuth, settingsController.getSettings);
router.patch('/', requireAuth, requireRole('admin'), settingsController.updateSettings);
router.get('/audit-logs', requireAuth, requireRole('admin'), settingsController.getAuditLogs);

export default router;
