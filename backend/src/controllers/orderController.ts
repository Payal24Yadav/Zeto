import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { Order } from '../models/Order';
import { Cart } from '../models/Cart';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { InventoryService } from '../services/inventoryService';
import { calculateOrderPricing } from '../utils/pricing';
import { validateTransition } from '../utils/stateMachine';
import { IOrderItem, OrderStatus } from '../types';
import { BackgroundWorker } from '../services/backgroundWorker';

export const createOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized.' });
      return;
    }

    const { items: inputItems, shippingAddress } = req.body;
    const idempotencyKey = req.header('Idempotency-Key') || req.body.idempotencyKey;

    if (!shippingAddress || !shippingAddress.street || !shippingAddress.city) {
      res.status(400).json({ success: false, error: 'Valid shipping address is required.' });
      return;
    }

    // Determine order items: from request payload or user's persistent cart
    let requestedItems: { productId: string; variantSku: string; quantity: number }[] = [];

    if (Array.isArray(inputItems) && inputItems.length > 0) {
      requestedItems = inputItems;
    } else {
      const cart = await Cart.findOne({ userId });
      if (!cart || cart.items.length === 0) {
        res.status(400).json({ success: false, error: 'Your cart is empty. Please add items before checkout.' });
        return;
      }
      requestedItems = cart.items.map((i) => ({
        productId: i.productId.toString(),
        variantSku: i.variantSku,
        quantity: i.quantity
      }));
    }

    // 1. ATOMIC INVENTORY RESERVATION (Guarantees zero overselling & rollbacks on failure)
    await InventoryService.reserveStock(requestedItems);

    // 2. FETCH TRUSTED SERVER PRICES & CONSTRUCT ORDER ITEMS (Never trust frontend prices)
    const orderItems: IOrderItem[] = [];
    for (const reqItem of requestedItems) {
      const product = await Product.findById(reqItem.productId);
      if (!product) {
        // Rollback already reserved stock
        await InventoryService.releaseStock(requestedItems);
        res.status(404).json({ success: false, error: `Product not found: ${reqItem.productId}` });
        return;
      }

      const variant = product.variants.find((v) => v.sku === reqItem.variantSku);
      const unitPrice = variant ? variant.price : product.basePrice;
      const discountPercent = variant ? variant.discountPercent : product.discountPercent;
      const itemTotal = Math.round(unitPrice * (1 - discountPercent / 100) * reqItem.quantity * 100) / 100;

      orderItems.push({
        productId: product._id.toString(),
        variantSku: reqItem.variantSku,
        name: product.name,
        size: variant?.size || 'Standard',
        color: variant?.color || 'Standard',
        quantity: reqItem.quantity,
        unitPrice,
        discountPercent,
        itemTotal
      });
    }

    // 3. BACKEND PRICING CALCULATION: Subtotal - Discount + Tax + Shipping = Final Total
    const pricing = calculateOrderPricing(orderItems);

    // 4. CREATE ORDER WITH PENDING STATE & 15-MINUTE RESERVATION WINDOW
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const orderNumber = `ORD-${dateStr}-${randomSuffix}`;
    const reservationExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const order = await Order.create({
      orderNumber,
      userId,
      items: orderItems,
      pricing,
      shippingAddress,
      status: 'PENDING',
      statusHistory: [
        {
          status: 'PENDING',
          timestamp: new Date(),
          note: 'Order created and inventory reserved for 15 minutes.'
        }
      ],
      reservationExpiresAt,
      idempotencyKey
    });

    // Clear cart after checkout
    await Cart.findOneAndUpdate({ userId }, { items: [] });

    // Simulate order confirmation email dispatch
    if (req.user?.email) {
      BackgroundWorker.sendOrderConfirmationEmail(order._id.toString(), req.user.email);
    }

    res.status(201).json({
      success: true,
      data: order
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message || 'Order creation failed.' });
  }
};

export const getOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    const { search, status, page = 1, limit = 50 } = req.query;

    const query: any = {};

    if (!isAdmin) {
      query.userId = userId;
    }

    if (status && typeof status === 'string' && status !== 'ALL') {
      query.status = status;
    }

    if (search && typeof search === 'string') {
      const searchRegex = new RegExp(search.trim(), 'i');
      const orConditions: any[] = [
        { orderNumber: searchRegex },
        { 'items.name': searchRegex },
        { 'items.variantSku': searchRegex },
        { 'shippingAddress.city': searchRegex },
        { 'shippingAddress.street': searchRegex }
      ];

      if (isAdmin) {
        const matchingUsers = await User.find({
          $or: [{ name: searchRegex }, { email: searchRegex }]
        }).select('_id');
        if (matchingUsers.length > 0) {
          orConditions.push({ userId: { $in: matchingUsers.map((u) => u._id) } });
        }
      }

      query.$or = orConditions;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const orders = await Order.find(query)
      .populate('userId', 'name email')
      .populate('paymentId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      data: orders
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Error fetching orders.' });
  }
};

export const getOrderById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';

    const order = await Order.findById(id).populate('userId', 'name email').populate('paymentId');

    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found.' });
      return;
    }

    // Regular users can only access their own orders
    const orderUserId = (order.userId as any)?._id ? (order.userId as any)._id.toString() : order.userId.toString();
    if (!isAdmin && orderUserId !== userId) {
      res.status(403).json({ success: false, error: 'Access denied. You can only view your own orders.' });
      return;
    }

    res.status(200).json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Error fetching order.' });
  }
};

export const cancelOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';

    const order = await Order.findById(id);
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found.' });
      return;
    }

    if (!isAdmin && order.userId.toString() !== userId) {
      res.status(403).json({ success: false, error: 'Access denied.' });
      return;
    }

    // STATE MACHINE VALIDATION GUARD
    try {
      validateTransition(order.status, 'CANCELLED');
    } catch (transitionErr: any) {
      res.status(400).json({ success: false, error: transitionErr.message });
      return;
    }

    // Release reserved inventory
    await InventoryService.releaseStock(order.items);

    order.status = 'CANCELLED';
    order.statusHistory.push({
      status: 'CANCELLED',
      timestamp: new Date(),
      note: `Order cancelled by ${isAdmin ? 'Admin' : 'Customer'}. Inventory restored.`
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully and inventory released.',
      data: order
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Error cancelling order.' });
  }
};

export const updateOrderStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, note } = req.body as { status: OrderStatus; note?: string };

    const order = await Order.findById(id);
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found.' });
      return;
    }

    // STATE MACHINE VALIDATION GUARD
    try {
      validateTransition(order.status, status);
    } catch (transitionErr: any) {
      res.status(400).json({ success: false, error: transitionErr.message });
      return;
    }

    // If transitioning to CANCELLED or REFUNDED, release inventory
    if (status === 'CANCELLED' || status === 'REFUNDED') {
      await InventoryService.releaseStock(order.items);
    }

    order.status = status;
    order.statusHistory.push({
      status,
      timestamp: new Date(),
      note: note || `Order status updated to ${status}`
    });

    await order.save();

    res.status(200).json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Error updating order status.' });
  }
};
