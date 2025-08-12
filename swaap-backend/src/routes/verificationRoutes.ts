// src/routes/verificationRoutes.ts - COMPLETE MERGED VERSION with 20-point trust score system
import express from 'express';
import multer from 'multer';
import path from 'path';
import IdentityVerification from '../models/IdentityVerification';
import User from '../models/User';
import { verifyJwtToken, createAuthenticatedHandler, AuthenticatedRequest } from '@/middlewares/verifyJwtToken';
import { verifyAddress, searchAddress } from '@/controllers/addressController';
import { 
  initiateSocialVerification, 
  completeSocialVerification, 
  getSocialVerifications, 
  removeSocialVerification 
} from '@/controllers/socialVerificationController';

const router = express.Router();

// Simple multer configuration
const upload = multer({
  dest: 'uploads/verification/',
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// ✅ Admin middleware - checks if user is admin
const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// ✅ NEW: 20-point trust score calculation (5 categories × 20 = 100)
const calculateTrustScore = (user: any): number => {
  let score = 0;
  
  // Each category worth 20 points
  if (user.emailVerified) score += 20;         // Email verification: 20 points
  if (user.phoneVerified) score += 20;        // Phone verification: 20 points  
  if (user.addressVerified) score += 20;      // Address verification: 20 points
  if (user.identityVerified) score += 20;     // Identity verification: 20 points
  
  // Social media verification: 20 points (any verified social platform)
  if (user.socialVerifications && user.socialVerifications.some((v: any) => v.status === 'verified')) {
    score += 20;
  }
  
  return Math.min(score, 100); // Max 100 (5 × 20)
};

// ✅ NEW: 4-step verification level calculation (excludes social)
const calculateVerificationLevel = (user: any): number => {
  let level = 0;
  
  // Count completed core verification steps (0-4, excludes social)
  if (user.emailVerified) level++;
  if (user.phoneVerified) level++;
  if (user.addressVerified) level++;
  if (user.identityVerified) level++;
  
  return level;
};

// ✅ NEW: Helper to update user trust score consistently
const updateUserTrustScore = async (userId: string, reason: string) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ User not found for trust score update:', userId);
      return null;
    }

    const oldScore = Number(user.trustScore) || 0;
    const oldLevel = Number(user.verificationLevel) || 0;
    
    // Calculate new scores using the 20-point system
    const newTrustScore = calculateTrustScore(user);
    const newVerificationLevel = calculateVerificationLevel(user);
    
    // ✅ Auto-fix legacy trust scores > 100
    const finalTrustScore = Math.min(newTrustScore, 100);
    
    console.log('🔄 Trust score calculation:', {
      userId,
      reason,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      addressVerified: user.addressVerified,
      identityVerified: user.identityVerified,
      socialVerified: user.socialVerifications?.some((v: any) => v.status === 'verified') || false,
      oldScore,
      newTrustScore,
      finalTrustScore,
      oldLevel,
      newVerificationLevel,
      wasLegacyScore: oldScore > 100
    });

    // Update user with new scores
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          trustScore: finalTrustScore,
          verificationLevel: newVerificationLevel
        }
      },
      { 
        new: true, 
        runValidators: false,
        strict: false
      }
    );

    if (updatedUser) {
      console.log(`✅ Trust score updated for ${updatedUser.email}: ${oldScore} → ${finalTrustScore} (${reason})`);
      if (oldScore > 100) {
        console.log(`🔧 Fixed legacy trust score > 100 for user ${updatedUser.email}`);
      }
      return {
        oldScore,
        newScore: finalTrustScore,
        oldLevel,
        newLevel: newVerificationLevel,
        user: updatedUser,
        wasLegacyScore: oldScore > 100
      };
    }

    return null;
  } catch (error: any) {
    console.error('❌ Error updating trust score:', error);
    return null;
  }
};

// ========================================
// SOCIAL MEDIA VERIFICATION ROUTES
// ========================================

/**
 * @route   POST /api/verification/social/initiate
 * @desc    Initiate social media verification
 * @access  Private
 */
router.post('/social/initiate', verifyJwtToken, initiateSocialVerification);

/**
 * @route   POST /api/verification/social/complete
 * @desc    Complete social media verification 
 * @access  Private
 */
router.post('/social/complete', verifyJwtToken, completeSocialVerification);

/**
 * @route   GET /api/verification/social
 * @desc    Get user's social media verifications
 * @access  Private
 */
router.get('/social', verifyJwtToken, getSocialVerifications);

/**
 * @route   DELETE /api/verification/social/:platform
 * @desc    Remove social media verification
 * @access  Private
 */
router.delete('/social/:platform', verifyJwtToken, removeSocialVerification);

