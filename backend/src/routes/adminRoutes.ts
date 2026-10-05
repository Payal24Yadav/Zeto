import { Router } from 'express';
import { getAdminDashboard } from '../controllers/adminController';
import { authenticate, requireAdmin } from '../middlewares/auth';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/dashboard', getAdminDashboard);

export default router;
