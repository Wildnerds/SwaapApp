// src/models/IdentityVerification.ts - UPDATED for Enhanced System
import mongoose, { Schema, Document } from 'mongoose';

export interface IIdentityVerification extends Document {
  uploadId: string;
  userId: mongoose.Types.ObjectId;
  documentType: 'nin' | 'drivers_license' | 'passport' | 'voters_card' | 'international_passport';
  documentNumber?: string;
  frontImagePath: string;
  backImagePath?: string;
  status: 'pending_review' | 'uploaded' | 'processing' | 'verified' | 'rejected' | 'expired';
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewComments?: string;
  
  // 🆕 Enhanced metadata
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    deviceInfo?: {
      platform?: string;
      browser?: string;
      isMobile?: boolean;
    };
    fileInfo?: {
      frontImage?: {
        originalName: string;
        size: number;
        mimetype: string;
        dimensions?: { width: number; height: number };
      };
      backImage?: {
        originalName: string;
        size: number;
        mimetype: string;
        dimensions?: { width: number; height: number };
      };
    };
    qualityChecks?: {
      imageQuality?: 'poor' | 'acceptable' | 'good' | 'excellent';
      readability?: 'poor' | 'acceptable' | 'good' | 'excellent';
      authenticity?: 'suspicious' | 'questionable' | 'likely_authentic' | 'authentic';
      completeness?: boolean;
    };
  };
  
  // 🆕 Processing information
  processingInfo?: {
    ocrAttempted?: boolean;
    ocrResults?: {
      extractedText?: string;
      confidence?: number;
      detectedFields?: {
        name?: string;
        dateOfBirth?: string;
        documentNumber?: string;
        expiryDate?: string;
        issueDate?: string;
      };
    };
    flaggedReasons?: string[];
    requiresManualReview?: boolean;
  };
  
  // 🆕 Admin workflow
  adminNotes?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  estimatedReviewTime?: Date;
  reviewStartedAt?: Date;
  reviewDuration?: number; // in seconds
}

const identityVerificationSchema = new Schema<IIdentityVerification>({
  uploadId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  documentType: { 
    type: String, 
    required: true, 
    enum: ['nin', 'drivers_license', 'passport', 'voters_card', 'international_passport'] 
  },
  documentNumber: { 
    type: String,
    trim: true,
    sparse: true // Allow multiple documents without document numbers
  },
  frontImagePath: { 
    type: String, 
    required: true 
  },
  backImagePath: { 
    type: String 
  },
  status: { 
    type: String, 
    default: 'pending_review',
    enum: ['pending_review', 'uploaded', 'processing', 'verified', 'rejected', 'expired'],
    index: true 
  },
  submittedAt: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  reviewedAt: { 
    type: Date 
  },
  reviewedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  },
  reviewComments: { 
    type: String 
  },
  
  // 🆕 Enhanced metadata
  metadata: {
    userAgent: String,
    ipAddress: String,
    deviceInfo: {
      platform: String,
      browser: String,
      isMobile: Boolean
    },
    fileInfo: {
      frontImage: {
        originalName: String,
        size: Number,
        mimetype: String,
        dimensions: {
          width: Number,
          height: Number
        }
      },
      backImage: {
        originalName: String,
        size: Number,
        mimetype: String,
        dimensions: {
          width: Number,
          height: Number
        }
      }
    },
    qualityChecks: {
      imageQuality: { 
        type: String, 
        enum: ['poor', 'acceptable', 'good', 'excellent'] 
      },
      readability: { 
        type: String, 
        enum: ['poor', 'acceptable', 'good', 'excellent'] 
      },
      authenticity: { 
        type: String, 
        enum: ['suspicious', 'questionable', 'likely_authentic', 'authentic'] 
      },
      completeness: Boolean
    }
  },
  
  // 🆕 Processing information
  processingInfo: {
    ocrAttempted: { type: Boolean, default: false },
    ocrResults: {
      extractedText: String,
      confidence: { type: Number, min: 0, max: 100 },
      detectedFields: {
        name: String,
        dateOfBirth: String,
        documentNumber: String,
        expiryDate: String,
        issueDate: String
      }
    },
    flaggedReasons: [String],
    requiresManualReview: { type: Boolean, default: true }
  },
  
  // 🆕 Admin workflow
  adminNotes: String,
  priority: { 
    type: String, 
    enum: ['low', 'normal', 'high', 'urgent'], 
    default: 'normal',
    index: true 
  },
  estimatedReviewTime: Date,
  reviewStartedAt: Date,
  reviewDuration: Number // in seconds
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // Don't expose sensitive file paths in JSON responses
      delete ret.frontImagePath;
      delete ret.backImagePath;
      delete ret.metadata?.ipAddress;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// 🆕 Enhanced indexes for performance
identityVerificationSchema.index({ userId: 1, status: 1 });
identityVerificationSchema.index({ submittedAt: -1 });
identityVerificationSchema.index({ reviewedBy: 1, reviewedAt: -1 });
identityVerificationSchema.index({ status: 1, priority: -1, submittedAt: 1 }); // Admin queue optimization
identityVerificationSchema.index({ documentType: 1, status: 1 });
identityVerificationSchema.index({ 'processingInfo.requiresManualReview': 1 });

// 🆕 Virtual for processing time
identityVerificationSchema.virtual('processingTime').get(function(this: IIdentityVerification) {
  if (this.reviewedAt && this.submittedAt) {
    return Math.round((this.reviewedAt.getTime() - this.submittedAt.getTime()) / 1000 / 60); // minutes
  }
  return null;
});

// 🆕 Virtual for review time
identityVerificationSchema.virtual('actualReviewTime').get(function(this: IIdentityVerification) {
  if (this.reviewDuration) {
    return Math.round(this.reviewDuration / 60); // minutes
  }
  return null;
});

// 🆕 Virtual for age in days
identityVerificationSchema.virtual('ageInDays').get(function(this: IIdentityVerification) {
  return Math.floor((Date.now() - this.submittedAt.getTime()) / (1000 * 60 * 60 * 24));
});

// 🆕 Middleware to set priority based on age and user verification level
identityVerificationSchema.pre<IIdentityVerification>('save', async function(next) {
  if (this.isNew) {
    // Set priority based on document type and user history
    if (this.documentType === 'nin' || this.documentType === 'international_passport') {
      this.priority = 'high';
    }
    
    // Check if user has had previous rejections (increase priority)
    const User = mongoose.model('User');
    const user = await User.findById(this.userId);
    if (user && user.verificationLevel === 0) {
      this.priority = 'high'; // First-time verification gets priority
    }
  }
  
  // Auto-expire old pending verifications (7 days)
  if (this.status === 'pending_review' && this.ageInDays > 7) {
    this.status = 'expired';
  }
  
  next();
});

// 🆕 Static method to get verification statistics
identityVerificationSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgProcessingTime: {
          $avg: {
            $cond: {
              if: { $and: ['$reviewedAt', '$submittedAt'] },
              then: { $subtract: ['$reviewedAt', '$submittedAt'] },
              else: null
            }
          }
        }
      }
    }
  ]);
  
  const documentTypeStats = await this.aggregate([
    {
      $group: {
        _id: '$documentType',
        count: { $sum: 1 },
        verifiedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'verified'] }, 1, 0] }
        },
        rejectedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
        }
      }
    }
  ]);
  
  return {
    byStatus: stats,
    byDocumentType: documentTypeStats,
    total: await this.countDocuments(),
    pending: await this.countDocuments({ status: 'pending_review' }),
    avgReviewTime: stats.find((s: any) => s._id === 'verified')?.avgProcessingTime || 0
  };
};

