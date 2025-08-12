// // models/User.ts - UPDATED with Password Reset Integration & 20-Point Trust Score System
// import { Schema, model, models, Document, Types } from 'mongoose';
// import bcrypt from 'bcrypt';
// import { IProduct } from './Product';

// export interface IUser extends Document {
//   _id: Types.ObjectId;
//   fullName: string;
//   email: string;
//   mobile: string;
//   password: string;
//   photoURL?: string;
//   role: 'user' | 'admin';
//   successfulSwaps: number;
//   plan: 'free' | 'pro';
//   proSince?: Date;
//   createdAt?: Date;
//   updatedAt?: Date;

//   walletBalance: number;
  
//   // Virtual Account fields (your existing)
//   walletPin?: string;
//   paystackCustomerCode?: string;
//   virtualAccountNumber?: string;
//   virtualAccountName?: string;
//   virtualBankName?: string;
//   virtualAccountId?: string;
//   virtualAccountActive?: boolean;

//   verified: boolean;
//   verifyToken?: string;
//   verifyExpires?: Date;

//   // 🔐 PASSWORD RESET FIELDS
//   passwordResetToken?: string;
//   passwordResetExpiry?: Date;

//   // Phone verification fields (your existing)
//   phoneVerificationCode?: string;
//   phoneVerificationExpires?: Date;
//   pendingPhoneNumber?: string;

//   // 🆕 ENHANCED ADDRESS with Nominatim & Landmarks support
//   address?: {
//     country?: string;
//     state?: string;
//     city?: string;
//     street?: string;
//     postalCode?: string;
//     formattedAddress?: string;
//     verified: boolean;
    
//     // Enhanced address fields
//     landmark?: string;
//     nearbyLandmarks?: string[];
//     what3words?: string;
//     addressType?: 'residential' | 'commercial' | 'other';
//     verificationStatus?: 'not_started' | 'pending_review' | 'verified' | 'rejected' | 'needs_manual_review';
    
//     // Geocoding data
//     coordinates?: {
//       latitude: number;
//       longitude: number;
//       accuracy: number;
//       source?: 'nominatim' | 'user_provided' | 'manual';
//     };
//     geocodingResults?: {
//       query: string;
//       resultCount: number;
//       confidence: number;
//       factors: string[];
//       warnings: string[];
//     };
    
//     // Admin review fields
//     reviewComments?: string;
//     reviewedAt?: Date;
//     reviewedBy?: Types.ObjectId;
    
//     // Metadata
//     userConfirmedLocation?: boolean;
//     lastUpdated?: Date;
//   };

//   // Shipping addresses (your existing)
//   defaultShippingAddress?: {
//     name: string;
//     phone: string;
//     address: string;
//     city: string;
//     state: string;
//     isDefault: boolean;
//   };
  
//   shippingAddresses?: {
//     name: string;
//     phone: string;
//     address: string;
//     city: string;
//     state: string;
//     label: string;
//     isDefault: boolean;
//   }[];
  
//   shippingPreferences?: {
//     preferredCarriers: string[];
//     defaultShippingMethod: 'shipbubble' | 'self-arranged';
//   };

//   subscriptionHistory?: {
//     plan: 'free' | 'pro';
//     startedAt: Date;
//     endedAt?: Date;
//     amountPaid?: number;
//   }[];

//   transactionHistory?: {
//     type: 'fund' | 'purchase' | 'withdrawal';
//     amount: number;
//     status: 'pending' | 'successful' | 'failed';
//     reference?: string;
//     createdAt: Date;
//   }[];

//   favorites?: Types.ObjectId[];

//   level?: string;
//   isPro?: boolean;
//   isAdmin?: boolean;

//   // 🆕 LOCATION FIELDS
//   location?: {
//     type: 'Point';
//     coordinates: [number, number]; // [longitude, latitude]
//   };
//   locationUpdatedAt?: Date;
//   maxSearchRadius?: number;
//   locationSharing?: boolean;

//   // 🆕 VERIFICATION FIELDS (5-step system: email, phone, address, identity, social)
//   phoneVerified?: boolean;
//   emailVerified?: boolean;
//   identityVerified?: boolean;
//   addressVerified?: boolean;
//   verificationLevel?: number;
//   trustScore?: number;
  
//   // 🆕 VERIFICATION TRACKING
//   verifications?: {
//     email?: {
//       completed: boolean;
//       verifiedAt?: Date;
//       verificationToken?: string;
//     };
//     phone?: {
//       completed: boolean;
//       verifiedAt?: Date;
//       phoneNumber?: string;
//     };
//     address?: {
//       completed: boolean;
//       verifiedAt?: Date;
//       addressDetails?: object;
//     };
//     identity?: {
//       completed: boolean;
//       verifiedAt?: Date;
//       documentType?: string;
//       uploadId?: string;
//     };
//   };

//   // 🆕 NEW: SOCIAL MEDIA VERIFICATIONS
//   socialVerifications?: {
//     platform: 'twitter' | 'facebook' | 'instagram' | 'linkedin' | 'tiktok';
//     username: string;
//     profileUrl?: string;
//     verificationMethod: 'bio_link' | 'post_mention' | 'username_match';
//     verificationCode: string;
//     verifiedAt?: Date;
//     status: 'pending' | 'verified' | 'failed';
//     attempts: number;
//     lastAttemptAt: Date;
//     reviewComments?: string;
//     createdAt: Date;
//   }[];

//   // 🆕 ACTIVITY FIELDS
//   lastSeen?: Date;
//   isActive?: boolean;
//   rating?: number;
//   successfulSales?: number;

//   // 🆕 PREFERENCE FIELDS
//   nearbyNotifications?: boolean;
//   verifiedUsersOnly?: boolean;

//   // Methods
//   comparePassword(password: string): Promise<boolean>;
//   updateLastSeen(): Promise<IUser>;
//   getDistanceTo(otherUser: IUser): number | null;
//   getSocialVerificationSummary(): any;
//   isPlatformVerified(platform: string): boolean;
//   getCompleteVerificationProgress(): any;
  
//   // 🔐 PASSWORD RESET METHODS
//   generatePasswordResetToken(): string;
//   isPasswordResetTokenValid(token: string): boolean;
//   clearPasswordResetToken(): void;
// }

