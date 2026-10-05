import mongoose, { Schema, Document } from 'mongoose';
import { IPayment, PaymentStatus } from '../types';

export interface IPaymentDocument extends Omit<IPayment, '_id'>, Document {}

const PaymentSchema = new Schema<IPaymentDocument>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    transactionId: { type: String, required: true, unique: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED', 'TIMEOUT'],
      default: 'PENDING',
      index: true
    },
    idempotencyKey: { type: String, sparse: true, index: true },
    webhookDelivered: { type: Boolean, default: false },
    webhookDeliveredAt: { type: Date }
  },
  { timestamps: true }
);

export const Payment = mongoose.model<IPaymentDocument>('Payment', PaymentSchema);
