// models/WalletTransaction.ts
import { Schema, model, models, Document, Types } from 'mongoose';

export interface IWalletTransaction extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  reference: string;
  amount: number;
  status: 'pending' | 'success' | 'failed' | 'completed';
  type: 'fund' | 'withdrawal';
  channel?: 'card' | 'virtual_account' | 'bank_transfer' | 'refund' | 'system';
  currency?: string;
  narration?: string;
  verified?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const walletTransactionSchema = new Schema<IWalletTransaction>(
  {
    user: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true 
    },
    reference: { 
      type: String, 
      required: true, 
      unique: true,
      index: true 
    },
    amount: { 
      type: Number, 
      required: true,
      min: [0, 'Amount cannot be negative']
    },
    status: { 
      type: String, 
      enum: ['pending', 'success', 'failed', 'completed'],
      required: true,
      default: 'pending',
      index: true
    },
    type: { 
      type: String, 
      enum: ['fund', 'withdrawal'], 
      required: true,
      index: true
    },
    channel: { 
      type: String,
      enum: ['card', 'virtual_account', 'bank_transfer', 'refund', 'system'],
      default: 'card'
    },
    currency: { 
      type: String, 
      default: 'NGN' 
    },
    narration: { 
      type: String,
      trim: true
    },
    verified: { 
      type: Boolean, 
      default: false,
      index: true
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ✅ Indexes for better performance
walletTransactionSchema.index({ user: 1, createdAt: -1 });
walletTransactionSchema.index({ user: 1, type: 1, status: 1 });

// ✅ Virtual for formatted amount
walletTransactionSchema.virtual('formattedAmount').get(function(this: IWalletTransaction) {
  return `₦${this.amount.toLocaleString()}`;
});

// ✅ Export model
export const WalletTransaction = models.WalletTransaction || model<IWalletTransaction>('WalletTransaction', walletTransactionSchema);