// const userSchema = new Schema<IUser>(
//   {
//     // ========================================
//     // CORE USER FIELDS
//     // ========================================
//     fullName: { type: String, required: true, trim: true },
//     email: {
//       type: String,
//       required: true,
//       unique: true,
//       lowercase: true,
//       trim: true,
//     },
//     mobile: { type: String, required: true, trim: true },
//     password: { type: String, required: true, minlength: 6 },
//     photoURL: { type: String },
//     role: { type: String, enum: ['user', 'admin'], default: 'user' },
//     successfulSwaps: { type: Number, default: 0 },
//     plan: { type: String, enum: ['free', 'pro'], default: 'free' },
//     proSince: { type: Date },

//     // ========================================
//     // WALLET & VIRTUAL ACCOUNT FIELDS
//     // ========================================
//     walletBalance: { type: Number, default: 0 },
    
//     // Virtual account fields (your existing)
//     walletPin: { type: String, select: false },
//     paystackCustomerCode: { type: String, sparse: true, index: true },
//     virtualAccountNumber: { type: String, sparse: true, index: true },
//     virtualAccountName: { type: String },
//     virtualBankName: { type: String },
//     virtualAccountId: { type: String, sparse: true },
//     virtualAccountActive: { type: Boolean, default: false },

//     // ========================================
//     // AUTHENTICATION & VERIFICATION FIELDS
//     // ========================================
//     verified: { type: Boolean, default: false, index: true },
//     verifyToken: { type: String, sparse: true, index: true },
//     verifyExpires: { type: Date, sparse: true },

//     // 🔐 PASSWORD RESET FIELDS
//     passwordResetToken: { 
//       type: String, 
//       sparse: true, 
//       index: true,
//       select: false // Don't include in queries by default for security
//     },
//     passwordResetExpiry: { 
//       type: Date, 
//       sparse: true,
//       select: false // Don't include in queries by default for security
//     },

//     // Phone verification fields (your existing)
//     phoneVerificationCode: { 
//       type: String, 
//       select: false
//     },
//     phoneVerificationExpires: { 
//       type: Date, 
//       select: false 
//     },
//     pendingPhoneNumber: { 
//       type: String, 
//       select: false 
//     },

//     // ========================================
//     // ENHANCED ADDRESS FIELDS
//     // ========================================
//     address: {
//       country: {
//         type: String,
//         trim: true,
//         validate: {
//           validator: (v: string) =>
//             !v || /^[A-Za-z\s\-']{2,}$/.test(v),
//           message: 'Invalid country name.',
//         },
//       },
//       state: {
//         type: String,
//         trim: true,
//         validate: {
//           validator: (v: string) =>
//             !v || /^[A-Za-z\s\-']{2,}$/.test(v),
//           message: 'Invalid state name.',
//         },
//       },
//       city: {
//         type: String,
//         trim: true,
//         validate: {
//           validator: (v: string) =>
//             !v || /^[A-Za-z\s\-']{2,}$/.test(v),
//           message: 'Invalid city name.',
//         },
//       },
//       street: {
//         type: String,
//         trim: true,
//         validate: {
//           validator: (v: string) =>
//             !v || v.length >= 2,
//           message: 'Street address must be at least 2 characters.',
//         },
//       },
//       postalCode: { type: String, trim: true },
//       formattedAddress: { type: String, trim: true },
//       verified: { type: Boolean, default: false },
      
//       // Enhanced address fields
//       landmark: { type: String, trim: true },
//       nearbyLandmarks: [{ type: String, trim: true }],
//       what3words: { type: String, trim: true },
//       addressType: { 
//         type: String, 
//         enum: ['residential', 'commercial', 'other'], 
//         default: 'residential' 
//       },
//       verificationStatus: { 
//         type: String, 
//         enum: ['not_started', 'pending_review', 'verified', 'rejected', 'needs_manual_review'], 
//         default: 'not_started' 
//       },
      
//       // Geocoding data
//       coordinates: {
//         latitude: Number,
//         longitude: Number,
//         accuracy: Number,
//         source: { type: String, enum: ['nominatim', 'user_provided', 'manual'] }
//       },
//       geocodingResults: {
//         query: String,
//         resultCount: Number,
//         confidence: Number,
//         factors: [String],
//         warnings: [String]
//       },
      
//       // Admin review fields
//       reviewComments: String,
//       reviewedAt: Date,
//       reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      
//       // Metadata
//       userConfirmedLocation: { type: Boolean, default: false },
//       lastUpdated: { type: Date, default: Date.now }
//     },

//     // ========================================
//     // SHIPPING FIELDS
//     // ========================================
//     defaultShippingAddress: {
//       name: { type: String, trim: true },
//       phone: { type: String, trim: true },
//       address: { type: String, trim: true },
//       city: { type: String, trim: true },
//       state: { type: String, trim: true },
//       isDefault: { type: Boolean, default: true }
//     },

//     shippingAddresses: [{
//       name: { type: String, trim: true, required: true },
//       phone: { type: String, trim: true, required: true },
//       address: { type: String, trim: true, required: true },
//       city: { type: String, trim: true, required: true },
//       state: { type: String, trim: true, required: true },
//       label: { type: String, trim: true },
//       isDefault: { type: Boolean, default: false }
//     }],

//     shippingPreferences: {
//       preferredCarriers: [{ type: String }],
//       defaultShippingMethod: { 
//         type: String, 
//         enum: ['shipbubble', 'self-arranged'], 
//         default: 'shipbubble' 
//       }
//     },

//     // ========================================
//     // TRANSACTION & SUBSCRIPTION FIELDS
//     // ========================================
//     subscriptionHistory: [
//       {
//         plan: { type: String, enum: ['free', 'pro'], required: true },
//         startedAt: { type: Date, required: true },
//         endedAt: { type: Date },
//         amountPaid: { type: Number },
//       },
//     ],

//     transactionHistory: [
//       {
//         type: {
//           type: String,
//           enum: ['fund', 'purchase', 'withdrawal'],
//           required: true,
//         },
//         amount: { type: Number, required: true },
//         status: {
//           type: String,
//           enum: ['pending', 'successful', 'failed'],
//           default: 'pending',
//         },
//         reference: { type: String },
//         createdAt: { type: Date, default: Date.now },
//       },
//     ],

//     favorites: [{ type: Schema.Types.ObjectId, ref: 'Product' }],