// 🆕 Instance method to start review
identityVerificationSchema.methods.startReview = function(adminId: mongoose.Types.ObjectId) {
  this.reviewStartedAt = new Date();
  this.reviewedBy = adminId;
  this.status = 'processing';
  return this.save();
};

// 🆕 Instance method to complete review
identityVerificationSchema.methods.completeReview = function(
  action: 'approve' | 'reject', 
  comments?: string, 
  adminId?: mongoose.Types.ObjectId
) {
  this.status = action === 'approve' ? 'verified' : 'rejected';
  this.reviewedAt = new Date();
  this.reviewComments = comments;
  
  if (adminId) {
    this.reviewedBy = adminId;
  }
  
  if (this.reviewStartedAt) {
    this.reviewDuration = Math.floor((Date.now() - this.reviewStartedAt.getTime()) / 1000);
  }
  
  return this.save();
};

// 🆕 Instance method to add quality assessment
identityVerificationSchema.methods.assessQuality = function(qualityChecks: any) {
  if (!this.metadata) {
    this.metadata = {};
  }
  this.metadata.qualityChecks = qualityChecks;
  
  // Auto-flag for manual review if quality is poor
  if (qualityChecks.imageQuality === 'poor' || qualityChecks.readability === 'poor') {
    if (!this.processingInfo) {
      this.processingInfo = {};
    }
    this.processingInfo.requiresManualReview = true;
    this.priority = 'high';
  }
  
  return this.save();
};

// 🆕 Static method to get admin queue (prioritized)
identityVerificationSchema.statics.getAdminQueue = async function(limit = 20) {
  return await this.find({ 
    status: 'pending_review' 
  })
  .populate('userId', 'fullName email trustScore verificationLevel')
  .sort({ 
    priority: -1,  // urgent first
    submittedAt: 1 // then oldest first
  })
  .limit(limit)
  .select('-frontImagePath -backImagePath'); // Don't expose file paths
};

export default mongoose.model<IIdentityVerification>('IdentityVerification', identityVerificationSchema);