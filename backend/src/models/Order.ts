import mongoose, { Schema, Document } from 'mongoose';
import { IOrder, IOrderItem, IOrderPricing, IOrderStatusHistory, OrderStatus } from '../types';

export interface IOrderDocument extends Omit<IOrder, '_id'>, Document {}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantSku: { type: String, required: true },
    name: { type: String, required: true },
    size: { type: String, required: true },
    color: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true },
    discountPercent: { type: Number, default: 0 },
    itemTotal: { type: Number, required: true }
  },
  { _id: false }
);

const OrderPricingSchema = new Schema<IOrderPricing>(
  {
    subtotal: { type: Number, required: true },
    discountTotal: { type: Number, required: true },
    tax: { type: Number, required: true },
    shipping: { type: Number, required: true },
    finalTotal: { type: Number, required: true }
  },
  { _id: false }
);

const StatusHistorySchema = new Schema<IOrderStatusHistory>(
  {
    status: {
      type: String,
      enum: [
        'PENDING',
        'PAYMENT_PROCESSING',
        'PAID',
        'PROCESSING',
        'SHIPPED',
        'DELIVERED',
        'PAYMENT_FAILED',
        'CANCELLED',
        'REFUNDED'
      ],
      required: true
    },
    timestamp: { type: Date, default: Date.now },
    note: { type: String }
  },
  { _id: false }
);

const AddressSchema = new Schema(
  {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true }
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrderDocument>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: [OrderItemSchema],
    pricing: { type: OrderPricingSchema, required: true },
    shippingAddress: { type: AddressSchema, required: true },
    status: {
      type: String,
      enum: [
        'PENDING',
        'PAYMENT_PROCESSING',
        'PAID',
        'PROCESSING',
        'SHIPPED',
        'DELIVERED',
        'PAYMENT_FAILED',
        'CANCELLED',
        'REFUNDED'
      ],
      default: 'PENDING',
      index: true
    },
    statusHistory: [StatusHistorySchema],
    reservationExpiresAt: { type: Date, required: true, index: true },
    idempotencyKey: { type: String, sparse: true, index: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' }
  },
  { timestamps: true }
);

OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ orderNumber: 1, status: 1 });

export const Order = mongoose.model<IOrderDocument>('Order', OrderSchema);