//     // ========================================
//     // LOCATION FIELDS
//     // ========================================
//    location: {
//   type: {
//     type: String,
//     enum: ['Point'],
//     // Removed default: 'Point' to prevent automatic creation
//   },
//   coordinates: {
//     type: [Number], // [longitude, latitude]
//     index: '2dsphere',
//   },
// },
    
//     locationUpdatedAt: { type: Date, default: Date.now },
//     maxSearchRadius: { type: Number, default: 25 }, // km
//     locationSharing: { type: Boolean, default: true },

//     // ========================================
//     // VERIFICATION FIELDS (20-Point Trust Score System)
//     // ========================================
//     phoneVerified: { type: Boolean, default: false },
//     emailVerified: { type: Boolean, default: false },
//     identityVerified: { type: Boolean, default: false },
//     addressVerified: { type: Boolean, default: false },
//     verificationLevel: { type: Number, default: 0, min: 0, max: 4 },
//     trustScore: { type: Number, default: 0, min: 0, max: 100 }, // 🔧 Max 100 (5 × 20 points)

//     // VERIFICATION TRACKING
//     verifications: {
//       email: {
//         completed: { type: Boolean, default: false },
//         verifiedAt: { type: Date },
//         verificationToken: { type: String }
//       },
//       phone: {
//         completed: { type: Boolean, default: false },
//         verifiedAt: { type: Date },
//         phoneNumber: { type: String }
//       },
//       address: {
//         completed: { type: Boolean, default: false },
//         verifiedAt: { type: Date },
//         addressDetails: { type: Schema.Types.Mixed }
//       },
//       identity: {
//         completed: { type: Boolean, default: false },
//         verifiedAt: { type: Date },
//         documentType: { type: String },
//         uploadId: { type: String }
//       }
//     },

//     // ========================================
//     // SOCIAL MEDIA VERIFICATIONS
//     // ========================================
//     socialVerifications: [{
//       platform: { 
//         type: String, 
//         enum: ['twitter', 'facebook', 'instagram', 'linkedin', 'tiktok'],
//         required: true
//       },
//       username: { 
//         type: String, 
//         required: true,
//         trim: true
//       },
//       profileUrl: { 
//         type: String,
//         trim: true
//       },
//       verificationMethod: { 
//         type: String, 
//         enum: ['bio_link', 'post_mention', 'username_match'],
//         required: true
//       },
//       verificationCode: { 
//         type: String,
//         required: true
//       },
//       verifiedAt: { 
//         type: Date 
//       },
//       status: { 
//         type: String, 
//         enum: ['pending', 'verified', 'failed'], 
//         default: 'pending' 
//       },
//       attempts: { 
//         type: Number, 
//         default: 0,
//         max: 3
//       },
//       lastAttemptAt: { 
//         type: Date, 
//         default: Date.now 
//       },
//       reviewComments: String,
//       createdAt: { 
//         type: Date, 
//         default: Date.now 
//       }
//     }],

//     // ========================================
//     // ACTIVITY & PREFERENCE FIELDS
//     // ========================================
//     lastSeen: { type: Date, default: Date.now },
//     isActive: { type: Boolean, default: true },
//     rating: { type: Number, default: 0, min: 0, max: 5 },
//     successfulSales: { type: Number, default: 0 },
//     nearbyNotifications: { type: Boolean, default: true },
//     verifiedUsersOnly: { type: Boolean, default: false },
//   },
//   {
//     timestamps: true,
//     toJSON: { virtuals: true },
//     toObject: { virtuals: true },
//   }
// );

// // ========================================
// // INDEXES FOR PERFORMANCE
// // ========================================
// userSchema.index({ location: '2dsphere' });
// userSchema.index({ 'address.city': 1, 'address.state': 1 });
// userSchema.index({ verificationLevel: 1, trustScore: -1 });
// userSchema.index({ lastSeen: -1 });
// userSchema.index({ isActive: 1, locationSharing: 1 });
// userSchema.index({ 'socialVerifications.platform': 1, 'socialVerifications.status': 1 });
// userSchema.index({ 'socialVerifications.username': 1 });

// // Existing indexes (keep all)
// userSchema.index({ email: 1, verifyToken: 1 });
// userSchema.index({ phoneVerificationCode: 1 });
// userSchema.index({ 'shippingAddresses.isDefault': 1 });

// // 🔐 PASSWORD RESET INDEXES
// userSchema.index({ passwordResetToken: 1 });
// userSchema.index({ passwordResetExpiry: 1 });

// // ========================================
// // VIRTUAL FIELDS
// // ========================================
// userSchema.virtual('level').get(function (this: IUser) {
//   const swaps = this.successfulSwaps || 0;
//   if (swaps >= 50) return 'platinum';
//   if (swaps >= 20) return 'gold';
//   if (swaps >= 10) return 'silver';
//   return 'bronze';
// });

// userSchema.virtual('isPro').get(function (this: IUser) {
//   return this.plan === 'pro';
// });

// userSchema.virtual('isAdmin').get(function (this: IUser) {
//   return this.role === 'admin';
// });

// // Overall verification status
// userSchema.virtual('isVerified').get(function (this: IUser) {
//   return this.verificationLevel > 0;
// });

// // Get verified social platforms count
// userSchema.virtual('verifiedSocialCount').get(function (this: IUser) {
//   if (!this.socialVerifications) return 0;
//   return this.socialVerifications.filter((v: any) => v.status === 'verified').length;
// });

// // Check if social media is verified
// userSchema.virtual('hasSocialVerification').get(function (this: IUser) {
//   if (!this.socialVerifications) return false;
//   return this.socialVerifications.some((v: any) => v.status === 'verified');
// });

// // ========================================
// // MIDDLEWARE
// // ========================================

// // Password hashing middleware
// userSchema.pre<IUser>('save', async function (next) {
//   if (!this.isModified('password')) return next();

//   try {
//     const salt = await bcrypt.genSalt(10);
//     this.password = await bcrypt.hash(this.password, salt);
//     return next();
//   } catch (err) {
//     return next(err as Error);
//   }
// });

// // 🔧 TRUST SCORE MIDDLEWARE - 20-point system (5 categories × 20 points = 100 total)
// userSchema.pre<IUser>('save', function (next) {
//   if (this.isModified(['phoneVerified', 'emailVerified', 'identityVerified', 'addressVerified', 'socialVerifications'])) {
//     let score = 0;
    
