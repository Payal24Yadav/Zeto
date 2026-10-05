import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { Order } from '../models/Order';
import { Payment } from '../models/Payment';
import { InventoryService } from '../services/inventoryService';
import { validateTransition } from '../utils/stateMachine';
import { PaymentStatus, OrderStatus } from '../types';

export const processPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { orderId, outcome = 'SUCCESS', idempotencyKey } = req.body as {
      orderId: string;
      outcome: PaymentStatus;
      idempotencyKey?: string;
    };

    if (!orderId) {
      res.status(400).json({ success: false, error: 'Order ID is required.' });
      return;
    }

    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found.' });
      return;
    }

    // Check if order is already paid
    if (order.status === 'PAID') {
      res.status(400).json({ success: false, error: 'Order is already marked as PAID.' });
      return;
    }

    // Check if order is in a payable state
    if (order.status !== 'PENDING' && order.status !== 'PAYMENT_PROCESSING' && order.status !== 'PAYMENT_FAILED') {
      res.status(400).json({
        success: false,
        error: `Order cannot be paid in current status '${order.status}'.`
      });
      return;
    }

    // Advance to PAYMENT_PROCESSING
    if (order.status === 'PENDING' || order.status === 'PAYMENT_FAILED') {
      validateTransition(order.status, 'PAYMENT_PROCESSING');
      order.status = 'PAYMENT_PROCESSING';
      order.statusHistory.push({
        status: 'PAYMENT_PROCESSING',
        timestamp: new Date(),
        note: `Mock payment gateway processing initialized with outcome simulation: ${outcome}`
      });
      await order.save();
    }

    const transactionId = `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    let targetOrderStatus: OrderStatus = order.status;
    let paymentStatus: PaymentStatus = 'PENDING';

    if (outcome === 'SUCCESS') {
      paymentStatus = 'SUCCESS';
      targetOrderStatus = 'PAID';
      validateTransition(order.status, 'PAID');
    } else if (outcome === 'FAILED') {
      paymentStatus = 'FAILED';
      targetOrderStatus = 'PAYMENT_FAILED';
      validateTransition(order.status, 'PAYMENT_FAILED');
      // Release inventory on payment failure
      await InventoryService.releaseStock(order.items);
    } else if (outcome === 'TIMEOUT') {
      paymentStatus = 'TIMEOUT';
      targetOrderStatus = 'CANCELLED';
      validateTransition(order.status, 'CANCELLED');
      // Release inventory on payment timeout
      await InventoryService.releaseStock(order.items);
    }

    const payment = await Payment.create({
      orderId: order._id,
      transactionId,
      amount: order.pricing.finalTotal,
      currency: 'USD',
      status: paymentStatus,
      idempotencyKey,
      webhookDelivered: false
    });

    order.status = targetOrderStatus;
    order.paymentId = payment._id as any;
    order.statusHistory.push({
      status: targetOrderStatus,
      timestamp: new Date(),
      note: `Payment simulation outcome: ${outcome}. Transaction ID: ${transactionId}`
    });
    await order.save();

    res.status(200).json({
      success: true,
      message: `Payment simulation completed with status: ${outcome}`,
      data: {
        payment,
        order
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Payment processing failed.' });
  }
};
