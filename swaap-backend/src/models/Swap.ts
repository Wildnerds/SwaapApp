// models/swap.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ISwap extends Document {
  fromUser: mongoose.Types.ObjectId;
  toUser: mongoose.Types.ObjectId;
  offeringProduct: mongoose.Types.ObjectId;
  requestedProduct: mongoose.Types.ObjectId;
  extraPayment?: number;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  chatThreadId?: string;
  notified?: boolean;
  viewedBy: mongoose.Types.ObjectId[];
  rejectedBy?: mongoose.Types.ObjectId;
  paymentStatus?: 'pending' | 'completed' | 'failed';
  paymentReference?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const swapSchema = new Schema<ISwap>(
  {
    fromUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    toUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    offeringProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    requestedProduct: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    extraPayment: {
      type: Number,
      default: 0,
    },
    message: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'expired'],
      default: 'pending',
    },
    chatThreadId: {
      type: String,
      default: '',
    },
    notified: {
      type: Boolean,
      default: false,
    },
    viewedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    paymentReference: {
      type: String,
    },
  },
  { timestamps: true }
);

const Swap = mongoose.models.Swap || mongoose.model<ISwap>('Swap', swapSchema);
export default Swap;
