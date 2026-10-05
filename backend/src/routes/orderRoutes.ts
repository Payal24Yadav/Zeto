import { Router } from 'express';
import {
  createOrder,
  getOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatus
} from '../controllers/orderController';
import { authenticate, requireAdmin } from '../middlewares/auth';
import { idempotencyMiddleware } from '../middlewares/idempotency';

const router = Router();

router.use(authenticate);

router.post('/', idempotencyMiddleware, createOrder);
router.get('/', getOrders);
router.get('/:id', getOrderById);
router.post('/:id/cancel', cancelOrder);
router.patch('/:id/status', requireAdmin, updateOrderStatus);

export default router;
