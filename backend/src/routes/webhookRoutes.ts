import { Router } from 'express';
import { handlePaymentWebhook } from '../controllers/webhookController';

const router = Router();

router.post('/payment', handlePaymentWebhook);

export default router;
