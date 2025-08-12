// src/routes/authRoutes.ts - UPDATED for Enhanced Verification System
import express from 'express';
import { registerUser, loginUser, verifyEmail, checkVirtualAccountStatus } from '@/controllers/authController';
import { verifyJwtToken } from '@/middlewares/verifyJwtToken';
import User from '@/models/User';

import { sendEmail, testEmail } from '@/utils/sendEmail';
import { verifyAddress } from '@/controllers/addressController';
import crypto from 'crypto';
import bcrypt from 'bcrypt';



const router = express.Router();

// 🧪 ADD THESE DEBUG ROUTES HERE (after router is declared)
router.get('/', (req, res) => {
  res.json({
    message: 'Auth routes working!',
    availableRoutes: [
      'POST /login',
      'POST /register', 
      'GET /verify',
      'GET /me',
      'POST /test-login'
    ]
  });
});

router.post('/test-login', async (req, res) => {
  try {
    const bcrypt = require('bcrypt');
    const jwt = require('jsonwebtoken');
    
    const { email, password } = req.body;
    console.log('🧪 Testing login for:', email);
    
    const user = await User.findOne({ email }).select('+password');
    console.log('👤 User found:', !!user, 'Role:', user?.role);
    
    if (!user) {
      return res.json({ success: false, error: 'User not found' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('🔒 Password match:', isMatch);
    
    if (!isMatch) {
      return res.json({ success: false, error: 'Password mismatch' });
    }
    
    const token = jwt.sign(
      { _id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      message: 'Login test works!',
      user: { _id: user._id, email: user.email, role: user.role },
      token
    });
    
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// Change POST to GET in authRoutes.ts
// Replace the create-working-admin route with this simpler version
router.get('/create-working-admin', async (req, res) => {
  try {
    const bcrypt = require('bcrypt');
    
    // Delete existing admin
    await User.deleteOne({ email: 'admin@swaap.com' });
    
    // Create new admin with minimal data (no location issues)
    const hashedPassword = await bcrypt.hash('admin123456', 10);
    
    const adminData = {
      fullName: 'Admin',
      email: 'admin@swaap.com',
      mobile: '+2348012345678',
      password: hashedPassword,
      role: 'admin',
      // Skip location field to avoid geo errors
      emailVerified: true,
      phoneVerified: true,
      trustScore: 100,
      verificationLevel: 4
    };
    
    // Use direct MongoDB insert to avoid Mongoose validation issues
    const db = User.db;
    const result = await db.collection('users').insertOne(adminData);
    
    res.json({ 
      success: true, 
      message: 'Admin created successfully!',
      adminId: result.insertedId,
      credentials: {
        email: 'admin@swaap.com',
        password: 'admin123456'
      }
    });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/verify', verifyEmail);

router.get('/ping', (_req, res) => res.send('pong'));

// ✅ ENHANCED: Updated /me route with ALL verification fields including social media
router.get('/me', verifyJwtToken, async (req, res) => {
  try {
    console.log('🔥 /api/auth/me route HIT!');
    console.log('🔥 req.user:', req.user);
    
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // ✅ ENHANCED: Include ALL verification fields including social media
    const user = await User.findById(userId).select(
      '_id fullName email photoURL mobile role verified address level plan successfulSwaps isPro isAdmin walletBalance virtualAccountNumber virtualBankName virtualAccountName virtualAccountActive createdAt updatedAt ' +
      // Core verification fields
      'phoneVerified emailVerified identityVerified addressVerified verificationLevel trustScore ' +
      // Enhanced fields
      'location locationUpdatedAt maxSearchRadius locationSharing nearbyNotifications verifiedUsersOnly lastSeen isActive rating successfulSales ' +
      // Social media verifications
      'socialVerifications'
    );
    
    console.log('🔍 Found user in database:', user);
    console.log('🔍 User verification fields:', {
      phoneVerified: user?.phoneVerified,
      emailVerified: user?.emailVerified,
      trustScore: user?.trustScore,
      verificationLevel: user?.verificationLevel,
      socialCount: user?.socialVerifications?.length || 0
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Calculate social verification summary
    const socialSummary = user.socialVerifications ? {
      total: user.socialVerifications.length,
      verified: user.socialVerifications.filter((v: any) => v.status === 'verified').length,
      pending: user.socialVerifications.filter((v: any) => v.status === 'pending').length,
      platforms: user.socialVerifications
        .filter((v: any) => v.status === 'verified')
        .map((v: any) => ({ platform: v.platform, username: v.username }))
    } : { total: 0, verified: 0, pending: 0, platforms: [] };

    const responseUser = {
      id: user._id,
      _id: user._id, // Include both for compatibility
      fullName: user.fullName,
      email: user.email,
      photoURL: user.photoURL,
      mobile: user.mobile,
      role: user.role,
      verified: user.verified,
      address: user.address,
      level: user.level,
      plan: user.plan,
      successfulSwaps: user.successfulSwaps,
      isPro: user.isPro,
      isAdmin: user.isAdmin,
      walletBalance: user.walletBalance || 0,
      hasVirtualAccount: !!user.virtualAccountNumber,
      virtualAccount: user.virtualAccountNumber ? {
        accountNumber: user.virtualAccountNumber,
        bankName: user.virtualBankName,
        accountName: user.virtualAccountName || user.fullName,
        isActive: user.virtualAccountActive
      } : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      
      // ✅ Core verification fields
      phoneVerified: user.phoneVerified,
      emailVerified: user.emailVerified,
      identityVerified: user.identityVerified,
      addressVerified: user.addressVerified,
      verificationLevel: user.verificationLevel,
      trustScore: user.trustScore,
      
      // ✅ Enhanced verification summary
      verificationProgress: {
        core: {
          email: user.emailVerified || false,
          phone: user.phoneVerified || false,
          address: user.addressVerified || false,
          identity: user.identityVerified || false
        },
        social: socialSummary,
        trustScore: user.trustScore || 0,
        maxTrustScore: 150, // 100 core + 50 social bonus
        level: user.verificationLevel || 0,
        isFullyVerified: user.verificationLevel === 4
      },
      
      // ✅ Location and activity fields
      maxSearchRadius: user.maxSearchRadius,
      locationSharing: user.locationSharing,
      nearbyNotifications: user.nearbyNotifications,
      verifiedUsersOnly: user.verifiedUsersOnly,
      lastSeen: user.lastSeen,
      isActive: user.isActive,
      rating: user.rating,
      successfulSales: user.successfulSales,
      
      // ✅ Social media verifications (filtered for security)
      socialVerifications: user.socialVerifications?.map((v: any) => ({
        platform: v.platform,
        username: v.username,
        status: v.status,
        verifiedAt: v.verifiedAt,
        createdAt: v.createdAt
        // Don't expose verification codes or internal data
      })) || []
    };

    console.log('🔍 Returning enhanced user response:', {
      phoneVerified: responseUser.phoneVerified,
      trustScore: responseUser.trustScore,
      verificationLevel: responseUser.verificationLevel,
      socialVerified: socialSummary.verified
    });

    return res.status(200).json({
      user: responseUser,
    });
  } catch (error) {
    console.error('❌ Fetch user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ NEW: Get user verification dashboard
router.get('/verification-dashboard', verifyJwtToken, async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findById(userId).select(
      'fullName email phoneVerified emailVerified identityVerified addressVerified ' +
      'verificationLevel trustScore socialVerifications address'
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Calculate verification progress
    const verificationSteps = [
      { 
        id: 'email', 
        name: 'Email Verification', 
        completed: user.emailVerified || false, 
        points: 25,
        required: true
      },
      { 
        id: 'phone', 
        name: 'Phone Verification', 
        completed: user.phoneVerified || false, 
        points: 25,
        required: true
      },
      { 
        id: 'address', 
        name: 'Address Verification', 
        completed: user.addressVerified || false, 
        points: 25,
        required: true,
        status: user.address?.verificationStatus || 'not_started'
      },
      { 
        id: 'identity', 
        name: 'Identity Verification', 
        completed: user.identityVerified || false, 
        points: 25,
        required: true
      }
    ];

    const completedSteps = verificationSteps.filter(step => step.completed).length;
    const progressPercentage = Math.round((completedSteps / verificationSteps.length) * 100);

    // Social verifications summary
    const socialVerifications = user.socialVerifications || [];
    const verifiedSocial = socialVerifications.filter((v: any) => v.status === 'verified');

    res.json({
      success: true,
      data: {
        user: {
          fullName: user.fullName,
          email: user.email,
          trustScore: user.trustScore || 0,
          verificationLevel: user.verificationLevel || 0
        },
        progress: {
          completed: completedSteps,
          total: verificationSteps.length,
          percentage: progressPercentage,
          isFullyVerified: completedSteps === verificationSteps.length
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
          bonusPoints: verifiedSocial.length * 10
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

  } catch (error) {
    console.error('❌ Verification dashboard error:', error);
    res.status(500).json({ message: 'Failed to fetch verification dashboard' });
  }
});

// ✅ CHECK virtual account status
router.get('/virtual-account-status', verifyJwtToken, checkVirtualAccountStatus);

// ✅ EMAIL testing endpoint
router.get('/test-email', async (req, res) => {
  try {
    console.log('🧪 Email test endpoint hit');
    const result = await testEmail();
    res.json({
      success: true,
      message: 'Email test completed',
      result
    });
  } catch (error: any) {
    console.error('❌ Email test error:', error);
    res.status(500).json({
      success: false,
      message: 'Email test failed',
      error: error.message
    });
  }
});

// ✅ STORAGE check utility
router.get('/check-storage', (req, res) => {
  res.send(`
    <html>
    <body>
      <h1>Storage Check</h1>
      <button onclick="checkStorage()">Check Token Storage</button>
      <div id="result"></div>
      
      <script>
        function checkStorage() {
          const result = {
            localStorage_token: localStorage.getItem('token') || localStorage.getItem('@token'),
            sessionStorage_token: sessionStorage.getItem('token'),
            cookies: document.cookie
          };
          
          document.getElementById('result').innerHTML = 
            '<pre>' + JSON.stringify(result, null, 2) + '</pre>';
        }
      </script>
    </body>
    </html>
  `);
});

// ✅ ADDRESS verification (legacy endpoint - redirect to new verification routes)
router.post('/verify-address', verifyJwtToken, verifyAddress);


// Forgot password route
// Forgot password route
router.post('/forgot-password', async (req, res) => {
  console.log('🔄 Forgot password endpoint hit');
  
  try {
    const { email } = req.body;

    console.log('🔄 Processing forgot password request for:', email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, we have sent a password reset link.'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000);

    await User.updateOne(
      { _id: user._id },
      { 
        passwordResetToken: resetToken,
        passwordResetExpiry: resetExpiry 
      }
    );

    // ✅ FIXED: Use deep link instead of web URL
    const resetUrl = `swaap://reset-password/${resetToken}`;

    const resetEmailHtml = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #FFD700; margin: 0;">🔑 Reset Your Swaap Password</h1>
            <p style="color: #666; margin: 10px 0;">Swaap Account Recovery</p>
          </div>
          
          <div style="background: #f8f9fa; border: 1px solid #dee2e6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #495057; margin-top: 0;">Reset Your Password</h2>
            <p style="color: #495057; line-height: 1.5;">
              Hi ${user.fullName || 'there'},
            </p>
            <p style="color: #495057; line-height: 1.5;">
              We received a request to reset your password for your Swaap account.
            </p>
            <p style="color: #495057; line-height: 1.5;">
              Tap the button below to reset your password:
            </p>
            <div style="text-align: center; margin: 25px 0;">
              <a href="${resetUrl}" 
                 style="background: #FFD700; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                Reset Password in App
              </a>
            </div>
            <p style="color: #6c757d; font-size: 14px; text-align: center;">
              This link will open the Swaap app automatically
            </p>
          </div>

          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>⏰ Important:</strong> This link expires in 1 hour for security.
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #888; font-size: 12px; margin: 0;">
              This is an automated message from Swaap App.
            </p>
          </div>
        </body>
      </html>
    `;

    await sendEmail(
      user.email,
      '🔑 Reset Your Swaap Password',
      resetEmailHtml,
      `Reset your Swaap password using this link: ${resetUrl}`
    );

    console.log('📧 Password reset email sent successfully');

    res.status(200).json({
      success: true,
      message: 'Password reset email sent! Check your inbox and tap the link to reset your password.'
    });

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request',
      error: error.message
    });
  }
});
// Replace the duplicate /forgot-password route with this /reset-password route
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    console.log('🔄 Processing password reset with token');

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Reset token and new password are required'
      });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpiry: { $gt: new Date() }
    });

    if (!user) {
      console.log('❌ Invalid or expired reset token');
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    console.log('✅ Valid reset token found for user:', user.email);

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user password and clear reset token using updateOne to avoid geo issues
    await User.updateOne(
      { _id: user._id },
      { 
        password: hashedPassword,
        $unset: {
          passwordResetToken: "",
          passwordResetExpiry: ""
        }
      }
    );

    console.log(`✅ Password reset successful for ${user.email}`);

    // Send confirmation email
    try {
      const confirmationHtml = `
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #28a745; margin: 0;">✅ Password Reset Successful</h1>
              <p style="color: #666; margin: 10px 0;">Swaap Account Security</p>
            </div>
            
            <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #155724; margin-top: 0;">Password Updated Successfully</h2>
              <p style="color: #155724; line-height: 1.5;">
                Hi ${user.fullName || 'there'},
              </p>
              <p style="color: #155724; line-height: 1.5;">
                Your Swaap account password has been successfully reset and updated.
              </p>
              <p style="color: #155724; line-height: 1.5;">
                <strong>Time:</strong> ${new Date().toLocaleString()}<br>
                <strong>Account:</strong> ${user.email}
              </p>
            </div>

            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>🔐 Security Tip:</strong> If you didn't make this change, please contact our support team immediately.
              </p>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #888; font-size: 12px; margin: 0;">
                This is an automated security notification from Swaap App.
              </p>
            </div>
          </body>
        </html>
      `;

      await sendEmail(
        user.email,
        '✅ Your Swaap Password Has Been Reset',
        confirmationHtml,
        `Your Swaap password has been successfully reset at ${new Date().toLocaleString()}.`
      );

      console.log('📧 Password reset confirmation email sent');
    } catch (emailError) {
      console.error('⚠️ Failed to send confirmation email (password was still reset):', emailError);
    }

    res.status(200).json({
      success: true,
      message: 'Password reset successful! You can now login with your new password.',
      data: {
        email: user.email,
        resetAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: error.message
    });
  }
});

// // Test password reset email (development only)
// if (process.env.NODE_ENV === 'development') {
//   router.post('/test-reset-email', async (req, res) => {
//     try {
//       const { email } = req.body;
      
//       const testResetLink = 'http://localhost:3000/reset-password?token=TEST_TOKEN_123';
      
//       const testHtml = `
//         <h1>🧪 Test Password Reset Email</h1>
//         <p>This is a test of the password reset email template.</p>
//         <a href="${testResetLink}" style="background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
//           Test Reset Link
//         </a>
//         <p><small>Sent at: ${new Date().toLocaleString()}</small></p>
//       `;

//       const result = await sendEmail(
//         email || 'test@example.com',
//         '🧪 Test Password Reset Email',
//         testHtml
//       );

//       res.json({
//         success: true,
//         message: 'Test reset email sent to Mailtrap',
//         result
//       });
//     } catch (error: any) {
//       res.status(500).json({
//         success: false,
//         error: error.message
//       });
//     }
//   });
// }




export default router;