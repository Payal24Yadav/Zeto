import { Router } from 'express';
import {
  getCart,
  addItemToCart,
  updateCartItem,
  removeCartItem
} from '../controllers/cartController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', getCart);
router.post('/items', addItemToCart);
router.patch('/items/:id', updateCartItem);
router.delete('/items/:id', removeCartItem);

export default router;