//     // Each category worth 20 points
//     if (this.emailVerified) score += 20;         // Email verification: 20 points
//     if (this.phoneVerified) score += 20;        // Phone verification: 20 points  
//     if (this.addressVerified) score += 20;      // Address verification: 20 points
//     if (this.identityVerified) score += 20;     // Identity verification: 20 points
    
//     // Social media verification: 20 points (any verified social platform)
//     if (this.socialVerifications) {
//       const hasVerifiedSocial = this.socialVerifications.some((v: any) => v.status === 'verified');
//       if (hasVerifiedSocial) score += 20;
//     }
    
//     this.trustScore = Math.min(score, 100); // Max 100 points (5 × 20)
    
//     // Core verification level (0-4 based on core steps only, excludes social)
//     let coreCompleted = 0;
//     if (this.emailVerified) coreCompleted++;
//     if (this.phoneVerified) coreCompleted++;
//     if (this.addressVerified) coreCompleted++;
//     if (this.identityVerified) coreCompleted++;
    
//     this.verificationLevel = coreCompleted;
    
//     console.log('🔄 Trust score recalculated:', {
//       userId: this._id,
//       emailVerified: this.emailVerified,
//       phoneVerified: this.phoneVerified,
//       addressVerified: this.addressVerified,
//       identityVerified: this.identityVerified,
//       socialVerified: this.socialVerifications?.some((v: any) => v.status === 'verified') || false,
//       trustScore: this.trustScore,
//       verificationLevel: this.verificationLevel
//     });
//   }
  
//   // Sync individual verification fields with verifications object
//   if (this.verifications) {
//     this.emailVerified = this.verifications.email?.completed || false;
//     this.phoneVerified = this.verifications.phone?.completed || false;
//     this.addressVerified = this.verifications.address?.completed || false;
//     this.identityVerified = this.verifications.identity?.completed || false;
//   }
  
//   next();
// });

// // Address verification sync middleware
// userSchema.pre<IUser>('save', function (next) {
//   if (this.isModified('addressVerified') && this.address) {
//     this.address.verified = this.addressVerified || false;
//   }
  
//   if (this.isModified('address.verified')) {
//     this.addressVerified = this.address?.verified || false;
//   }
  
//   next();
// });

// // ========================================
// // INSTANCE METHODS
// // ========================================

// // Password comparison
// userSchema.methods.comparePassword = async function (
//   this: IUser,
//   candidatePassword: string
// ): Promise<boolean> {
//   return bcrypt.compare(candidatePassword, this.password);
// };

// // Update last seen
// userSchema.methods.updateLastSeen = function (this: IUser): Promise<IUser> {
//   this.lastSeen = new Date();
//   return this.save();
// };

// // Calculate distance to another user
// userSchema.methods.getDistanceTo = function (this: IUser, otherUser: IUser): number | null {
//   if (!this.location?.coordinates || !otherUser.location?.coordinates) {
//     return null;
//   }
  
//   const [lng1, lat1] = this.location.coordinates;
//   const [lng2, lat2] = otherUser.location.coordinates;
  
//   const R = 6371; // Earth's radius in km
//   const dLat = toRadians(lat2 - lat1);
//   const dLon = toRadians(lng2 - lng1);
  
//   const a = 
//     Math.sin(dLat / 2) * Math.sin(dLat / 2) +
//     Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
//     Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//   return R * c;
// };

// // ========================================
// // 🔐 PASSWORD RESET METHODS
// // ========================================

// // Generate password reset token
// userSchema.methods.generatePasswordResetToken = function (this: IUser): string {
//   const crypto = require('crypto');
//   const token = crypto.randomBytes(32).toString('hex');
  
//   this.passwordResetToken = token;
//   this.passwordResetExpiry = new Date(Date.now() + 3600000); // 1 hour from now
  
//   console.log('🔐 Generated password reset token for user:', {
//     userId: this._id,
//     email: this.email,
//     tokenExpiry: this.passwordResetExpiry
//   });
  
//   return token;
// };

// // Check if password reset token is valid
// userSchema.methods.isPasswordResetTokenValid = function (this: IUser, token: string): boolean {
//   if (!this.passwordResetToken || !this.passwordResetExpiry) {
//     return false;
//   }
  
//   const isTokenMatch = this.passwordResetToken === token;
//   const isNotExpired = this.passwordResetExpiry > new Date();
  
//   console.log('🔍 Password reset token validation:', {
//     userId: this._id,
//     email: this.email,
//     tokenMatch: isTokenMatch,
//     notExpired: isNotExpired,
//     expiresAt: this.passwordResetExpiry
//   });
  
//   return isTokenMatch && isNotExpired;
// };

// // Clear password reset token
// userSchema.methods.clearPasswordResetToken = function (this: IUser): void {
//   this.passwordResetToken = undefined;
//   this.passwordResetExpiry = undefined;
  
//   console.log('🔐 Cleared password reset token for user:', {
//     userId: this._id,
//     email: this.email
//   });
// };

// // ========================================
// // SOCIAL VERIFICATION METHODS
// // ========================================

// // Get social verification summary (20-point system)
// userSchema.methods.getSocialVerificationSummary = function (this: IUser) {
//   const socialVerifications = this.socialVerifications || [];
//   const verified = socialVerifications.filter((v: any) => v.status === 'verified');
//   const pending = socialVerifications.filter((v: any) => v.status === 'pending');
//   const failed = socialVerifications.filter((v: any) => v.status === 'failed');
//   const hasVerified = verified.length > 0;

//   return {
//     total: socialVerifications.length,
//     verified: verified.length,
//     pending: pending.length,
//     failed: failed.length,
//     hasVerified,
//     verifiedPlatforms: verified.map((v: any) => ({
//       platform: v.platform,
//       username: v.username,
//       verifiedAt: v.verifiedAt
//     })),
//     bonusPoints: hasVerified ? 20 : 0 // 20 points if any platform is verified
//   };
// };

// // Check if platform is already verified
// userSchema.methods.isPlatformVerified = function (this: IUser, platform: string): boolean {
//   if (!this.socialVerifications) return false;
//   return this.socialVerifications.some((v: any) => 
//     v.platform === platform && v.status === 'verified'
//   );
// };

// // Get overall verification progress (20-point system)
// userSchema.methods.getCompleteVerificationProgress = function (this: IUser) {
//   const coreSteps = ['email', 'phone', 'address', 'identity'] as const;
//   const completedCore = coreSteps.filter(step => {
//     switch (step) {
//       case 'email': return this.emailVerified;
//       case 'phone': return this.phoneVerified;
//       case 'address': return this.addressVerified;
//       case 'identity': return this.identityVerified;
//       default: return false;
//     }
//   }).length;

