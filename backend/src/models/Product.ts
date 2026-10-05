import mongoose, { Schema, Document } from 'mongoose';
import { IProduct, IVariant } from '../types';

export interface IProductDocument extends Omit<IProduct, '_id'>, Document {}

const VariantSchema = new Schema<IVariant>(
  {
    sku: { type: String, required: true },
    size: { type: String, required: true },
    color: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    stock: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const ProductSchema = new Schema<IProductDocument>(
  {
    name: { type: String, required: true, trim: true, index: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    category: { type: String, required: true, index: true },
    images: [{ type: String }],
    basePrice: { type: Number, required: true, min: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    sku: { type: String, required: true, unique: true },
    stock: { type: Number, required: true, min: 0, default: 0 },
    variants: [VariantSchema],
    lowStockThreshold: { type: Number, default: 5 }
  },
  { timestamps: true }
);

// Compound text index for powerful product search
ProductSchema.index({ name: 'text', description: 'text', category: 'text' });
ProductSchema.index({ 'variants.sku': 1 });

export const Product = mongoose.model<IProductDocument>('Product', ProductSchema);
