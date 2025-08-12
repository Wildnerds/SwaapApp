import mongoose, { Document, Schema } from 'mongoose';

export interface ITransaction extends Document {
  user: mongoose.Types.ObjectId;
  type: 'fund' | 'purchase';
  method: 'wallet' | 'card' | 'hybrid' | 'mobile_money';
  amount: number;
  reference: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
}

const TransactionSchema: Schema<ITransaction> = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['fund', 'purchase'], required: true },
  method: {
    type: String,
    enum: ['wallet', 'card', 'hybrid', 'mobile_money'],
    required: true,
  },
  amount: { type: Number, required: true },
  reference: { type: String, required: true, unique: true },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);
