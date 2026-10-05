import { IOrderItem, IOrderPricing } from '../types';

export const SHIPPING_THRESHOLD = 100;
export const STANDARD_SHIPPING_FEE = 15;
export const TAX_RATE = 0.10; // 10%

export function calculateOrderPricing(items: IOrderItem[]): IOrderPricing {
  let subtotal = 0;
  let discountTotal = 0;

  for (const item of items) {
    const rawTotal = item.unitPrice * item.quantity;
    const discountAmount = rawTotal * (item.discountPercent / 100);
    subtotal += rawTotal;
    discountTotal += discountAmount;
  }

  // Round values
  subtotal = Math.round(subtotal * 100) / 100;
  discountTotal = Math.round(discountTotal * 100) / 100;

  const discountedSubtotal = Math.max(0, subtotal - discountTotal);

  // Shipping calculation: Free if discountedSubtotal >= $100, otherwise $15
  const shipping = items.length === 0 ? 0 : discountedSubtotal >= SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;

  // Tax on discounted subtotal
  const tax = Math.round(discountedSubtotal * TAX_RATE * 100) / 100;

  const finalTotal = Math.round((discountedSubtotal + tax + shipping) * 100) / 100;

  return {
    subtotal,
    discountTotal,
    tax,
    shipping,
    finalTotal
  };
}