//   const socialSummary = this.getSocialVerificationSummary();
  
//   return {
//     core: {
//       completed: completedCore,
//       total: coreSteps.length,
//       percentage: Math.round((completedCore / coreSteps.length) * 100),
//       points: completedCore * 20 // 20 points per core step
//     },
//     social: {
//       verified: socialSummary.verified,
//       hasVerified: socialSummary.hasVerified,
//       points: socialSummary.bonusPoints // 20 points if any social verified
//     },
//     total: {
//       points: (completedCore * 20) + socialSummary.bonusPoints,
//       maxPoints: 100, // Max 100 points (5 × 20)
//       isFullyVerified: completedCore === 4 && socialSummary.hasVerified,
//       trustScore: this.trustScore || 0
//     }
//   };
// };

// // Complete verification step
// userSchema.methods.completeVerificationStep = function (
//   this: IUser, 
//   step: 'email' | 'phone' | 'address' | 'identity', 
//   additionalData?: any
// ): Promise<IUser> {
//   if (!this.verifications) {
//     this.verifications = {
//       email: { completed: false },
//       phone: { completed: false },
//       address: { completed: false },
//       identity: { completed: false }
//     };
//   }
  
//   this.verifications[step] = {
//     completed: true,
//     verifiedAt: new Date(),
//     ...additionalData
//   };
  
//   // Set the individual verification field
//   switch (step) {
//     case 'email':
//       this.emailVerified = true;
//       break;
//     case 'phone':
//       this.phoneVerified = true;
//       break;
//     case 'address':
//       this.addressVerified = true;
//       break;
//     case 'identity':
//       this.identityVerified = true;
//       break;
//   }
  
//   return this.save();
// };

// // Get verification progress
// userSchema.methods.getVerificationProgress = function (this: IUser) {
//   const steps = ['email', 'phone', 'address', 'identity'] as const;
//   const completed = steps.filter(step => this.verifications?.[step]?.completed).length;
  
//   return {
//     completed,
//     total: steps.length,
//     percentage: Math.round((completed / steps.length) * 100),
//     remaining: steps.filter(step => !this.verifications?.[step]?.completed)
//   };
// };

// // ========================================
// // UTILITY FUNCTIONS
// // ========================================

// function toRadians(degrees: number): number {
//   return degrees * (Math.PI / 180);
// }

// // ========================================
// // MODEL EXPORT
// // ========================================

// const User = models.User || model<IUser>('User', userSchema);
// export default User;

// models/User.ts - COMPLETE USER MODEL with Enhanced Shipping Integration
import { Schema, model, models, Document, Types } from 'mongoose';
import bcrypt from 'bcrypt';
import { IProduct } from './Product';

export interface IUser extends Document {
  _id: Types.ObjectId;
  fullName: string;
  email: string;
  mobile: string;
  password: string;
  photoURL?: string;
  role: 'user' | 'admin';
  successfulSwaps: number;
  plan: 'free' | 'pro';
  proSince?: Date;
  createdAt?: Date;
  updatedAt?: Date;

  walletBalance: number;
  
  // Virtual Account fields
  walletPin?: string;
  paystackCustomerCode?: string;
  virtualAccountNumber?: string;
  virtualAccountName?: string;
  virtualBankName?: string;
  virtualAccountId?: string;
  virtualAccountActive?: boolean;

  verified: boolean;
  verifyToken?: string;
  verifyExpires?: Date;

  // Password reset fields
  passwordResetToken?: string;
  passwordResetExpiry?: Date;

  // Phone verification fields
  phoneVerificationCode?: string;
  phoneVerificationExpires?: Date;
  pendingPhoneNumber?: string;

  // Enhanced address with geocoding support
  address?: {
    country?: string;
    state?: string;
    city?: string;
    street?: string;
    postalCode?: string;
    formattedAddress?: string;
    verified: boolean;
    landmark?: string;
    nearbyLandmarks?: string[];
    what3words?: string;
    addressType?: 'residential' | 'commercial' | 'other';
    verificationStatus?: 'not_started' | 'pending_review' | 'verified' | 'rejected' | 'needs_manual_review';
    coordinates?: {
      latitude: number;
      longitude: number;
      accuracy: number;
      source?: 'nominatim' | 'user_provided' | 'manual';
    };
    geocodingResults?: {
      query: string;
      resultCount: number;
      confidence: number;
      factors: string[];
      warnings: string[];
    };
    reviewComments?: string;
    reviewedAt?: Date;
    reviewedBy?: Types.ObjectId;
    userConfirmedLocation?: boolean;
    lastUpdated?: Date;
  };

  // Enhanced shipping addresses
  shippingAddresses?: {
    _id?: Types.ObjectId;
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    label?: string;
    isDefault: boolean;
    last_used?: Date;
    created_at?: Date;
  }[];

  // Enhanced shipping preferences
  shippingPreferences?: {
    priority: 'speed' | 'cost' | 'balanced';
    max_delivery_time: string;
    preferred_couriers: string[];
    insurance_preference: 'always' | 'never' | 'auto';
    notifications: {
      pickup: boolean;
      in_transit: boolean;
      delivered: boolean;
      delays: boolean;
    };
    auto_select_cheapest: boolean;
    auto_select_fastest: boolean;
    updated_at: Date;
  };

  subscriptionHistory?: {
    plan: 'free' | 'pro';
    startedAt: Date;
    endedAt?: Date;
    amountPaid?: number;
  }[];

  transactionHistory?: {
    type: 'fund' | 'purchase' | 'withdrawal';
    amount: number;
    status: 'pending' | 'successful' | 'failed';
    reference?: string;
    createdAt: Date;
  }[];

  favorites?: Types.ObjectId[];

  // Review-related fields
  averageRating?: number;
  totalReviews?: number;

  // Location fields
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  locationUpdatedAt?: Date;
  maxSearchRadius?: number;
  locationSharing?: boolean;

  // Verification fields
  phoneVerified?: boolean;
  emailVerified?: boolean;
  identityVerified?: boolean;
  addressVerified?: boolean;
  verificationLevel?: number;
  trustScore?: number;
  
