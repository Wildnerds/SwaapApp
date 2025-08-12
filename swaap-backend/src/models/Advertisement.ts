import mongoose, { Schema, model, models, Document, Types } from 'mongoose';

export interface IAdvertisement extends Document {
  title: string;
  subtitle?: string;
  image: string;
  images?: string[]; // Array of image URLs for multiple images
  type: 'admin' | 'user_product' | 'external'; // Different ad types
  
  // For admin ads (external promotions)
  externalUrl?: string;
  
  // For user product ads
  productId?: Types.ObjectId;
  userId?: Types.ObjectId;
  
  // Ad management
  status: 'active' | 'inactive' | 'expired' | 'pending';
  priority: number; // Higher number = higher priority in carousel
  
  // Scheduling
  startDate: Date;
  endDate: Date;
  
  // Analytics
  impressions: number;
  clicks: number;
  
  // Payment info (for user ads)
  paymentAmount?: number;
  paymentReference?: string;
  paymentStatus?: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod?: 'wallet' | 'paystack';
  paidAt?: Date;
  
  // Admin fields
  createdBy?: Types.ObjectId; // Admin who created it
  approvedBy?: Types.ObjectId; // Admin who approved it
  approvedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const advertisementSchema = new Schema<IAdvertisement>(
  {
    title: { 
      type: String, 
      required: true, 
      maxlength: 100 
    },
    subtitle: { 
      type: String, 
      maxlength: 200 
    },
    image: { 
      type: String, 
      required: true 
    },
    images: [{ 
      type: String 
    }],
    type: { 
      type: String, 
      required: true, 
      enum: ['admin', 'user_product', 'external'] 
    },
    
    // External ad fields
    externalUrl: { 
      type: String,
      validate: {
        validator: function(this: IAdvertisement, v: string) {
          // Only required for external ads
          return this.type !== 'external' || (v && v.length > 0);
        },
        message: 'External URL is required for external ads'
      }
    },
    
    // Product ad fields
    productId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Product',
      validate: {
        validator: function(this: IAdvertisement, v: Types.ObjectId) {
          // Only required for user product ads
          return this.type !== 'user_product' || v;
        },
        message: 'Product ID is required for user product ads'
      }
    },
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User',
      validate: {
        validator: function(this: IAdvertisement, v: Types.ObjectId) {
          // Only required for user product ads
          return this.type !== 'user_product' || v;
        },
        message: 'User ID is required for user product ads'
      }
    },
    
    // Management
    status: { 
      type: String, 
      required: true, 
      enum: ['active', 'inactive', 'expired', 'pending'],
      default: 'pending'
    },
    priority: { 
      type: Number, 
      required: true, 
      default: 1,
      min: 1,
      max: 10
    },
    
    // Scheduling
    startDate: { 
      type: Date, 
      required: true,
      default: Date.now
    },
    endDate: { 
      type: Date, 
      required: true,
      validate: {
        validator: function(this: IAdvertisement, v: Date) {
          return v > this.startDate;
        },
        message: 'End date must be after start date'
      }
    },
    
    // Analytics
    impressions: { 
      type: Number, 
      default: 0, 
      min: 0 
    },
    clicks: { 
      type: Number, 
      default: 0, 
      min: 0 
    },
    
    // Payment (for user ads)
    paymentAmount: { 
      type: Number, 
      min: 0,
      validate: {
        validator: function(this: IAdvertisement, v: number) {
          // Required for user product ads
          return this.type !== 'user_product' || (v && v > 0);
        },
        message: 'Payment amount is required for user product ads'
      }
    },
    paymentReference: { 
      type: String 
    },
    paymentStatus: { 
      type: String, 
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    paymentMethod: { 
      type: String, 
      enum: ['wallet', 'paystack']
    },
    paidAt: { 
      type: Date 
    },
    
    // Admin fields
    createdBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'User' 
    },
    approvedBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'User' 
    },
    approvedAt: { 
      type: Date 
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
advertisementSchema.index({ status: 1, priority: -1, startDate: 1 });
advertisementSchema.index({ type: 1, status: 1 });
advertisementSchema.index({ userId: 1, status: 1 });
advertisementSchema.index({ productId: 1 });
advertisementSchema.index({ endDate: 1 }); // For cleanup of expired ads

// Static method to get active ads for carousel
advertisementSchema.statics.getActiveAds = async function() {
  const now = new Date();
  return this.find({
    status: 'active',
    startDate: { $lte: now },
    endDate: { $gte: now }
  })
  .populate('productId', 'title price images')
  .populate('userId', 'fullName')
  .sort({ priority: -1, createdAt: -1 })
  .limit(10); // Limit to 10 active ads
};

// Method to increment impressions
advertisementSchema.methods.recordImpression = function() {
  this.impressions += 1;
  return this.save();
};

// Method to increment clicks
advertisementSchema.methods.recordClick = function() {
  this.clicks += 1;
  return this.save();
};

// Method to check if ad is currently active
advertisementSchema.methods.isActive = function() {
  const now = new Date();
  return this.status === 'active' && 
         this.startDate <= now && 
         this.endDate >= now;
};

const Advertisement = models.Advertisement || model<IAdvertisement>('Advertisement', advertisementSchema);
export default Advertisement;