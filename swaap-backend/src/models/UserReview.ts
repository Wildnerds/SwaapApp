import { Schema, model, Document, Types } from 'mongoose';

export interface IUserReview extends Document {
  _id: Types.ObjectId;
  reviewer: Types.ObjectId; // User who left the review
  reviewedUser: Types.ObjectId; // User being reviewed
  rating: number; // 1-5 stars
  comment: string;
  reviewType: 'seller' | 'buyer' | 'swapper'; // Context of the interaction
  transactionReference?: Types.ObjectId; // Reference to swap, sale, etc.
  helpful: number; // count of helpful votes
  helpfulVotes: Types.ObjectId[]; // users who voted this review helpful
  verified: boolean; // verified transaction
  createdAt: Date;
  updatedAt: Date;
}

const userReviewSchema = new Schema<IUserReview>({
  reviewer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  reviewedUser: {
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
  reviewType: {
    type: String,
    enum: ['seller', 'buyer', 'swapper'],
    required: true,
  },
  transactionReference: {
    type: Schema.Types.ObjectId,
    refPath: 'transactionModel',
  },
  transactionModel: {
    type: String,
    enum: ['Swap', 'Order', 'Product'],
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
    default: false,
  },
}, {
  timestamps: true,
});

// Compound indexes for better performance
userReviewSchema.index({ reviewedUser: 1, createdAt: -1 });
userReviewSchema.index({ reviewer: 1, reviewedUser: 1 }, { unique: true }); // One review per user pair
userReviewSchema.index({ reviewType: 1, reviewedUser: 1 });

export default model<IUserReview>('UserReview', userReviewSchema);