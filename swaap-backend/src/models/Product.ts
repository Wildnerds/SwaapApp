import mongoose, { Schema, model, models, Document, Types } from 'mongoose';

export interface IProduct extends Document {
  title: string;
  price: number;
  category: string;
  type: string; // e.g. 'swap', 'sell', or 'both'
  condition: string; // e.g. 'New', 'Like New', 'Good', 'Fair', 'Poor'
  images: string[];
  description: string;
  createdAt: Date;
  updatedAt: Date;
  user: Types.ObjectId;

  // New fields
  isSold: boolean;
  isInEscrow: boolean;
  buyer?: Types.ObjectId;
  paymentReference?: string;
  paidAt?: Date;

  // Review-related fields
  averageRating?: number;
  reviewCount?: number;
}

const productSchema = new Schema<IProduct>(
  {
    title: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    type: { type: String, required: true }, // 'swap', 'sell', 'both'
    condition: { type: String, required: true, enum: ['New', 'Like New', 'Good', 'Fair', 'Poor'], default: 'Good' },

    images: { type: [String], required: true },
    description: { type: String },

    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // 🔒 Escrow-related fields
    isSold: { type: Boolean, default: false }, // marked true after purchase is complete
    isInEscrow: { type: Boolean, default: false }, // true after payment but before confirmation
    buyer: { type: Schema.Types.ObjectId, ref: 'User' }, // who paid
    paymentReference: { type: String }, // from Paystack webhook
    paidAt: { type: Date }, // timestamp of payment

    // 📝 Review-related fields
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
  }
);

const Product = models.Product || model<IProduct>('Product', productSchema);
export default Product;