// 🆕 Get available social platforms and methods (updated with 20-point bonus)
router.get('/social/platforms', verifyJwtToken, createAuthenticatedHandler(async (req: AuthenticatedRequest, res) => {
  const platforms = [
    {
      id: 'twitter',
      name: 'Twitter',
      icon: 'twitter',
      methods: [
        { id: 'bio_link', name: 'Add to Bio', difficulty: 'easy', time: '2-3 minutes' },
        { id: 'post_mention', name: 'Create Post', difficulty: 'easy', time: '1-2 minutes' },
        { id: 'username_match', name: 'Username Match', difficulty: 'easy', time: '30 seconds' }
      ]
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: 'instagram',
      methods: [
        { id: 'bio_link', name: 'Add to Bio', difficulty: 'easy', time: '2-3 minutes' },
        { id: 'post_mention', name: 'Create Post/Story', difficulty: 'easy', time: '1-2 minutes' },
        { id: 'username_match', name: 'Username Match', difficulty: 'easy', time: '30 seconds' }
      ]
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: 'facebook',
      methods: [
        { id: 'bio_link', name: 'Add to About', difficulty: 'easy', time: '2-3 minutes' },
        { id: 'post_mention', name: 'Create Post', difficulty: 'easy', time: '1-2 minutes' },
        { id: 'username_match', name: 'Username Match', difficulty: 'easy', time: '30 seconds' }
      ]
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: 'linkedin',
      methods: [
        { id: 'bio_link', name: 'Add to Summary', difficulty: 'easy', time: '2-3 minutes' },
        { id: 'post_mention', name: 'Create Post', difficulty: 'easy', time: '1-2 minutes' },
        { id: 'username_match', name: 'Username Match', difficulty: 'easy', time: '30 seconds' }
      ]
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      icon: 'tiktok',
      methods: [
        { id: 'bio_link', name: 'Add to Bio', difficulty: 'easy', time: '2-3 minutes' },
        { id: 'post_mention', name: 'Create Video', difficulty: 'medium', time: '3-5 minutes' },
        { id: 'username_match', name: 'Username Match', difficulty: 'easy', time: '30 seconds' }
      ]
    }
  ];

  res.json({
    success: true,
    platforms,
    trustScoreBonus: 20, // ✅ Updated to 20 points
    note: 'Verifying any social media platform adds 20 points to your trust score (max 20 from social media)'
  });
}));

// =========================================
// VERIFICATION STATUS & DASHBOARD ROUTES  
// =========================================

/**
 * @route   GET /api/verification/status
 * @desc    Get complete verification status for user (updated 20-point system)
 * @access  Private
 */
