import mongoose, { Schema, Document } from 'mongoose';

export interface IIdempotencyRecordDocument extends Document {
  key: string;
  userId?: string;
  method: string;
  path: string;
  responseStatus: number;
  responseBody: any;
  createdAt: Date;
}

const IdempotencyRecordSchema = new Schema<IIdempotencyRecordDocument>(
  {
    key: { type: String, required: true, unique: true, index: true },
    userId: { type: String, index: true },
    method: { type: String, required: true },
    path: { type: String, required: true },
    responseStatus: { type: Number, required: true },
    responseBody: { type: Schema.Types.Mixed, required: true },
    createdAt: { type: Date, default: Date.now, expires: 86400 } // TTL 24 hours
  }
);

export const IdempotencyRecord = mongoose.model<IIdempotencyRecordDocument>(
  'IdempotencyRecord',
  IdempotencyRecordSchema
);
