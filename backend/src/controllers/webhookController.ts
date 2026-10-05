import { Request, Response } from 'express';
import { Payment } from '../models/Payment';
import { Order } from '../models/Order';
import { InventoryService } from '../services/inventoryService';
import { canTransition } from '../utils/stateMachine';

export const handlePaymentWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const { event, transactionId, orderId } = req.body;

    if (!transactionId && !orderId) {
      res.status(400).json({ success: false, error: 'Transaction ID or Order ID is required.' });
      return;
    }

    // Lookup payment record
    const query: any = {};
    if (transactionId) query.transactionId = transactionId;
    if (orderId) query.orderId = orderId;

    let payment = await Payment.findOne(query);

    // IDEMPOTENCY CHECK: If already received and handled, return 200 without duplicate side-effects
    if (payment && payment.webhookDelivered) {
      res.status(200).json({
        success: true,
        idempotent: true,
        message: `Webhook already processed for transaction ${payment.transactionId}. No duplicate action taken.`,
        data: {
          transactionId: payment.transactionId,
          orderId: payment.orderId,
          status: payment.status
        }
      });
      return;
    }

    const order = await Order.findById(payment ? payment.orderId : orderId);
    if (!order) {
      res.status(404).json({ success: false, error: 'Associated order not found.' });
      return;
    }

    if (!payment) {
      // Create new payment record if webhook arrives first
      payment = new Payment({
        orderId: order._id,
        transactionId: transactionId || `TXN-WH-${Date.now()}`,
        amount: order.pricing.finalTotal,
        currency: 'USD',
        status: event === 'payment.success' ? 'SUCCESS' : 'FAILED',
        webhookDelivered: true,
        webhookDeliveredAt: new Date()
      });
    } else {
      payment.webhookDelivered = true;
      payment.webhookDeliveredAt = new Date();
    }

    if (event === 'payment.success') {
      payment.status = 'SUCCESS';
      if (canTransition(order.status, 'PAID')) {
        order.status = 'PAID';
        order.statusHistory.push({
          status: 'PAID',
          timestamp: new Date(),
          note: `Payment confirmed via webhook [${transactionId || payment.transactionId}].`
        });
      }
    } else if (event === 'payment.failed') {
      payment.status = 'FAILED';
      if (canTransition(order.status, 'PAYMENT_FAILED')) {
        order.status = 'PAYMENT_FAILED';
        order.statusHistory.push({
          status: 'PAYMENT_FAILED',
          timestamp: new Date(),
          note: `Payment failure reported by webhook [${transactionId || payment.transactionId}].`
        });
        // Release inventory back
        await InventoryService.releaseStock(order.items);
      }
    }

    await payment.save();
    order.paymentId = payment._id as any;
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Payment webhook processed successfully.',
      data: {
        transactionId: payment.transactionId,
        orderId: order._id,
        orderStatus: order.status,
        paymentStatus: payment.status
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Webhook processing failed.' });
  }
};