  verifications?: {
    email?: {
      completed: boolean;
      verifiedAt?: Date;
      verificationToken?: string;
    };
    phone?: {
      completed: boolean;
      verifiedAt?: Date;
      phoneNumber?: string;
    };
    address?: {
      completed: boolean;
      verifiedAt?: Date;
      addressDetails?: object;
    };
    identity?: {
      completed: boolean;
      verifiedAt?: Date;
      documentType?: string;
      uploadId?: string;
    };
  };

  // Social media verifications
  socialVerifications?: {
    platform: 'twitter' | 'facebook' | 'instagram' | 'linkedin' | 'tiktok';
    username: string;
    profileUrl?: string;
    verificationMethod: 'bio_link' | 'post_mention' | 'username_match';
    verificationCode: string;
    verifiedAt?: Date;
    status: 'pending' | 'verified' | 'failed';
    attempts: number;
    lastAttemptAt: Date;
    reviewComments?: string;
    createdAt: Date;
  }[];

  // Activity fields
  lastSeen?: Date;
  isActive?: boolean;
  rating?: number;
  successfulSales?: number;
  nearbyNotifications?: boolean;
  verifiedUsersOnly?: boolean;

  // Methods
  comparePassword(password: string): Promise<boolean>;
  updateLastSeen(): Promise<IUser>;
  getDistanceTo(otherUser: IUser): number | null;
  getSocialVerificationSummary(): any;
  isPlatformVerified(platform: string): boolean;
  getCompleteVerificationProgress(): any;
  generatePasswordResetToken(): string;
  isPasswordResetTokenValid(token: string): boolean;
  clearPasswordResetToken(): void;
  getShippingPreferences(): any;
  updateShippingPreferences(preferences: any): Promise<IUser>;
  addPreferredCourier(courierName: string): Promise<IUser>;
  getDefaultShippingAddress(): any;
  addShippingAddress(addressData: any): Promise<IUser>;
  updateAddressUsage(addressId: string): Promise<IUser>;
}

