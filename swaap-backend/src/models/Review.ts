import { Schema, model, Document, Types } from 'mongoose';

export interface IReview extends Document {
  _id: Types.ObjectId;
  product: Types.ObjectId;
  reviewer: Types.ObjectId;
  seller: Types.ObjectId;
  rating: number; // 1-5 stars
  comment: string;
  helpful: number; // count of helpful votes
  helpfulVotes: Types.ObjectId[]; // users who voted this review helpful
  verified: boolean; // verified purchase
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true,
  },
  reviewer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  seller: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    minlength: 10,
    maxlength: 500,
  },
  helpful: {
    type: Number,
    default: 0,
  },
  helpfulVotes: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  verified: {
    type: Boolean,
    default: false, // Set to true if user actually purchased/swapped
  },
}, {
  timestamps: true,
});

// Compound indexes for better performance
reviewSchema.index({ product: 1, createdAt: -1 });
reviewSchema.index({ reviewer: 1, product: 1 }, { unique: true }); // One review per user per product
reviewSchema.index({ seller: 1, createdAt: -1 });

// Virtual for reviewer name (populated)
reviewSchema.virtual('reviewerName').get(function(this: IReview) {
  return (this.reviewer as any)?.fullName || (this.reviewer as any)?.email?.split('@')[0] || 'Anonymous';
});

// Ensure virtual fields are serialized
reviewSchema.set('toJSON', { virtuals: true });

export default model<IReview>('Review', reviewSchema);