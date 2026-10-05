import { Router } from 'express';
import { processPayment } from '../controllers/paymentController';
import { authenticate } from '../middlewares/auth';
import { idempotencyMiddleware } from '../middlewares/idempotency';

const router = Router();

router.use(authenticate);

router.post('/', idempotencyMiddleware, processPayment);

export default router;
