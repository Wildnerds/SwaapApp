// src/controllers/socialVerificationController.ts - FIXED VERSION
import { Request, Response } from 'express';
import User from '@/models/User';
import crypto from 'crypto';

interface SocialVerificationRequest extends Request {
  body: {
    platform: 'twitter' | 'facebook' | 'instagram' | 'linkedin' | 'tiktok';
    username: string;
    profileUrl?: string;
    verificationMethod: 'bio_link' | 'post_mention' | 'username_match';
  };
  user?: any;
}

interface SocialVerification {
  platform: string;
  username: string;
  profileUrl?: string;
  verificationMethod: string;
  verificationCode: string;
  verifiedAt?: Date;
  status: 'pending' | 'verified' | 'failed';
  attempts: number;
  lastAttemptAt: Date;
}

// ✅ NEW: 20-point trust score calculation (matches your backend routes)
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

export class SocialVerificationService {
  generateVerificationCode(): string {
    return `SWAAP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }

  validateUsername(platform: string, username: string): { isValid: boolean; message?: string } {
    const cleanUsername = username.replace(/^@/, '');

    switch (platform) {
      case 'twitter':
        if (!/^[A-Za-z0-9_]{1,15}$/.test(cleanUsername)) {
          return { isValid: false, message: 'Twitter username must be 1-15 characters, letters, numbers, and underscores only' };
        }
        break;
      case 'instagram':
        if (!/^[A-Za-z0-9_.]{1,30}$/.test(cleanUsername)) {
          return { isValid: false, message: 'Instagram username must be 1-30 characters, letters, numbers, dots, and underscores only' };
        }
        break;
      case 'facebook':
        if (!/^[A-Za-z0-9.]{5,50}$/.test(cleanUsername)) {
          return { isValid: false, message: 'Facebook username must be 5-50 characters, letters, numbers, and dots only' };
        }
        break;
      case 'linkedin':
        if (!/^[A-Za-z0-9-]{3,100}$/.test(cleanUsername)) {
          return { isValid: false, message: 'LinkedIn username must be 3-100 characters, letters, numbers, and hyphens only' };
        }
        break;
      case 'tiktok':
        if (!/^[A-Za-z0-9_.]{2,24}$/.test(cleanUsername)) {
          return { isValid: false, message: 'TikTok username must be 2-24 characters, letters, numbers, dots, and underscores only' };
        }
        break;
      default:
        return { isValid: false, message: 'Unsupported platform' };
    }
    return { isValid: true };
  }

  generateProfileUrl(platform: string, username: string): string {
    const cleanUsername = username.replace(/^@/, '');
    const baseUrls = {
      twitter: 'https://twitter.com/',
      instagram: 'https://instagram.com/',
      facebook: 'https://facebook.com/',
      linkedin: 'https://linkedin.com/in/',
      tiktok: 'https://tiktok.com/@'
    };
    return baseUrls[platform as keyof typeof baseUrls] + cleanUsername;
  }

  getVerificationInstructions(method: string, code: string, platform: string, username: string) {
    const profileUrl = this.generateProfileUrl(platform, username);

    switch (method) {
      case 'bio_link':
        return {
          title: 'Add to Bio/Description',
          instructions: [
            `Go to your ${platform} profile: ${profileUrl}`,
            'Edit your bio/description',
            `Add this verification code anywhere in your bio: ${code}`,
            'Save your changes',
            'Come back and click "Verify" below'
          ],
          estimatedTime: '2-3 minutes'
        };
      case 'post_mention':
        return {
          title: 'Create a Post/Story',
          instructions: [
            `Create a new post on your ${platform} account`,
            `Include this text in your post: "Verifying my account for Swaap App: ${code}"`,
            'Make sure the post is public (not private)',
            'Publish the post',
            'Come back and click "Verify" below'
          ],
          estimatedTime: '1-2 minutes'
        };
      case 'username_match':
        return {
          title: 'Username Match Verification',
          instructions: [
            'We will verify that this username belongs to you',
            'Make sure your profile is public',
            'Your profile name should match your Swaap account name',
            'Click "Verify" below to check'
          ],
          estimatedTime: '30 seconds'
        };
      default:
        return {
          title: 'Unknown Method',
          instructions: ['Please select a valid verification method'],
          estimatedTime: 'Unknown'
        };
    }
  }

  async verifyBioMethod(platform: string, username: string, code: string): Promise<boolean> {
    console.log(`Simulating bio verification for ${platform}/@${username} with code ${code}`);
    return Math.random() > 0.3;
  }

  async verifyPostMethod(platform: string, username: string, code: string): Promise<boolean> {
    console.log(`Simulating post verification for ${platform}/@${username} with code ${code}`);
    return Math.random() > 0.2;
  }

  async verifyUsernameMatch(platform: string, username: string, userFullName: string): Promise<boolean> {
    console.log(`Simulating username match for ${platform}/@${username} against name ${userFullName}`);
    return Math.random() > 0.4;
  }
}

export const initiateSocialVerification = async (req: SocialVerificationRequest, res: Response) => {
  try {
    const { platform, username, profileUrl, verificationMethod } = req.body;
    const userId = req.user?._id;

    console.log('🔗 Initiating social verification:', {
      platform,
      username,
      verificationMethod,
      userId
    });

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!platform || !username || !verificationMethod) {
      return res.status(400).json({
        success: false,
        message: 'Platform, username, and verification method are required'
      });
    }

    const socialService = new SocialVerificationService();
    const usernameValidation = socialService.validateUsername(platform, username);
    if (!usernameValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: usernameValidation.message
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('📋 User found with current verifications:', {
      id: user._id,
      email: user.email,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      addressVerified: user.addressVerified,
      identityVerified: user.identityVerified,
      currentTrustScore: user.trustScore,
      currentVerificationLevel: user.verificationLevel,
      existingSocialVerifications: user.socialVerifications?.length || 0
    });

    const existingVerification = user.socialVerifications?.find(
      (v: any) => v.platform === platform && v.status === 'verified'
    );

    if (existingVerification) {
      return res.status(400).json({
        success: false,
        message: `${platform} account already verified`
      });
    }

    const verificationCode = socialService.generateVerificationCode();
    const generatedProfileUrl = profileUrl || socialService.generateProfileUrl(platform, username);

    const newVerification: SocialVerification = {
      platform,
      username: username.replace(/^@/, ''),
      profileUrl: generatedProfileUrl,
      verificationMethod,
      verificationCode,
      status: 'pending',
      attempts: 0,
      lastAttemptAt: new Date()
    };

    if (!user.socialVerifications) {
      user.socialVerifications = [];
    }

    user.socialVerifications = user.socialVerifications.filter(
      (v: any) => !(v.platform === platform && v.status === 'pending')
    );

    user.socialVerifications.push(newVerification);

    // ✅ FIXED: Use atomic update to ONLY modify social verifications
    await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          socialVerifications: user.socialVerifications
          // ✅ CRITICAL: Don't touch any other fields!
        }
      },
      { 
        runValidators: false,
        strict: false
      }
    );

    const instructions = socialService.getVerificationInstructions(
      verificationMethod,
      verificationCode,
      platform,
      username
    );

    console.log(`✅ Social verification initiated for ${user.email} on ${platform}/@${username} (other verifications preserved)`);

    return res.status(200).json({
      success: true,
      message: 'Social verification initiated',
      data: {
        platform,
        username: username.replace(/^@/, ''),
        profileUrl: generatedProfileUrl,
        verificationMethod,
        verificationCode,
        instructions,
        expiresIn: '24 hours'
      }
    });

  } catch (error: any) {
    console.error('❌ Social verification initiation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to initiate social verification',
      error: error.message
    });
  }
};

export const completeSocialVerification = async (req: Request, res: Response) => {
  try {
    const { platform } = req.body;
    const userId = req.user?._id;

    console.log('✅ Completing social verification:', {
      platform,
      userId
    });

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!platform) {
      return res.status(400).json({
        success: false,
        message: 'Platform is required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('🔍 Current user verification status BEFORE social completion:', {
      id: user._id,
      email: user.email,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      addressVerified: user.addressVerified,
      identityVerified: user.identityVerified,
      currentTrustScore: user.trustScore,
      currentVerificationLevel: user.verificationLevel,
      socialVerificationsCount: user.socialVerifications?.length || 0
    });

    const verification = user.socialVerifications?.find(
      (v: any) => v.platform === platform && v.status === 'pending'
    );

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'No pending verification found for this platform'
      });
    }

    if (verification.attempts >= 3) {
      return res.status(429).json({
        success: false,
        message: 'Maximum verification attempts exceeded. Please start over.'
      });
    }

    verification.attempts += 1;
    verification.lastAttemptAt = new Date();

    const socialService = new SocialVerificationService();
    let verificationSuccess = false;

    switch (verification.verificationMethod) {
      case 'bio_link':
        verificationSuccess = await socialService.verifyBioMethod(
          platform,
          verification.username,
          verification.verificationCode
        );
        break;
      case 'post_mention':
        verificationSuccess = await socialService.verifyPostMethod(
          platform,
          verification.username,
          verification.verificationCode
        );
        break;
      case 'username_match':
        verificationSuccess = await socialService.verifyUsernameMatch(
          platform,
          verification.username,
          user.fullName
        );
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid verification method'
        });
    }

    if (verificationSuccess) {
      verification.status = 'verified';
      verification.verifiedAt = new Date();

      const oldTrustScore = user.trustScore || 0;
      const oldVerificationLevel = user.verificationLevel || 0;
      
      // ✅ FIXED: Calculate new trust score based on ALL verifications (including this new social one)
      const newTrustScore = calculateTrustScore(user);
      const newVerificationLevel = calculateVerificationLevel(user);

      console.log('🔍 Trust score calculation:', {
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        addressVerified: user.addressVerified,
        identityVerified: user.identityVerified,
        socialVerified: user.socialVerifications?.some((v: any) => v.status === 'verified') || false,
        oldTrustScore,
        newTrustScore,
        oldVerificationLevel,
        newVerificationLevel
      });

      // ✅ FIXED: Use atomic update to ONLY modify social verifications and trust scores
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            socialVerifications: user.socialVerifications,
            trustScore: newTrustScore,
            verificationLevel: newVerificationLevel
            // ✅ CRITICAL: Don't touch emailVerified, phoneVerified, addressVerified, identityVerified!
          }
        },
        { 
          new: true,
          runValidators: false,
          strict: false
        }
      );

      console.log('🔍 User AFTER social verification completion:', {
        id: updatedUser._id,
        emailVerified: updatedUser.emailVerified,
        phoneVerified: updatedUser.phoneVerified,
        addressVerified: updatedUser.addressVerified,
        identityVerified: updatedUser.identityVerified,
        trustScore: updatedUser.trustScore,
        verificationLevel: updatedUser.verificationLevel,
        socialVerificationsCount: updatedUser.socialVerifications?.length || 0,
        verifiedSocialCount: updatedUser.socialVerifications?.filter((v: any) => v.status === 'verified').length || 0
      });

      console.log(`✅ Social verification completed for ${updatedUser.email} on ${platform}/@${verification.username} - ALL OTHER VERIFICATIONS PRESERVED`);

      return res.status(200).json({
        success: true,
        message: `${platform} account verified successfully!`,
        data: {
          platform,
          username: verification.username,
          verifiedAt: verification.verifiedAt,
          oldTrustScore,
          newTrustScore: updatedUser.trustScore,
          trustScoreIncrease: updatedUser.trustScore - oldTrustScore,
          newVerificationLevel: updatedUser.verificationLevel,
          preservedVerifications: {
            email: updatedUser.emailVerified,
            phone: updatedUser.phoneVerified,
            address: updatedUser.addressVerified,
            identity: updatedUser.identityVerified
          }
        }
      });
    } else {
      if (verification.attempts >= 3) {
        verification.status = 'failed';
      }

      // ✅ FIXED: Only update social verifications on failure
      await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            socialVerifications: user.socialVerifications
            // ✅ Don't touch other fields on failure either
          }
        },
        { 
          runValidators: false,
          strict: false
        }
      );

      return res.status(400).json({
        success: false,
        message: `Verification failed. ${verification.attempts}/3 attempts used.`,
        data: {
          attemptsRemaining: Math.max(0, 3 - verification.attempts),
          canRetry: verification.attempts < 3,
          nextSteps: verification.attempts < 3 
            ? ['Double-check that you followed the instructions', 'Make sure your profile is public', 'Try again']
            : ['Start a new verification process', 'Try a different verification method']
        }
      });
    }

  } catch (error: any) {
    console.error('❌ Social verification completion error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to complete social verification',
      error: error.message
    });
  }
};

export const getSocialVerifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const user = await User.findById(userId).select('socialVerifications');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const verifications = user.socialVerifications || [];
    const verifiedPlatforms = verifications.filter((v: any) => v.status === 'verified');
    const pendingPlatforms = verifications.filter((v: any) => v.status === 'pending');

    console.log('📋 Social verifications fetched:', {
      userId,
      totalVerifications: verifications.length,
      verifiedCount: verifiedPlatforms.length,
      pendingCount: pendingPlatforms.length
    });

    return res.status(200).json({
      success: true,
      data: {
        verifications,
        summary: {
          total: verifications.length,
          verified: verifiedPlatforms.length,
          pending: pendingPlatforms.length,
          verifiedPlatforms: verifiedPlatforms.map((v: any) => ({
            platform: v.platform,
            username: v.username,
            verifiedAt: v.verifiedAt
          }))
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Get social verifications error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch social verifications',
      error: error.message
    });
  }
};

export const removeSocialVerification = async (req: Request, res: Response) => {
  try {
    const { platform } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.socialVerifications) {
      return res.status(404).json({
        success: false,
        message: 'No social verifications found'
      });
    }

    const verificationToRemove = user.socialVerifications.find(
      (v: any) => v.platform === platform
    );

    const initialLength = user.socialVerifications.length;
    user.socialVerifications = user.socialVerifications.filter(
      (v: any) => v.platform !== platform
    );

    if (user.socialVerifications.length === initialLength) {
      return res.status(404).json({
        success: false,
        message: `No ${platform} verification found`
      });
    }

    // ✅ FIXED: Recalculate trust score properly after removing social verification
    const newTrustScore = calculateTrustScore(user);
    const newVerificationLevel = calculateVerificationLevel(user);

    // ✅ FIXED: Use atomic update to only modify necessary fields
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          socialVerifications: user.socialVerifications,
          trustScore: newTrustScore,
          verificationLevel: newVerificationLevel
          // ✅ Don't touch core verification fields
        }
      },
      { 
        new: true,
        runValidators: false,
        strict: false
      }
    );

    console.log(`🗑️ Social verification removed for ${user.email} on ${platform} - trust score recalculated`);

    return res.status(200).json({
      success: true,
      message: `${platform} verification removed successfully`,
      data: {
        platform,
        oldTrustScore: user.trustScore,
        newTrustScore: updatedUser.trustScore,
        trustScoreChange: updatedUser.trustScore - (user.trustScore || 0)
      }
    });

  } catch (error: any) {
    console.error('❌ Remove social verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove social verification',
      error: error.message
    });
  }
};