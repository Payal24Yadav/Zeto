import mongoose, { Schema, Document } from 'mongoose';
import { ICart, ICartItem } from '../types';

export interface ICartDocument extends Omit<ICart, '_id'>, Document {}

const CartItemSchema = new Schema<ICartItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantSku: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 }
  },
  { _id: false }
);

const CartSchema = new Schema<ICartDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    items: [CartItemSchema]
  },
  { timestamps: true }
);

export const Cart = mongoose.model<ICartDocument>('Cart', CartSchema);