router.get('/status', verifyJwtToken, async (req, res) => {
  try {
    const user = await User.findById(req.user?._id).select(
      'trustScore verificationLevel emailVerified phoneVerified addressVerified identityVerified socialVerifications verifications'
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const socialVerifications = user.socialVerifications || [];
    const verifiedSocial = socialVerifications.filter((v: any) => v.status === 'verified');
    const pendingSocial = socialVerifications.filter((v: any) => v.status === 'pending');

    // Calculate verification progress using 20-point system
    const coreVerifications = {
      email: user.emailVerified || false,
      phone: user.phoneVerified || false,
      address: user.addressVerified || false,
      identity: user.identityVerified || false
    };

    const coreCompleted = Object.values(coreVerifications).filter(Boolean).length;
    const socialCompleted = verifiedSocial.length > 0 ? 1 : 0; // Only 0 or 1 in 20-point system
    const calculatedTrustScore = calculateTrustScore(user);

    res.json({
      success: true,
      data: {
        // Overall scores (20-point system)
        trustScore: calculatedTrustScore,
        verificationLevel: user.verificationLevel || 0,
        
        // Core verifications (4-step system, 20 points each)
        core: {
          email: coreVerifications.email,
          phone: coreVerifications.phone,
          address: coreVerifications.address,
          identity: coreVerifications.identity,
          completed: coreCompleted,
          total: 4,
          percentage: Math.round((coreCompleted / 4) * 100),
          points: coreCompleted * 20 // ✅ Updated to 20 points
        },

        // Social media verifications (20 points total if any verified)
        social: {
          total: socialVerifications.length,
          verified: verifiedSocial.length,
          pending: pendingSocial.length,
          failed: socialVerifications.filter((v: any) => v.status === 'failed').length,
          platforms: verifiedSocial.map((v: any) => ({
            platform: v.platform,
            username: v.username,
            verifiedAt: v.verifiedAt
          })),
          availablePlatforms: ['twitter', 'instagram', 'facebook', 'linkedin', 'tiktok'],
          canVerifyMore: verifiedSocial.length === 0, // Only need 1 for full 20 points
          points: socialCompleted * 20, // ✅ 20 points if any social verified
          maxPoints: 20 // ✅ Max 20 points from social
        },

        // Next steps
        nextSteps: [
          ...(!coreVerifications.email ? ['Verify your email address'] : []),
          ...(!coreVerifications.phone ? ['Verify your phone number'] : []),
          ...(!coreVerifications.address ? ['Verify your address'] : []),
          ...(!coreVerifications.identity ? ['Upload identity document'] : []),
          ...(socialCompleted === 0 ? ['Connect a social media account'] : [])
        ],

        // Rewards info (20-point system)
        rewards: {
          currentPoints: calculatedTrustScore,
          maxPossiblePoints: 100, // ✅ Max 100 points (5 × 20)
          nextCoreReward: coreCompleted < 4 ? 20 : null,
          nextSocialReward: socialCompleted === 0 ? 20 : null
        },

        // Trust score breakdown
        trustScoreBreakdown: {
          email: user.emailVerified ? 20 : 0,
          phone: user.phoneVerified ? 20 : 0,
          address: user.addressVerified ? 20 : 0,
          identity: user.identityVerified ? 20 : 0,
          social: verifiedSocial.length > 0 ? 20 : 0,
          total: calculatedTrustScore
        }
      }
    });
  } catch (error: any) {
    console.error('❌ Verification status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch verification status',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/verification/quick-check/:platform
 * @desc    Quick check for specific social platform verification status
 * @access  Private
 */
router.get('/quick-check/:platform', verifyJwtToken, async (req, res) => {
  try {
    const { platform } = req.params;
    
    if (!['twitter', 'instagram', 'facebook', 'linkedin', 'tiktok'].includes(platform)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid platform'
      });
    }

    const user = await User.findById(req.user?._id).select('socialVerifications');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const verification = user.socialVerifications?.find(
      (v: any) => v.platform === platform
    );

    res.json({
      success: true,
      data: {
        platform,
        status: verification?.status || 'not_started',
        username: verification?.username || null,
        verifiedAt: verification?.verifiedAt || null,
        canVerify: !verification || verification.status !== 'verified',
        attemptsUsed: verification?.attempts || 0,
        attemptsRemaining: verification ? Math.max(0, 3 - verification.attempts) : 3
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to check verification status',
      error: error.message
    });
  }
});

// ========================================
// VERIFICATION SYNC & UTILITY ROUTES
// ========================================

/**
 * @route   POST /api/verification/sync
 * @desc    Sync existing email/phone verifications with new 20-point system
 * @access  Private
 */
router.post('/sync', verifyJwtToken, async (req, res) => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('🔄 Syncing verifications for user:', user.email);
    console.log('📋 Current status:', {
      verified: user.verified,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      hasPhoneVerificationCode: !!user.phoneVerificationCode,
      pendingPhoneNumber: user.pendingPhoneNumber,
      mobile: user.mobile,
      trustScore: user.trustScore
    });

    let updated = false;
    const previousTrustScore = user.trustScore || 0;

    // Sync email verification from 'verified' field
    if (user.verified && !user.emailVerified) {
      user.emailVerified = true;
      if (!user.verifications) user.verifications = {};
      if (!user.verifications.email) user.verifications.email = { completed: false };
      user.verifications.email.completed = true;
      user.verifications.email.verifiedAt = new Date();
      updated = true;
      console.log('✅ Synced email verification');
    }

    // Complete phone verification (since user is actively using the app)
    if (user.mobile && !user.phoneVerified) {
      user.phoneVerified = true;
      if (!user.verifications) user.verifications = {};
      if (!user.verifications.phone) user.verifications.phone = { completed: false };
      user.verifications.phone.completed = true;
      user.verifications.phone.verifiedAt = new Date();
      user.verifications.phone.phoneNumber = user.mobile;
      
      // Clear pending phone verification fields
      user.phoneVerificationCode = undefined;
      user.pendingPhoneNumber = undefined;
      
      updated = true;
      console.log('✅ Completed phone verification');
    }

    if (updated) {
      // Fix location field if needed
      if (user.location && user.location.type === 'Point' && !Array.isArray(user.location.coordinates)) {
        user.location = undefined;
      }

      // Calculate new trust score using 20-point system
      const newTrustScore = calculateTrustScore(user);
      const newVerificationLevel = calculateVerificationLevel(user);
      
      user.trustScore = newTrustScore;
      user.verificationLevel = newVerificationLevel;

      const savedUser = await user.save();
      
      console.log('💾 User saved with updated verifications:', {
        emailVerified: savedUser.emailVerified,
        phoneVerified: savedUser.phoneVerified,
        trustScore: savedUser.trustScore,
        verificationLevel: savedUser.verificationLevel,
        socialVerificationsCount: savedUser.socialVerifications?.filter((v: any) => v.status === 'verified').length || 0
      });

      return res.json({
        success: true,
        message: 'Verifications synced successfully! 🎉',
        data: {
          previousTrustScore,
          newTrustScore: savedUser.trustScore,
          trustScoreIncrease: savedUser.trustScore - previousTrustScore,
          verificationBreakdown: {
            email: savedUser.emailVerified ? 20 : 0,
            phone: savedUser.phoneVerified ? 20 : 0,
            address: savedUser.addressVerified ? 20 : 0,
            identity: savedUser.identityVerified ? 20 : 0,
            social: savedUser.socialVerifications?.filter((v: any) => v.status === 'verified').length > 0 ? 20 : 0
          },
          verifications: {
            emailVerified: savedUser.emailVerified,
            phoneVerified: savedUser.phoneVerified,
            addressVerified: savedUser.addressVerified,
            identityVerified: savedUser.identityVerified,
            verificationLevel: savedUser.verificationLevel,
            socialCount: savedUser.socialVerifications?.filter((v: any) => v.status === 'verified').length || 0
          }
        }
      });
    } else {
      return res.json({
        success: true,
        message: 'No verifications needed syncing',
        data: {
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified,
          addressVerified: user.addressVerified,
          identityVerified: user.identityVerified,
          trustScore: user.trustScore,
          verificationLevel: user.verificationLevel
        }
      });
    }

  } catch (error: any) {
    console.error('❌ Sync verifications error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to sync verifications',
      error: error.message
    });
  }
});

// ============================================================================
// IDENTITY VERIFICATION (Updated with 20-point system)
// ============================================================================

// ✅ IDENTITY VERIFICATION - User uploads documents (updated trust scoring)
router.post('/identity', 
  verifyJwtToken, 
  upload.fields([
    { name: 'frontImage', maxCount: 1 },
    { name: 'backImage', maxCount: 1 }
  ]),
  createAuthenticatedHandler(async (req: AuthenticatedRequest, res) => {
    const { documentType, documentNumber } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const userId = req.user._id;
    
    console.log('📄 Verification request received:', {
      documentType,
      userId,
      userEmail: req.user.email,
      files: Object.keys(files || {}),
    });

    // Basic validation
    if (!documentType) {
      return res.status(400).json({
        success: false,
        message: 'Document type is required'
      });
    }

    if (!files?.frontImage?.[0]) {
      return res.status(400).json({
        success: false,
        message: 'Front image is required'
      });
    }

    const uploadId = `ver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create verification record in MongoDB
    const verification = new IdentityVerification({
      uploadId,
      userId,
      documentType,
      documentNumber: documentNumber || '',
      status: 'pending_review',
      frontImagePath: files.frontImage[0].path,
      backImagePath: files.backImage?.[0]?.path || null,
      submittedAt: new Date(),
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        fileInfo: {
          frontImage: {
            originalName: files.frontImage[0].originalname,
            size: files.frontImage[0].size,
            mimetype: files.frontImage[0].mimetype
          },
          backImage: files.backImage?.[0] ? {
            originalName: files.backImage[0].originalname,
            size: files.backImage[0].size,
            mimetype: files.backImage[0].mimetype
          } : undefined
        }
      }
    });

    // Save to MongoDB database
    const savedVerification = await verification.save();
    
    console.log('✅ Verification saved to database:', {
      uploadId: savedVerification.uploadId,
      userId: savedVerification.userId,
      userEmail: req.user.email,
      documentType: savedVerification.documentType,
      status: savedVerification.status
    });

    res.json({
      success: true,
      message: 'Documents uploaded successfully for verification',
      data: {
        uploadId: savedVerification.uploadId,
        documentType: savedVerification.documentType,
        status: savedVerification.status,
        estimatedReviewTime: '24-48 hours',
        submittedAt: savedVerification.submittedAt,
      }
    });
  })
);

// Get verification status by ID
router.get('/status/:uploadId', 
  verifyJwtToken,
  createAuthenticatedHandler(async (req: AuthenticatedRequest, res) => {
    const { uploadId } = req.params;
    const userId = req.user._id;
    
    const verification = await IdentityVerification.findOne({ 
      uploadId, 
      userId 
    });
    
    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'Verification not found'
      });
    }

    console.log('🔍 Verification status check:', {
      uploadId: verification.uploadId,
      status: verification.status,
      submittedAt: verification.submittedAt
    });

    res.json({
      success: true,
      data: verification
    });
  })
);

// Get user's verification history
router.get('/user-verifications', 
  verifyJwtToken,
  createAuthenticatedHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user._id;
    const userVerifications = await IdentityVerification.find({ userId })
      .sort({ submittedAt: -1 });
    
    console.log('📋 Fetching verifications for user:', userId, 'Count:', userVerifications.length);

    res.json({
      success: true,
      data: {
        verifications: userVerifications
      }
    });
  })
);

// ============================================================================
// ENHANCED ADDRESS VERIFICATION (Updated with 20-point system)
// ============================================================================

// ✅ ADDRESS VERIFICATION - Uses your enhanced address controller
router.post('/address', verifyJwtToken, verifyAddress);

// 🆕 NEW: Address search for autocomplete (uses Nominatim)
router.get('/address/search', verifyJwtToken, searchAddress);

// 🆕 NEW: Address validation endpoint (for frontend to test before submitting)
router.post('/address/validate', verifyJwtToken, createAuthenticatedHandler(async (req: AuthenticatedRequest, res) => {
  try {
    const { street, city, state, country } = req.body;
    
    if (!street || !city || !state || !country) {
      return res.status(400).json({
        success: false,
        message: 'All address fields are required for validation'
      });
    }

    // Use the same validation logic from your address controller
    const validateAddress = (street: string, city: string, state: string, country: string) => {
      if (street.length < 3) {
        return { isValid: false, message: 'Street address must be at least 3 characters' };
      }
      
      if (city.length < 2) {
        return { isValid: false, message: 'City name must be at least 2 characters' };
      }
      
      if (state.length < 2) {
        return { isValid: false, message: 'State name must be at least 2 characters' };
      }
      
      if (country.length < 2) {
        return { isValid: false, message: 'Country name must be at least 2 characters' };
      }

      if (/^\d+$/.test(city)) {
        return { isValid: false, message: 'City cannot be only numbers' };
      }

      if (/^\d+$/.test(state)) {
        return { isValid: false, message: 'State cannot be only numbers' };
      }

      // Nigerian states validation
      if (country.toLowerCase().includes('nigeria')) {
        const nigerianStates = [
          'abia', 'adamawa', 'akwa ibom', 'anambra', 'bauchi', 'bayelsa', 'benue', 
          'borno', 'cross river', 'delta', 'ebonyi', 'edo', 'ekiti', 'enugu', 
          'gombe', 'imo', 'jigawa', 'kaduna', 'kano', 'katsina', 'kebbi', 'kogi', 
          'kwara', 'lagos', 'nasarawa', 'niger', 'ogun', 'ondo', 'osun', 'oyo', 
          'plateau', 'rivers', 'sokoto', 'taraba', 'yobe', 'zamfara', 'abuja', 'fct'
        ];

        const stateInput = state.toLowerCase();
        const isValidState = nigerianStates.some(validState => 
          stateInput.includes(validState) || validState.includes(stateInput.replace(/\s+state$/i, ''))
        );
        
        if (!isValidState) {
          return { 
            isValid: false, 
            message: `"${state}" is not a recognized Nigerian state` 
          };
        }
      }

      return { isValid: true, message: 'Address is valid' };
    };

    const validation = validateAddress(street.trim(), city.trim(), state.trim(), country.trim());
    
    res.json({
      success: true,
      validation: {
        isValid: validation.isValid,
        message: validation.message,
        suggestions: !validation.isValid ? [
          'Check spelling of state name',
          'Ensure all fields have minimum required characters',
          'Verify you selected the correct country'
        ] : []
      }
    });

  } catch (error: any) {
    console.error('Address validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Address validation failed',
      error: error.message
    });
  }
}));

// 🆕 NEW: Get complete verification dashboard (updated with 20-point system)
router.get('/dashboard', 
  verifyJwtToken,
  createAuthenticatedHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user._id;
    
    // Get user with all verification fields
    const user = await User.findById(userId).select(
      'fullName email phoneVerified emailVerified identityVerified addressVerified ' +
      'verificationLevel trustScore address socialVerifications'
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get identity verifications
    const identityVerifications = await IdentityVerification.find({ userId })
      .sort({ submittedAt: -1 });

    // ✅ Updated verification steps with 20-point system
    const verificationSteps = [
      { 
        id: 'email', 
        name: 'Email Verification', 
        completed: user.emailVerified || false, 
        points: 20, // ✅ Updated to 20 points
        required: true
      },
      { 
        id: 'phone', 
        name: 'Phone Verification', 
        completed: user.phoneVerified || false, 
        points: 20, // ✅ Updated to 20 points
        required: true
      },
      { 
        id: 'address', 
        name: 'Address Verification', 
        completed: user.addressVerified || false, 
        points: 20, // ✅ Updated to 20 points
        required: true,
        status: user.address?.verificationStatus || 'not_started'
      },
      { 
        id: 'identity', 
        name: 'Identity Verification', 
        completed: user.identityVerified || false, 
        points: 20, // ✅ Updated to 20 points
        required: true,
        status: identityVerifications[0]?.status || 'not_started'
      },
      { 
        id: 'social', 
        name: 'Social Media Verification', 
        completed: user.socialVerifications?.some((v: any) => v.status === 'verified') || false, 
        points: 20, // ✅ Updated to 20 points
        required: false // Optional
      }
    ];

    const completedSteps = verificationSteps.filter(step => step.completed).length;
    const coreSteps = verificationSteps.filter(step => step.required);
    const completedCoreSteps = coreSteps.filter(step => step.completed).length;
    const progressPercentage = Math.round((completedSteps / verificationSteps.length) * 100);

    // Social verifications summary
    const socialVerifications = user.socialVerifications || [];
    const verifiedSocial = socialVerifications.filter((v: any) => v.status === 'verified');

    // ✅ Calculate current trust score using 20-point system
    const calculatedTrustScore = calculateTrustScore(user);

    res.json({
      success: true,
      data: {
        user: {
          fullName: user.fullName,
          email: user.email,
          trustScore: calculatedTrustScore,
          verificationLevel: user.verificationLevel || 0
        },
        progress: {
          completed: completedSteps,
          total: verificationSteps.length,
          coreCompleted: completedCoreSteps,
          coreTotal: coreSteps.length,
          percentage: progressPercentage,
          isFullyVerified: completedCoreSteps === coreSteps.length, // Core steps only
          isMaxTrustScore: calculatedTrustScore === 100
        },
        steps: verificationSteps,
        socialMedia: {
          total: socialVerifications.length,
          verified: verifiedSocial.length,
          platforms: verifiedSocial.map((v: any) => ({
            platform: v.platform,
            username: v.username,
            verifiedAt: v.verifiedAt
          })),
          bonusPoints: verifiedSocial.length > 0 ? 20 : 0 // ✅ 20 points if ANY social verified
        },
        trustScore: {
          current: calculatedTrustScore,
          maximum: 100,
          breakdown: {
            email: user.emailVerified ? 20 : 0,
            phone: user.phoneVerified ? 20 : 0,
            address: user.addressVerified ? 20 : 0,
            identity: user.identityVerified ? 20 : 0,
            social: verifiedSocial.length > 0 ? 20 : 0
          }
        },
        nextSteps: verificationSteps
          .filter(step => !step.completed)
          .map(step => ({
            id: step.id,
            name: step.name,
            points: step.points,
            priority: step.required ? 'high' : 'medium'
          }))
      }
    });
  })
);

// ============================================================================
// ADMIN ROUTES (Updated with 20-point system)
// ============================================================================

// Get all pending verifications (Admin only)
router.get('/admin/pending', 
  verifyJwtToken, 
  requireAdmin,
  createAuthenticatedHandler(async (req: AuthenticatedRequest, res) => {
    const verifications = await IdentityVerification.find({ 
      status: 'pending_review' 
    })
    .populate('userId', 'fullName email')
    .sort({ submittedAt: -1 });
    
    console.log(`📋 Admin ${req.user.email} fetched ${verifications.length} pending verifications`);
    
    res.json({
      success: true,
      count: verifications.length,
      verifications: verifications.map(v => ({
        uploadId: v.uploadId,
        userId: v.userId,
        user: v.userId, // populated user data
        documentType: v.documentType,
        status: v.status,
        submittedAt: v.submittedAt,
        frontImagePath: v.frontImagePath,
        backImagePath: v.backImagePath
      }))
    });
  })
);

// ✅ ADMIN: Review verification (approve/reject) - Updated with 20-point system
router.put('/admin/review/:uploadId', 
  verifyJwtToken, 
  requireAdmin,
  createAuthenticatedHandler(async (req: AuthenticatedRequest, res) => {
    const { uploadId } = req.params;
    const { action, comments = 'Reviewed by admin' } = req.body;
    
    console.log('🔍 Admin review request:', {
      uploadId,
      action,
      adminEmail: req.user.email
    });
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be "approve" or "reject"'
      });
    }
    
    const verification = await IdentityVerification.findOne({ uploadId });
    
    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'Verification not found'
      });
    }
    
    if (verification.status !== 'pending_review') {
      return res.status(400).json({
        success: false,
        message: `Verification is not pending review. Current status: ${verification.status}`
      });
    }
    
    // Update verification
    verification.status = action === 'approve' ? 'verified' : 'rejected';
    verification.reviewedAt = new Date();
    verification.reviewComments = comments;
    verification.reviewedBy = req.user._id;
    
    await verification.save();
    console.log(`✅ Verification ${uploadId} ${action}d by admin ${req.user.email}`);
    
    // ✅ Update user trust score if approved (using 20-point system)
    let trustScoreUpdate = null;
    if (action === 'approve') {
      try {
        console.log('🔄 Starting trust score update for user:', verification.userId);
        
        // Update identity verification status first
        await User.findByIdAndUpdate(
          verification.userId,
          {
            $set: {
              identityVerified: true,
              'verifications.identity': {
                completed: true,
                verifiedAt: new Date(),
                documentType: verification.documentType,
                uploadId: verification.uploadId
              }
            }
          },
          { 
            runValidators: false,
            strict: false
          }
        );
        
        // Then update trust score using the consistent helper
        trustScoreUpdate = await updateUserTrustScore(
          verification.userId.toString(), 
          'Identity verification approved'
        );
          
      } catch (userError: any) {
        console.error('❌ Error updating user trust score:', userError);
        // Continue even if user update fails
      }
    }
    
    res.json({
      success: true,
      message: `Verification ${action}d successfully${action === 'approve' ? ' and trust score updated' : ''}`,
      verification: {
        uploadId: verification.uploadId,
        status: verification.status,
        reviewedAt: verification.reviewedAt,
        reviewComments: verification.reviewComments,
        reviewedBy: req.user.email
      },
      trustScoreUpdate: trustScoreUpdate ? {
        oldScore: trustScoreUpdate.oldScore,
        newScore: trustScoreUpdate.newScore,
        oldLevel: trustScoreUpdate.oldLevel,
        newLevel: trustScoreUpdate.newLevel
      } : null
    });
  })
);

// 🆕 NEW: Admin - Get address verifications pending review
router.get('/admin/addresses/pending', 
  verifyJwtToken,
  requireAdmin,
  createAuthenticatedHandler(async (req: AuthenticatedRequest, res) => {
    const pendingAddresses = await User.find({
      'address.verificationStatus': 'pending_review'
    }).select('fullName email address createdAt');

    console.log(`📋 Admin ${req.user.email} fetched ${pendingAddresses.length} pending address verifications`);

    res.json({
      success: true,
      count: pendingAddresses.length,
      addresses: pendingAddresses.map(user => ({
        userId: user._id,
        fullName: user.fullName,
        email: user.email,
        address: user.address,
        submittedAt: user.address?.lastUpdated || user.createdAt
      }))
    });
  })
);

// 🆕 NEW: Admin - Review address verification (updated with 20-point system)
router.put('/admin/addresses/review/:userId', 
  verifyJwtToken,
  requireAdmin,
  createAuthenticatedHandler(async (req: AuthenticatedRequest, res) => {
    const { userId } = req.params;
    const { action, comments = 'Reviewed by admin' } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be "approve" or "reject"'
      });
    }

    const user = await User.findById(userId);
    if (!user || !user.address) {
      return res.status(404).json({
        success: false,
        message: 'User or address not found'
      });
    }

    if (user.address.verificationStatus !== 'pending_review') {
      return res.status(400).json({
        success: false,
        message: `Address is not pending review. Current status: ${user.address.verificationStatus}`
      });
    }

    // Update address verification
    const updateData: any = {
      'address.verified': action === 'approve',
      'address.verificationStatus': action === 'approve' ? 'verified' : 'rejected',
      'address.reviewComments': comments,
      'address.reviewedAt': new Date(),
      'address.reviewedBy': req.user._id,
      addressVerified: action === 'approve'
    };

    await User.findByIdAndUpdate(userId, updateData);

    // ✅ Update trust score using consistent helper if approved
    let trustScoreUpdate = null;
    if (action === 'approve') {
      trustScoreUpdate = await updateUserTrustScore(
        userId, 
        'Address verification approved'
      );
    }

    console.log(`✅ Address ${action}d by admin ${req.user.email} for user ${user.email}`);

    res.json({
      success: true,
      message: `Address ${action}d successfully`,
      data: {
        userId: userId,
        addressVerified: action === 'approve'
      },
      trustScoreUpdate: trustScoreUpdate ? {
        oldScore: trustScoreUpdate.oldScore,
        newScore: trustScoreUpdate.newScore,
        oldLevel: trustScoreUpdate.oldLevel,
        newLevel: trustScoreUpdate.newLevel
      } : null
    });
  })
);

// Debug user data (Admin only) - Updated with 20-point system
router.get('/admin/debug-user/:userId', 
  verifyJwtToken,
  requireAdmin,
  createAuthenticatedHandler(async (req: AuthenticatedRequest, res) => {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // ✅ Calculate trust score using 20-point system
    const calculatedTrustScore = calculateTrustScore(user);
    const calculatedVerificationLevel = calculateVerificationLevel(user);
    const socialVerified = user.socialVerifications?.some((v: any) => v.status === 'verified') || false;
    
    console.log(`🔍 Admin ${req.user.email} debugging user:`, userId);
    
    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        trustScore: user.trustScore,
        calculatedTrustScore, // What it should be based on verifications
        verificationLevel: user.verificationLevel,
        calculatedVerificationLevel, // What it should be based on verifications
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        identityVerified: user.identityVerified,
        addressVerified: user.addressVerified,
        socialVerified,
        verifications: user.verifications,
        address: user.address,
        socialVerifications: user.socialVerifications,
        createdAt: user.createdAt,
        // ✅ 20-point breakdown
        trustScoreBreakdown: {
          email: user.emailVerified ? 20 : 0,
          phone: user.phoneVerified ? 20 : 0,
          address: user.addressVerified ? 20 : 0,
          identity: user.identityVerified ? 20 : 0,
          social: socialVerified ? 20 : 0,
          total: calculatedTrustScore
        }
      }
    });
  })
);

// ✅ Updated: Max trust for testing (Admin only) - 20-point system
router.get('/admin/max-trust/:userId', 
  verifyJwtToken,
  requireAdmin,
  createAuthenticatedHandler(async (req: AuthenticatedRequest, res) => {
    const { userId } = req.params;
    console.log('🎯 Max trust route hit by admin:', req.user.email, 'for user:', userId);
    
    // Get current user data first
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const oldScore = currentUser.trustScore || 0;
    const oldLevel = currentUser.verificationLevel || 0;
    
    // ✅ Use direct database update to set max trust (100 points, level 4)
    const result = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          trustScore: 100, // ✅ Max 100 points (5 × 20)
          verificationLevel: 4, // Max level (4 core verifications)
          emailVerified: true,
          phoneVerified: true,
          identityVerified: true,
          addressVerified: true,
          // Add a verified social platform for the 5th category
          socialVerifications: [{
            platform: 'twitter',
            username: 'test_user',
            verificationMethod: 'username_match',
            status: 'verified',
            verifiedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
          }]
        }
      },
      { 
        new: true, 
        runValidators: false,
        strict: false
      }
    );
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Failed to update user'
      });
    }
    
    console.log(`🚀 Admin ${req.user.email} maxed out user ${result.email}: Trust ${oldScore} → 100, Level ${oldLevel} → 4`);
    
    res.json({
      success: true,
      message: 'User trust score maxed out for testing! (20-point system: 5 categories × 20 = 100)',
      changes: {
        trustScore: `${oldScore} → 100`,
        verificationLevel: `${oldLevel} → 4`,
        system: '20-point system (Email: 20, Phone: 20, Address: 20, Identity: 20, Social: 20)'
      },
      user: {
        id: result._id,
        email: result.email,
        trustScore: result.trustScore,
        verificationLevel: result.verificationLevel,
        allVerifications: {
          email: result.emailVerified,
          phone: result.phoneVerified,
          address: result.addressVerified,
          identity: result.identityVerified,
          social: result.socialVerifications?.some((v: any) => v.status === 'verified') || false
        }
      }
    });
  })
);

// ✅ NEW: Fix specific user's legacy trust score (Admin only)
router.post('/admin/fix-user-trust/:userId', 
  verifyJwtToken,
  requireAdmin,
  createAuthenticatedHandler(async (req: AuthenticatedRequest, res) => {
    const { userId } = req.params;
    console.log(`🔧 Admin ${req.user.email} fixing trust score for user:`, userId);
    
    try {
      const trustScoreUpdate = await updateUserTrustScore(
        userId, 
        'Admin fix for legacy trust score'
      );
      
      if (!trustScoreUpdate) {
        return res.status(404).json({
          success: false,
          message: 'User not found or update failed'
        });
      }
      
      console.log(`✅ Fixed trust score for user: ${trustScoreUpdate.oldScore} → ${trustScoreUpdate.newScore}`);
      
      res.json({
        success: true,
        message: 'User trust score fixed using 20-point system',
        update: {
          userId,
          oldTrustScore: trustScoreUpdate.oldScore,
          newTrustScore: trustScoreUpdate.newScore,
          oldVerificationLevel: trustScoreUpdate.oldLevel,
          newVerificationLevel: trustScoreUpdate.newLevel,
          wasLegacyScore: trustScoreUpdate.wasLegacyScore,
          system: '20-point system (max 100)'
        }
      });
      
    } catch (error: any) {
      console.error('❌ Error fixing user trust score:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fix user trust score',
        error: error.message
      });
    }
  })
);

// ✅ NEW: Recalculate trust scores for all users (Admin only)
router.post('/admin/recalculate-trust-scores', 
  verifyJwtToken,
  requireAdmin,
  createAuthenticatedHandler(async (req: AuthenticatedRequest, res) => {
    console.log(`🔄 Admin ${req.user.email} initiated trust score recalculation`);
    
    try {
      const users = await User.find({}).select(
        'email emailVerified phoneVerified addressVerified identityVerified socialVerifications trustScore verificationLevel'
      );
      
      let updatedCount = 0;
      const updates = [];
      
      for (const user of users) {
        const oldTrustScore = user.trustScore || 0;
        const oldVerificationLevel = user.verificationLevel || 0;
        
        const newTrustScore = calculateTrustScore(user);
        const newVerificationLevel = calculateVerificationLevel(user);
        
        if (oldTrustScore !== newTrustScore || oldVerificationLevel !== newVerificationLevel) {
          await User.findByIdAndUpdate(
            user._id,
            {
              $set: {
                trustScore: newTrustScore,
                verificationLevel: newVerificationLevel
              }
            },
            { runValidators: false, strict: false }
          );
          
          updatedCount++;
          updates.push({
            email: user.email,
            trustScore: `${oldTrustScore} → ${newTrustScore}`,
            verificationLevel: `${oldVerificationLevel} → ${newVerificationLevel}`
          });
        }
      }
      
      console.log(`✅ Recalculated trust scores for ${updatedCount}/${users.length} users`);
      
      res.json({
        success: true,
        message: `Recalculated trust scores using 20-point system`,
        stats: {
          totalUsers: users.length,
          updatedUsers: updatedCount,
          system: '20-point system (5 categories × 20 = 100 max)'
        },
        updates: updates.slice(0, 10) // Show first 10 updates
      });
      
    } catch (error: any) {
      console.error('❌ Error recalculating trust scores:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to recalculate trust scores',
        error: error.message
      });
    }
  })
);

// Test route to verify admin access is working
router.get('/admin/test', 
  verifyJwtToken,
  requireAdmin,
  createAuthenticatedHandler(async (req: AuthenticatedRequest, res) => {
    res.json({ 
      success: true, 
      message: 'Admin routes are working! (20-point trust score system)',
      admin: req.user.email,
      timestamp: new Date().toISOString(),
      trustScoreSystem: {
        email: 20,
        phone: 20,
        address: 20,
        identity: 20,
        social: 20,
        maximum: 100
      }
    });
  })
);

// ========================================
// DEVELOPMENT/TESTING ROUTES
// ========================================

if (process.env.NODE_ENV === 'development') {
  /**
   * @route   GET /api/verification/test
   * @desc    Test endpoint for verification system
   * @access  Private
   */
  router.get('/test', verifyJwtToken, (req, res) => {
    res.json({
      message: '🧪 Verification System Test Endpoint (20-point system)',
      user: req.user,
      availableRoutes: {
        social: {
          initiate: 'POST /api/verification/social/initiate',
          complete: 'POST /api/verification/social/complete',
          list: 'GET /api/verification/social',
          remove: 'DELETE /api/verification/social/:platform',
          platforms: 'GET /api/verification/social/platforms'
        },
        status: {
          overall: 'GET /api/verification/status',
          quickCheck: 'GET /api/verification/quick-check/:platform',
          dashboard: 'GET /api/verification/dashboard'
        },
        identity: {
          upload: 'POST /api/verification/identity',
          status: 'GET /api/verification/status/:uploadId',
          history: 'GET /api/verification/user-verifications'
        },
        address: {
          verify: 'POST /api/verification/address',
          search: 'GET /api/verification/address/search',
          validate: 'POST /api/verification/address/validate'
        },
        admin: {
          test: 'GET /api/verification/admin/test',
          pending: 'GET /api/verification/admin/pending',
          review: 'PUT /api/verification/admin/review/:uploadId',
          debugUser: 'GET /api/verification/admin/debug-user/:userId',
          fixTrust: 'POST /api/verification/admin/fix-user-trust/:userId',
          maxTrust: 'GET /api/verification/admin/max-trust/:userId',
          recalculate: 'POST /api/verification/admin/recalculate-trust-scores'
        },
        utilities: {
          sync: 'POST /api/verification/sync'
        }
      },
      supportedSocialPlatforms: ['twitter', 'instagram', 'facebook', 'linkedin', 'tiktok'],
      verificationSystem: {
        coreSteps: ['email', 'phone', 'address', 'identity'],
        corePointsPerStep: 20, // ✅ Updated to 20 points
        maxCorePoints: 80, // ✅ Updated to 80 points (4 × 20)
        socialBonusPoints: 20, // ✅ Updated to 20 points
        maxTotalPoints: 100 // ✅ Updated to 100 points (5 × 20)
      }
    });
  });

  /**
   * @route   POST /api/verification/test-social
   * @desc    Add test social verification for development
   * @access  Private
   */
  router.post('/test-social', verifyJwtToken, async (req, res) => {
    try {
      const { platform } = req.body;
      
      if (!platform || !['twitter', 'instagram', 'facebook', 'linkedin', 'tiktok'].includes(platform)) {
        return res.status(400).json({
          success: false,
          message: 'Valid platform required (twitter, instagram, facebook, linkedin, tiktok)'
        });
      }

      const user = await User.findById(req.user?._id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (!user.socialVerifications) {
        user.socialVerifications = [];
      }

      // Remove existing verification for the platform
      user.socialVerifications = user.socialVerifications.filter(
        (v: any) => v.platform !== platform
      );

      // Add new test verification
      user.socialVerifications.push({
        platform,
        username: `test_${platform}_user`,
        profileUrl: `https://${platform}.com/test_${platform}_user`,
        verificationMethod: 'bio_link',
        verificationCode: `SWAAP-TEST${Date.now()}`,
        status: 'verified',
        verifiedAt: new Date(),
        attempts: 1,
        lastAttemptAt: new Date(),
        createdAt: new Date()
      });

      // Fix location field if needed
      if (user.location && user.location.type === 'Point' && !Array.isArray(user.location.coordinates)) {
        user.location = undefined;
      }

      // Update trust score using 20-point system
      const newTrustScore = calculateTrustScore(user);
      const newVerificationLevel = calculateVerificationLevel(user);
      
      user.trustScore = newTrustScore;
      user.verificationLevel = newVerificationLevel;

      const savedUser = await user.save();

      return res.json({
        success: true,
        message: `Test ${platform} verification added successfully (20-point system)`,
        data: {
          platform,
          trustScore: savedUser.trustScore,
          verificationLevel: savedUser.verificationLevel,
          socialVerifications: savedUser.socialVerifications?.filter((v: any) => v.status === 'verified').length || 0,
          trustScoreBreakdown: {
            email: savedUser.emailVerified ? 20 : 0,
            phone: savedUser.phoneVerified ? 20 : 0,
            address: savedUser.addressVerified ? 20 : 0,
            identity: savedUser.identityVerified ? 20 : 0,
            social: savedUser.socialVerifications?.some((v: any) => v.status === 'verified') ? 20 : 0
          }
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to add test verification',
        error: error.message
      });
    }
  });
}

export default router;