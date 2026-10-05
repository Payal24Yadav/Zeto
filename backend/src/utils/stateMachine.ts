import { OrderStatus } from '../types';

export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PAYMENT_PROCESSING', 'CANCELLED'],
  PAYMENT_PROCESSING: ['PAID', 'PAYMENT_FAILED', 'CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED', 'REFUNDED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['REFUNDED'],
  PAYMENT_FAILED: ['PAYMENT_PROCESSING', 'CANCELLED'],
  CANCELLED: [],
  REFUNDED: []
};

export function canTransition(currentStatus: OrderStatus, targetStatus: OrderStatus): boolean {
  if (currentStatus === targetStatus) {
    return true; // Idempotent no-op
  }
  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(targetStatus) : false;
}

export function validateTransition(currentStatus: OrderStatus, targetStatus: OrderStatus): void {
  if (!canTransition(currentStatus, targetStatus)) {
    throw new Error(
      `Invalid order status transition from '${currentStatus}' to '${targetStatus}'. Allowed transitions: ${
        ALLOWED_TRANSITIONS[currentStatus]?.join(', ') || 'none'
      }`
    );
  }
}
