import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from '../types';

export interface IUserDocument extends Omit<IUser, '_id'>, Document {}

const AddressSchema = new Schema(
  {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true, default: 'USA' },
    isDefault: { type: Boolean, default: false }
  },
  { _id: false }
);

const UserSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['USER', 'ADMIN', 'SUPER_ADMIN'], default: 'USER', index: true },
    addresses: [AddressSchema]
  },
  { timestamps: true }
);

export const User = mongoose.model<IUserDocument>('User', UserSchema);