const userSchema = new Schema<IUser>(
  {
    // Core user fields
    fullName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    mobile: { type: String, required: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    photoURL: { type: String },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    successfulSwaps: { type: Number, default: 0 },
    plan: { type: String, enum: ['free', 'pro'], default: 'free' },
    proSince: { type: Date },

    // Wallet & virtual account fields
    walletBalance: { type: Number, default: 0 },
    walletPin: { type: String, select: false },
    paystackCustomerCode: { type: String, sparse: true, index: true },
    virtualAccountNumber: { type: String, sparse: true, index: true },
    virtualAccountName: { type: String },
    virtualBankName: { type: String },
    virtualAccountId: { type: String, sparse: true },
    virtualAccountActive: { type: Boolean, default: false },

    // Authentication & verification fields
    verified: { type: Boolean, default: false, index: true },
    verifyToken: { type: String, sparse: true, index: true },
    verifyExpires: { type: Date, sparse: true },

    // Password reset fields
    passwordResetToken: { 
      type: String, 
      sparse: true, 
      index: true,
      select: false
    },
    passwordResetExpiry: { 
      type: Date, 
      sparse: true,
      select: false
    },

    // Phone verification fields
    phoneVerificationCode: { type: String, select: false },
    phoneVerificationExpires: { type: Date, select: false },
    pendingPhoneNumber: { type: String, select: false },

    // Enhanced address fields
    address: {
      country: {
        type: String,
        trim: true,
        validate: {
          validator: (v: string) => !v || /^[A-Za-z\s\-']{2,}$/.test(v),
          message: 'Invalid country name.',
        },
      },
      state: {
        type: String,
        trim: true,
        validate: {
          validator: (v: string) => !v || /^[A-Za-z\s\-']{2,}$/.test(v),
          message: 'Invalid state name.',
        },
      },
      city: {
        type: String,
        trim: true,
        validate: {
          validator: (v: string) => !v || /^[A-Za-z\s\-']{2,}$/.test(v),
          message: 'Invalid city name.',
        },
      },
      street: {
        type: String,
        trim: true,
        validate: {
          validator: (v: string) => !v || v.length >= 2,
          message: 'Street address must be at least 2 characters.',
        },
      },
      postalCode: { type: String, trim: true },
      formattedAddress: { type: String, trim: true },
      verified: { type: Boolean, default: false },
      landmark: { type: String, trim: true },
      nearbyLandmarks: [{ type: String, trim: true }],
      what3words: { type: String, trim: true },
      addressType: { 
        type: String, 
        enum: ['residential', 'commercial', 'other'], 
        default: 'residential' 
      },
      verificationStatus: { 
        type: String, 
        enum: ['not_started', 'pending_review', 'verified', 'rejected', 'needs_manual_review'], 
        default: 'not_started' 
      },
      coordinates: {
        latitude: Number,
        longitude: Number,
        accuracy: Number,
        source: { type: String, enum: ['nominatim', 'user_provided', 'manual'] }
      },
      geocodingResults: {
        query: String,
        resultCount: Number,
        confidence: Number,
        factors: [String],
        warnings: [String]
      },
      reviewComments: String,
      reviewedAt: Date,
      reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      userConfirmedLocation: { type: Boolean, default: false },
      lastUpdated: { type: Date, default: Date.now }
    },

    // Enhanced shipping addresses
    shippingAddresses: [{
      _id: { type: Schema.Types.ObjectId, auto: true },
      name: { type: String, trim: true, required: true },
      phone: { type: String, trim: true, required: true },
      address: { type: String, trim: true, required: true },
      city: { type: String, trim: true, required: true },
      state: { type: String, trim: true, required: true },
      label: { type: String, trim: true, default: 'Home' },
      isDefault: { type: Boolean, default: false },
      last_used: { type: Date, default: Date.now },
      created_at: { type: Date, default: Date.now }
    }],

    // Enhanced shipping preferences
    shippingPreferences: {
      priority: { 
        type: String, 
        enum: ['speed', 'cost', 'balanced'], 
        default: 'balanced' 
      },
      max_delivery_time: { 
        type: String, 
        default: '2 days' 
      },
      preferred_couriers: [{ 
        type: String 
      }],
      insurance_preference: { 
        type: String, 
        enum: ['always', 'never', 'auto'], 
        default: 'auto' 
      },
      notifications: {
        pickup: { type: Boolean, default: true },
        in_transit: { type: Boolean, default: true },
        delivered: { type: Boolean, default: true },
        delays: { type: Boolean, default: true }
      },
      auto_select_cheapest: { type: Boolean, default: false },
      auto_select_fastest: { type: Boolean, default: false },
      updated_at: { type: Date, default: Date.now }
    },

    subscriptionHistory: [
      {
        plan: { type: String, enum: ['free', 'pro'], required: true },
        startedAt: { type: Date, required: true },
        endedAt: { type: Date },
        amountPaid: { type: Number },
      },
    ],

    transactionHistory: [
      {
        type: {
          type: String,
          enum: ['fund', 'purchase', 'withdrawal'],
          required: true,
        },
        amount: { type: Number, required: true },
        status: {
          type: String,
          enum: ['pending', 'successful', 'failed'],
          default: 'pending',
        },
        reference: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    favorites: [{ type: Schema.Types.ObjectId, ref: 'Product' }],

    // Location fields
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
        index: '2dsphere',
      },
    },
    locationUpdatedAt: { type: Date, default: Date.now },
    maxSearchRadius: { type: Number, default: 25 },
    locationSharing: { type: Boolean, default: true },

    // Verification fields
    phoneVerified: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    identityVerified: { type: Boolean, default: false },
    addressVerified: { type: Boolean, default: false },
    verificationLevel: { type: Number, default: 0, min: 0, max: 4 },
    trustScore: { type: Number, default: 0, min: 0, max: 100 },

    verifications: {
      email: {
        completed: { type: Boolean, default: false },
        verifiedAt: { type: Date },
        verificationToken: { type: String }
      },
      phone: {
        completed: { type: Boolean, default: false },
        verifiedAt: { type: Date },
        phoneNumber: { type: String }
      },
      address: {
        completed: { type: Boolean, default: false },
        verifiedAt: { type: Date },
        addressDetails: { type: Schema.Types.Mixed }
      },
      identity: {
        completed: { type: Boolean, default: false },
        verifiedAt: { type: Date },
        documentType: { type: String },
        uploadId: { type: String }
      }
    },

    // Social media verifications
    socialVerifications: [{
      platform: { 
        type: String, 
        enum: ['twitter', 'facebook', 'instagram', 'linkedin', 'tiktok'],
        required: true
      },
      username: { 
        type: String, 
        required: true,
        trim: true
      },
      profileUrl: { 
        type: String,
        trim: true
      },
      verificationMethod: { 
        type: String, 
        enum: ['bio_link', 'post_mention', 'username_match'],
        required: true
      },
      verificationCode: { 
        type: String,
        required: true
      },
      verifiedAt: { 
        type: Date 
      },
      status: { 
        type: String, 
        enum: ['pending', 'verified', 'failed'], 
        default: 'pending' 
      },
      attempts: { 
        type: Number, 
        default: 0,
        max: 3
      },
      lastAttemptAt: { 
        type: Date, 
        default: Date.now 
      },
      reviewComments: String,
      createdAt: { 
        type: Date, 
        default: Date.now 
      }
    }],

    // Activity & preference fields
    lastSeen: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    successfulSales: { type: Number, default: 0 },
    nearbyNotifications: { type: Boolean, default: true },
    verifiedUsersOnly: { type: Boolean, default: false },

    // Review-related fields (for sellers)
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
userSchema.index({ location: '2dsphere' });
userSchema.index({ 'address.city': 1, 'address.state': 1 });
userSchema.index({ verificationLevel: 1, trustScore: -1 });
userSchema.index({ lastSeen: -1 });
userSchema.index({ isActive: 1, locationSharing: 1 });
userSchema.index({ 'socialVerifications.platform': 1, 'socialVerifications.status': 1 });
userSchema.index({ 'socialVerifications.username': 1 });
userSchema.index({ email: 1, verifyToken: 1 });
userSchema.index({ phoneVerificationCode: 1 });
userSchema.index({ 'shippingAddresses.isDefault': 1 });
userSchema.index({ passwordResetToken: 1 });
userSchema.index({ passwordResetExpiry: 1 });
userSchema.index({ 'shippingPreferences.preferred_couriers': 1 });

// Virtual fields
userSchema.virtual('level').get(function (this: IUser) {
  const swaps = this.successfulSwaps || 0;
  if (swaps >= 50) return 'platinum';
  if (swaps >= 20) return 'gold';
  if (swaps >= 10) return 'silver';
  return 'bronze';
});

userSchema.virtual('isPro').get(function (this: IUser) {
  return this.plan === 'pro';
});

userSchema.virtual('isAdmin').get(function (this: IUser) {
  return this.role === 'admin';
});

userSchema.virtual('isVerified').get(function (this: IUser) {
  return this.verificationLevel > 0;
});

userSchema.virtual('verifiedSocialCount').get(function (this: IUser) {
  if (!this.socialVerifications) return 0;
  return this.socialVerifications.filter((v: any) => v.status === 'verified').length;
});

userSchema.virtual('hasSocialVerification').get(function (this: IUser) {
  if (!this.socialVerifications) return false;
  return this.socialVerifications.some((v: any) => v.status === 'verified');
});

// Middleware
userSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (err) {
    return next(err as Error);
  }
});

// Trust score middleware
userSchema.pre<IUser>('save', function (next) {
  if (this.isModified(['phoneVerified', 'emailVerified', 'identityVerified', 'addressVerified', 'socialVerifications'])) {
    let score = 0;
    
    if (this.emailVerified) score += 20;
    if (this.phoneVerified) score += 20;
    if (this.addressVerified) score += 20;
    if (this.identityVerified) score += 20;
    
    if (this.socialVerifications) {
      const hasVerifiedSocial = this.socialVerifications.some((v: any) => v.status === 'verified');
      if (hasVerifiedSocial) score += 20;
    }
    
    this.trustScore = Math.min(score, 100);
    
    let coreCompleted = 0;
    if (this.emailVerified) coreCompleted++;
    if (this.phoneVerified) coreCompleted++;
    if (this.addressVerified) coreCompleted++;
    if (this.identityVerified) coreCompleted++;
    
    this.verificationLevel = coreCompleted;
  }
  
  if (this.verifications) {
    this.emailVerified = this.verifications.email?.completed || false;
    this.phoneVerified = this.verifications.phone?.completed || false;
    this.addressVerified = this.verifications.address?.completed || false;
    this.identityVerified = this.verifications.identity?.completed || false;
  }
  
  next();
});

// Address verification sync middleware
userSchema.pre<IUser>('save', function (next) {
  if (this.isModified('addressVerified') && this.address) {
    this.address.verified = this.addressVerified || false;
  }
  
  if (this.isModified('address.verified')) {
    this.addressVerified = this.address?.verified || false;
  }
  
  next();
});

// Instance methods
userSchema.methods.comparePassword = async function (
  this: IUser,
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.updateLastSeen = function (this: IUser): Promise<IUser> {
  this.lastSeen = new Date();
  return this.save();
};

userSchema.methods.getDistanceTo = function (this: IUser, otherUser: IUser): number | null {
  if (!this.location?.coordinates || !otherUser.location?.coordinates) {
    return null;
  }
  
  const [lng1, lat1] = this.location.coordinates;
  const [lng2, lat2] = otherUser.location.coordinates;
  
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lng2 - lng1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Password reset methods
userSchema.methods.generatePasswordResetToken = function (this: IUser): string {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = token;
  this.passwordResetExpiry = new Date(Date.now() + 3600000); // 1 hour
  
  return token;
};

userSchema.methods.isPasswordResetTokenValid = function (this: IUser, token: string): boolean {
  if (!this.passwordResetToken || !this.passwordResetExpiry) {
    return false;
  }
  
  return this.passwordResetToken === token && this.passwordResetExpiry > new Date();
};

userSchema.methods.clearPasswordResetToken = function (this: IUser): void {
  this.passwordResetToken = undefined;
  this.passwordResetExpiry = undefined;
};

// Shipping methods
userSchema.methods.getShippingPreferences = function (this: IUser) {
  return this.shippingPreferences || {
    priority: 'balanced',
    max_delivery_time: '2 days',
    preferred_couriers: [],
    insurance_preference: 'auto',
    notifications: {
      pickup: true,
      in_transit: true,
      delivered: true,
      delays: true
    },
    auto_select_cheapest: false,
    auto_select_fastest: false
  };
};

userSchema.methods.updateShippingPreferences = function (this: IUser, preferences: any): Promise<IUser> {
  this.shippingPreferences = {
    ...this.getShippingPreferences(),
    ...preferences,
    updated_at: new Date()
  };
  return this.save();
};

userSchema.methods.addPreferredCourier = function (this: IUser, courierName: string): Promise<IUser> {
  if (!this.shippingPreferences) {
    this.shippingPreferences = this.getShippingPreferences();
  }
  
  const preferred = this.shippingPreferences.preferred_couriers || [];
  const filtered = preferred.filter((courier: string) => 
    courier.toLowerCase() !== courierName.toLowerCase()
  );
  
  this.shippingPreferences.preferred_couriers = [courierName, ...filtered].slice(0, 5);
  this.shippingPreferences.updated_at = new Date();
  return this.save();
};

userSchema.methods.getDefaultShippingAddress = function (this: IUser) {
  if (!this.shippingAddresses || this.shippingAddresses.length === 0) {
    return null;
  }
  
  const defaultAddr = this.shippingAddresses.find((addr: any) => addr.isDefault);
  return defaultAddr || this.shippingAddresses[0];
};

userSchema.methods.addShippingAddress = function (this: IUser, addressData: any): Promise<IUser> {
  if (!this.shippingAddresses) {
    this.shippingAddresses = [];
  }
  
  const isFirstAddress = this.shippingAddresses.length === 0;
  const shouldBeDefault = isFirstAddress || addressData.isDefault;
  
  if (shouldBeDefault) {
    this.shippingAddresses.forEach((addr: any) => {
      addr.isDefault = false;
    });
  }
  
  const newAddress = {
    name: addressData.name.trim(),
    phone: addressData.phone.trim(),
    address: addressData.address.trim(),
    city: addressData.city.trim(),
    state: addressData.state.trim(),
    label: addressData.label?.trim() || 'Home',
    isDefault: shouldBeDefault,
    last_used: new Date(),
    created_at: new Date()
  };
  
  this.shippingAddresses.push(newAddress);
  return this.save();
};

userSchema.methods.updateAddressUsage = function (this: IUser, addressId: string): Promise<IUser> {
  if (!this.shippingAddresses) return Promise.resolve(this);
  
  const address = this.shippingAddresses.id(addressId);
  if (address) {
    address.last_used = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Social verification methods
userSchema.methods.getSocialVerificationSummary = function (this: IUser) {
  const socialVerifications = this.socialVerifications || [];
  const verified = socialVerifications.filter((v: any) => v.status === 'verified');
  const pending = socialVerifications.filter((v: any) => v.status === 'pending');
  const failed = socialVerifications.filter((v: any) => v.status === 'failed');
  const hasVerified = verified.length > 0;

  return {
    total: socialVerifications.length,
    verified: verified.length,
    pending: pending.length,
    failed: failed.length,
    hasVerified,
    verifiedPlatforms: verified.map((v: any) => ({
      platform: v.platform,
      username: v.username,
      verifiedAt: v.verifiedAt
    })),
    bonusPoints: hasVerified ? 20 : 0
  };
};

userSchema.methods.isPlatformVerified = function (this: IUser, platform: string): boolean {
  if (!this.socialVerifications) return false;
  return this.socialVerifications.some((v: any) => 
    v.platform === platform && v.status === 'verified'
  );
};

userSchema.methods.getCompleteVerificationProgress = function (this: IUser) {
  const coreSteps = ['email', 'phone', 'address', 'identity'] as const;
  const completedCore = coreSteps.filter(step => {
    switch (step) {
      case 'email': return this.emailVerified;
      case 'phone': return this.phoneVerified;
      case 'address': return this.addressVerified;
      case 'identity': return this.identityVerified;
      default: return false;
    }
  }).length;

  const socialSummary = this.getSocialVerificationSummary();
  
  return {
    core: {
      completed: completedCore,
      total: coreSteps.length,
      percentage: Math.round((completedCore / coreSteps.length) * 100),
      points: completedCore * 20
    },
    social: {
      verified: socialSummary.verified,
      hasVerified: socialSummary.hasVerified,
      points: socialSummary.bonusPoints
    },
    total: {
      points: (completedCore * 20) + socialSummary.bonusPoints,
      maxPoints: 100,
      isFullyVerified: completedCore === 4 && socialSummary.hasVerified,
      trustScore: this.trustScore || 0
    }
  };
};

// Utility functions
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Export model
const User = models.User || model<IUser>('User', userSchema);
export default User;