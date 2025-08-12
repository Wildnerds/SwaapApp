import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import * as yup from 'yup';
import axios from 'axios';
import User from '../models/User';
import { WalletTransaction } from '../models/WalletTransaction';
import { generateToken } from '../utils/jwt'; // ✅ Correct named import
import { sendEmail } from '../utils/sendEmail';
import { Country, State, City } from 'country-state-city';
import { smsService } from '../services/smsService'; // ✅ Import SMS service



// 👇 Yup schema for registration
const registrationSchema = yup.object().shape({
  fullName: yup.string().required('Full name is required'),
  email: yup.string().email('Invalid email format').required('Email is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
  mobile: yup.string().required('Mobile number is required'),
});

// ✅ HELPER FUNCTION: Create Virtual Account for User
async function createVirtualAccountForUser(userId: string, userEmail: string, userFullName: string, userMobile: string) {
  try {
    console.log(`🏦 Creating virtual account for user: ${userEmail}`);

    // Create Paystack customer
    const customerRes = await axios.post('https://api.paystack.co/customer', {
      email: userEmail,
      first_name: userFullName?.split(' ')[0] || 'User',
      last_name: userFullName?.split(' ').slice(1).join(' ') || '',
      phone: userMobile || '',
      metadata: {
        user_id: userId,
        registration_date: new Date().toISOString(),
      }
    }, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      }
    });

    const customerCode = customerRes.data.data.customer_code;

    // Create dedicated virtual account
    const virtualAccountRes = await axios.post('https://api.paystack.co/dedicated_account', {
      customer: customerCode,
      preferred_bank: 'wema-bank',
    }, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      }
    });

    const virtualAccountData = virtualAccountRes.data.data;

    // Update user with virtual account details
    await User.findByIdAndUpdate(userId, {
      paystackCustomerCode: customerCode,
      virtualAccountNumber: virtualAccountData.account_number,
      virtualAccountName: virtualAccountData.account_name,
      virtualBankName: virtualAccountData.bank.name,
      virtualAccountId: virtualAccountData.id,
      virtualAccountActive: true,
    });

    // Log the virtual account creation
    await WalletTransaction.create({
      user: userId,
      reference: `VA-CREATED-${Date.now()}`,
      amount: 0,
      status: 'success',
      type: 'fund',
      channel: 'system',
      currency: 'NGN',
      narration: 'Virtual account created during registration',
      verified: true,
    });

    console.log(`✅ Virtual account created successfully for ${userEmail}: ${virtualAccountData.account_number}`);

    return {
      success: true,
      accountDetails: {
        accountNumber: virtualAccountData.account_number,
        bankName: virtualAccountData.bank.name,
        accountName: virtualAccountData.account_name,
      }
    };

  } catch (error: any) {
    console.error(`❌ Virtual account creation failed for ${userEmail}:`, error?.response?.data || error.message);
    return {
      success: false,
      error: error?.response?.data?.message || 'Failed to create virtual account'
    };
  }
}

// ✅ REGISTER WITH AUTOMATIC VIRTUAL ACCOUNT CREATION
// TEMPORARY DEBUG VERSION - Replace your registerUser function with this
// Replace your registerUser function with this version
export const registerUser = async (req: Request, res: Response) => {
  try {
    await registrationSchema.validate(req.body, { abortEarly: false });
    const { fullName, email, password, mobile } = req.body;

    console.log('🔐 Registration attempt received:', {
      fullName,
      email,
      mobile,
      passwordLength: password?.length,
    });

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already in use.' });
    }

    console.log('🔐 Registration - Password will be hashed by model middleware');

    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyExpires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours

    console.log('📝 Creating user with verification token:', verifyToken.substring(0, 10) + '...');

    // Create user - model will hash the password automatically
    const user = await User.create({
      fullName,
      email,
      mobile,
      password,
      role: 'user',
      verified: false,
      verifyToken,
      verifyExpires,
      walletBalance: 0,
      virtualAccountActive: false,
    });

    console.log(`✅ User created successfully: ${email} with ID: ${user._id}`);

    // Generate JWT token
    const token = generateToken({
      _id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // TEMPORARILY DISABLE virtual account creation for debugging
    console.log('⏭️ Skipping virtual account creation for debugging');

    // Send verification email
    console.log('📧 Preparing verification email...');
    const verificationLink = `${process.env.API_BASE_URL}/api/auth/verify?token=${verifyToken}&email=${email}`;
    
    console.log('🔗 Verification link:', verificationLink);

    const html = `
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
          <h1 style="color: #333;">Welcome to Swaap, ${fullName}! 🎉</h1>
          <p style="font-size: 16px; color: #666; margin: 20px 0;">
            Your account has been created successfully!
          </p>
          
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #333; margin: 10px 0;">
              <strong>📱 Your wallet is ready to use</strong>
            </p>
            <p style="color: #333; margin: 10px 0;">
              <strong>🏦 Your virtual account is being set up</strong>
            </p>
          </div>
          
          <p style="color: #333; margin: 20px 0;">
            Click the button below to verify your email address:
          </p>
          
          <a href="${verificationLink}" 
             style="display: inline-block; background-color: #4CAF50; color: white; padding: 15px 30px; 
                    text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0;">
            ✅ Verify Email Address
          </a>
          
          <p style="font-size: 12px; color: #999; margin-top: 30px;">
            If you can't click the button, copy and paste this link into your browser:<br>
            <span style="word-break: break-all;">${verificationLink}</span>
          </p>
          
          <p style="font-size: 12px; color: #999;">
            This verification link expires in 24 hours.
          </p>
        </div>
      </body>
      </html>
    `;
    
    console.log('📧 Attempting to send verification email...');
    
    try {
      const emailResult = await sendEmail(
        email, 
        'Welcome to Swaap - Verify your email address', 
        html, 
        `Welcome to Swaap! Please verify your email by visiting: ${verificationLink}`
      );
      
      if (emailResult.success) {
        console.log(`✅ Welcome email sent successfully to ${email}`);
      } else {
        console.error(`❌ Failed to send welcome email to ${email}:`, emailResult.error);
      }
    } catch (emailError) {
      console.error(`❌ Email sending error for ${email}:`, emailError);
    }

    console.log('🎯 Registration completed, sending response...');

    return res.status(201).json({
      message: 'Registration successful! Please check your email to verify your account.',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        walletBalance: user.walletBalance,
        verified: user.verified,
      },
      emailSent: true,
      verificationRequired: true,
    });

  } catch (error: any) {
    console.error('❌ Registration error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
// ✅ NEW: PHONE VERIFICATION FUNCTIONS
export const sendPhoneVerification = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const { phoneNumber } = req.body;

    console.log(`📱 Phone verification request from user: ${req.user?.email}`);
    console.log(`📞 Phone number: ${phoneNumber}`);

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: 'User not authenticated' 
      });
    }

    if (!phoneNumber) {
      return res.status(400).json({ 
        success: false,
        message: 'Phone number is required' 
      });
    }

    // Format phone number for Nigerian users
    const formattedPhone = smsService.formatPhoneNumber(phoneNumber);
    console.log(`📱 Formatted phone: ${formattedPhone}`);

    // Validate Nigerian phone number
    if (!smsService.isValidNigerianNumber(formattedPhone)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid Nigerian phone number. Please enter a valid number (e.g., 08012345678, 8012345678, or +2348012345678)' 
      });
    }

    // Check if phone number is already in use by another user
    const existingUser = await User.findOne({ 
      mobile: formattedPhone,
      _id: { $ne: userId } 
    });

    if (existingUser) {
      return res.status(409).json({ 
        success: false,
        message: 'This phone number is already registered to another account' 
      });
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`🔐 Generated verification code: ${verificationCode}`);
    
    // Store verification data in user document with 5-minute expiry
    await User.findByIdAndUpdate(userId, {
      phoneVerificationCode: verificationCode,
      phoneVerificationExpires: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      pendingPhoneNumber: formattedPhone,
    });

    console.log(`💾 Verification data stored for user: ${userId}`);

    // Send SMS using the SMS service
    try {
      await smsService.sendVerificationCode(formattedPhone, verificationCode);
      console.log(`✅ SMS sent successfully to ${formattedPhone}`);
    } catch (smsError: any) {
      console.error('❌ SMS sending failed:', smsError);
      
      // Clean up stored verification data on SMS failure
      await User.findByIdAndUpdate(userId, {
        $unset: {
          phoneVerificationCode: 1,
          phoneVerificationExpires: 1,
          pendingPhoneNumber: 1,
        }
      });
      
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification code. Please try again.',
        error: process.env.NODE_ENV === 'development' ? smsError.message : undefined
      });
    }

    res.json({ 
      success: true,
      message: 'Verification code sent successfully',
      phoneNumber: formattedPhone,
      displayNumber: smsService.getDisplayFormat(formattedPhone),
      expiresIn: '5 minutes',
      // Include development helpers only in dev mode
      ...(process.env.NODE_ENV === 'development' && { 
        devNote: 'Check server console for verification code',
        devCode: verificationCode 
      })
    });

  } catch (error: any) {
    console.error('❌ Send phone verification error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const verifyPhoneCode = async (req: Request, res: Response) => {
  console.log('🚨🚨🚨 PHONE VERIFICATION FUNCTION CALLED - NEW VERSION 🚨🚨🚨');
  console.log('📞 Received data:', { phoneNumber: req.body.phoneNumber, code: req.body.verificationCode });
  
  try {
    const userId = req.user?._id;
    const { phoneNumber, verificationCode } = req.body;

    console.log(`🔐 Phone verification attempt from user: ${req.user?.email}`);
    console.log(`📞 Phone: ${phoneNumber}, Code: ${verificationCode}`);

    if (!userId || !phoneNumber || !verificationCode) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields' 
      });
    }

    if (verificationCode.length !== 6 || !/^\d{6}$/.test(verificationCode)) {
      return res.status(400).json({ 
        success: false,
        message: 'Verification code must be exactly 6 digits' 
      });
    }

    // Format phone number
    const formattedPhone = smsService.formatPhoneNumber(phoneNumber);

    // Get user and verify code
    const user = await User.findById(userId).select('+phoneVerificationCode +phoneVerificationExpires +pendingPhoneNumber');
    
    if (!user || !user.phoneVerificationCode) {
      return res.status(400).json({ 
        success: false,
        message: 'No verification code found' 
      });
    }

    // Check code validity
    if (user.phoneVerificationCode !== verificationCode) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid verification code' 
      });
    }

    if (user.phoneVerificationExpires && user.phoneVerificationExpires < new Date()) {
      return res.status(400).json({ 
        success: false,
        message: 'Verification code expired' 
      });
    }

    console.log(`✅ Code verified, updating user...`);

    // ✅ SIMPLE DIRECT UPDATE - Skip middleware completely
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        mobile: formattedPhone,
        phoneVerified: true,
        emailVerified: true,
        trustScore: 25,  // Direct: 10 (email) + 15 (phone)
        verificationLevel: 'BASIC',
        // Clear verification fields
        phoneVerificationCode: undefined,
        phoneVerificationExpires: undefined,
        pendingPhoneNumber: undefined,
      },
      { 
        new: true,
        select: '_id fullName email photoURL mobile phoneVerified emailVerified bvnVerified identityVerified addressVerified verificationLevel trustScore address level plan successfulSwaps isAdmin isPro verified createdAt updatedAt walletBalance virtualAccountActive'
      }
    );

    if (!updatedUser) {
      return res.status(500).json({ 
        success: false, 
        message: 'Update failed' 
      });
    }

    console.log(`✅ User updated successfully:`, {
      phoneVerified: updatedUser.phoneVerified,
      trustScore: updatedUser.trustScore,
      verificationLevel: updatedUser.verificationLevel
    });

    res.json({ 
      success: true,
      message: 'Phone number verified successfully',
      user: updatedUser,
      displayNumber: smsService.getDisplayFormat(formattedPhone)
    });

  } catch (error: any) {
    console.error('❌ Verify phone error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
// ✅ NEW ENDPOINT: Check Virtual Account Status
export const checkVirtualAccountStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findById(userId).select('virtualAccountNumber virtualBankName virtualAccountName virtualAccountActive fullName walletBalance');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.virtualAccountNumber) {
      return res.status(200).json({
        hasVirtualAccount: false,
        status: 'pending',
        message: 'Virtual account is still being created. Please check again in a few moments.'
      });
    }

    return res.status(200).json({
      hasVirtualAccount: true,
      status: user.virtualAccountActive ? 'active' : 'inactive',
      accountDetails: {
        accountNumber: user.virtualAccountNumber,
        bankName: user.virtualBankName,
        accountName: user.virtualAccountName || user.fullName,
      },
      walletBalance: user.walletBalance || 0,
      message: 'Virtual account is ready! You can now receive money directly to your wallet.'
    });

  } catch (error) {
    console.error('❌ Check virtual account status error:', error);
    return res.status(500).json({ message: 'Failed to check virtual account status' });
  }
};

// ✅ EMAIL VERIFICATION (UNCHANGED)
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token, email } = req.query;

    // Add detailed logging
    console.log('=== EMAIL VERIFICATION DEBUG ===');
    console.log('Raw query params:', req.query);
    console.log('Parsed - Token:', token, 'Type:', typeof token);
    console.log('Parsed - Email:', email, 'Type:', typeof email);

    if (!token || !email) {
      console.log('❌ Missing token or email');
      return res.status(400).send('Missing token or email.');
    }

    // First, let's see what users exist
    const allUsers = await User.find({}).select('email verifyToken verified');
    console.log('All users in DB:', allUsers);

    // Find user with detailed logging
    const user = await User.findOne({
      email: email.toString(),
      verifyToken: token.toString(),
    });

    console.log('User found with both email and token:', user ? 'Yes' : 'No');

    if (!user) {
      // Try to find user by email only
      const userByEmail = await User.findOne({ email: email.toString() });
      console.log('User exists by email only:', userByEmail ? 'Yes' : 'No');
      if (userByEmail) {
        console.log('❌ Token mismatch!');
        console.log('  - URL Token:', token);
        console.log('  - DB Token:', userByEmail.verifyToken);
        console.log('  - Tokens match:', token.toString() === userByEmail.verifyToken);
      }
      return res.status(400).send('Invalid verification link.');
    }

    console.log('✅ User found:', {
      id: user._id,
      email: user.email,
      verified: user.verified,
      verifyToken: user.verifyToken,
      verifyExpires: user.verifyExpires
    });

    if (user.verified) {
      console.log('⚠️ User already verified');
      return res.send('Your email is already verified.');
    }

    if (user.verifyExpires && user.verifyExpires < new Date()) {
      console.log('❌ Token expired');
      console.log('  - Expires:', user.verifyExpires);
      console.log('  - Now:', new Date());
      return res.status(400).send('Verification link expired.');
    }

    // Update user with more explicit method
    console.log('🔄 Updating user verification status...');
    
    // Try using updateOne instead of save()
    const updateResult = await User.findOneAndUpdate(
      { _id: user._id },
      { 
        $set: { verified: true },
        $unset: { verifyToken: "", verifyExpires: "" }
      }
    );
    
    console.log('Update result:', updateResult);

    // Verify the update worked
    const updatedUser = await User.findById(user._id);
    console.log('User after update:', {
      id: updatedUser._id,
      verified: updatedUser.verified,
      verifyToken: updatedUser.verifyToken,
      verifyExpires: updatedUser.verifyExpires
    });

    return res.send(`
      <html>
        <head><title>Verified</title></head>
        <body>
          <h1>✅ Email verified!</h1>
          <p>You can now go back to the app and log in.</p>
          <script>
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('❌ Verification error:', err);
    return res.status(500).send('Server error.');
  }
};

// ✅ LOGIN (UNCHANGED)
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Login attempt received:', {
      email: email,
      passwordLength: password?.length,
    });

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required.' 
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide a valid email address.' 
      });
    }

    const searchEmail = email.toLowerCase().trim();
    console.log('🔍 Searching for user with email:', searchEmail);

    // Find user by email
    const user = await User.findOne({ 
      email: searchEmail
    }).select('+password');

    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials.' 
      });
    }

    console.log('✅ User found:', {
      id: user._id,
      email: user.email,
      verified: user.verified,
    }
  
  );

    // 🚨 FIXED: Use the model's comparePassword method
    console.log('🔒 Comparing passwords using model method...');
    const isMatch = await user.comparePassword(password);
    
    console.log('🔓 Password comparison result:', isMatch);
    
    if (!isMatch) {
      console.log('❌ Password does not match');
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials.' 
      });
    }

    console.log('✅ Password matches! Proceeding with login...');

    // Generate JWT token
    const tokenPayload = {
      _id: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const token = generateToken(tokenPayload);

    if (!token) {
      throw new Error('Failed to generate authentication token');
    }

    // Update last login timestamp
    await User.findByIdAndUpdate(user._id, { 
      lastLogin: new Date() 
    });

    // Prepare user data for response
    const userData = {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    // Set token in httpOnly cookie
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    console.log('✅ Login successful for user:', user.email);

    console.log('🚀 About to send response:', {
    success: true,
    user: {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    // ... other user data
  },
  token: token
});

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: userData,
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error. Please try again later.' 
    });
  }
};





// ✅ GET /auth/me — Return MongoDB user from JWT
export const getCurrentUser = async (req: Request, res: Response) => {
   console.log('🚀🚀🚀 UPDATED getCurrentUser function called with PHOTO URL support! 🚀🚀🚀');
  console.log('🔍 getCurrentUser called');
  console.log('🚀 UPDATED getCurrentUser function called - WITH photoURL support!');
  try {
    console.log('🔍 getCurrentUser called');
    console.log('🔍 req.user:', req.user);
    
    const userId = req.user?._id;
    console.log('🔍 userId:', userId);

    if (!userId) {
      console.log('❌ No userId in request');
      if (!res.headersSent) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Missing user ID' });
      }
      return;
    }

    console.log('🔍 Looking for user in database...');
    // ✅ FIXED: Include ALL the fields that your frontend needs
    const mongoUser = await User.findById(userId).select(
      '_id email fullName photoURL role mobile verified address level plan successfulSwaps isPro isAdmin createdAt updatedAt'
    );
    console.log('🔍 Found user:', mongoUser);

    if (!mongoUser) {
      console.log('❌ User not found in database');
      if (!res.headersSent) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      return;
    }

    console.log('✅ Returning user data');
    if (!res.headersSent) {
      return res.status(200).json({
        success: true,
        user: {
          // ✅ FIXED: Include ALL the fields
          id: mongoUser._id.toString(),
          _id: mongoUser._id.toString(), // Include both for compatibility
          email: mongoUser.email,
          fullName: mongoUser.fullName,
          photoURL: mongoUser.photoURL, // ✅ CRITICAL: Include photoURL
          mobile: mongoUser.mobile,
          role: mongoUser.role,
          verified: mongoUser.verified,
          address: mongoUser.address, // ✅ Include address
          level: mongoUser.level, // ✅ Include virtual fields
          plan: mongoUser.plan,
          successfulSwaps: mongoUser.successfulSwaps,
          isPro: mongoUser.isPro,
          isAdmin: mongoUser.isAdmin,
          createdAt: mongoUser.createdAt,
          updatedAt: mongoUser.updatedAt,
        },
      });
    }
  } catch (error) {
    console.error('❌ getCurrentUser failed:', error);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }
};

// PUT /api/users/me
function isValidLocation(countryCode: string, stateCode: string, cityName: string): boolean {
  const country = Country.getCountryByCode(countryCode);
  if (!country) return false;

  const states = State.getStatesOfCountry(countryCode);
  const matchedState = states.find(s => s.isoCode === stateCode);
  if (!matchedState) return false;

  const cities = City.getCitiesOfState(countryCode, stateCode);
  const matchedCity = cities.find(c => c.name.toLowerCase() === cityName.toLowerCase());

  return Boolean(matchedCity);
}

export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const { fullName, displayName, email, photoURL, address } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const updateFields: any = {};

    // Handle name fields (accept both fullName and displayName)
    if (fullName || displayName) {
      updateFields.fullName = fullName || displayName;
    }

    if (email) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }
      updateFields.email = email.toLowerCase().trim();
    }

    if (photoURL) {
      updateFields.photoURL = photoURL;
    }

    // Handle address - make fields optional
    if (address) {
      const addressUpdate: any = {};
      
      if (address.street !== undefined) addressUpdate.street = address.street?.trim() || '';
      if (address.city !== undefined) addressUpdate.city = address.city?.trim() || '';
      if (address.state !== undefined) addressUpdate.state = address.state?.trim() || '';
      if (address.country !== undefined) addressUpdate.country = address.country?.trim() || '';
      
      // Only validate if all required fields are provided
      if (address.country && address.state && address.city) {
        const locationValid = isValidLocation(address.country, address.state, address.city);
        addressUpdate.verified = locationValid;
        
        if (!locationValid) {
          console.log(`Location validation failed for: ${address.country}, ${address.state}, ${address.city}`);
          // Still allow update but mark as unverified
        }
      } else {
        // Partial address update - mark as unverified
        addressUpdate.verified = false;
      }

      updateFields.address = addressUpdate;
    }

    // Check if there are any fields to update
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: 'No fields provided for update.' });
    }

    console.log('Updating user with fields:', updateFields);

    // Update user in database
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateFields,
      { 
        new: true, 
        runValidators: true,
        select: '_id fullName email photoURL mobile address level plan successfulSwaps isAdmin isPro verified createdAt updatedAt'
      }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('User updated successfully:', updatedUser.email);

    // Generate new token with updated info
    const token = generateToken({
      _id: updatedUser._id.toString(),
      email: updatedUser.email,
      role: updatedUser.isAdmin ? 'admin' : 'user',
    });

    console.log('🔍 Complete updated user before response:', JSON.stringify(updatedUser, null, 2));
    // Return success response
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser,
      token,
    });

  } catch (err: any) {
    console.error('Update profile error:', err);

    let statusCode = 500;
    let errorMessage = 'Failed to update profile';

    if (err instanceof Error) {
      if (err.name === 'ValidationError') {
        statusCode = 400;
        errorMessage = 'Validation error: ' + err.message;
      } else if (err.code === 11000) {
        statusCode = 409;
        if (err.message.includes('email')) {
          errorMessage = 'Email already exists';
        } else {
          errorMessage = 'Duplicate field error';
        }
      } else if (err.name === 'CastError') {
        statusCode = 400;
        errorMessage = 'Invalid user ID format';
      } else {
        errorMessage = err.message;
      }
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
};





// BVN Verification using Paystack Identity API
export const verifyBVN = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const { bvn, firstName, lastName, dateOfBirth } = req.body;

    console.log(`🏦 BVN verification attempt from user: ${req.user?.email}`);
    console.log(`🔢 BVN: ${bvn?.substring(0, 3)}****${bvn?.substring(7)}`);
    console.log(`👤 Names: ${firstName} ${lastName}`);
    console.log(`📅 DOB: ${dateOfBirth || 'Not provided'}`);

    // ... existing validation code ...

    console.log(`🔍 Calling Paystack BVN API...`);

    // Helper function to convert date format from DD/MM/YYYY to YYYY-MM-DD
    const convertDateFormat = (dateOfBirth: string) => {
      if (!dateOfBirth || dateOfBirth.length !== 10) return null;
      const [day, month, year] = dateOfBirth.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    };

    // 🔍 Let's try different approaches to debug
    const requestPayload = {
      bvn: bvn.trim(),
      // Try without names first to see if BVN exists at all
      ...(firstName && { first_name: firstName.trim() }),
      ...(lastName && { last_name: lastName.trim() }),
      ...(dateOfBirth && { date_of_birth: convertDateFormat(dateOfBirth) })
    };

    console.log('📤 Paystack request payload:', {
      ...requestPayload,
      bvn: '***HIDDEN***'
    });

    try {
      // First, try with just BVN to see if it exists
      const basicResponse = await axios.post(
        'https://api.paystack.co/bvn/resolve',
        {
          bvn: bvn.trim()
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      console.log('✅ Basic BVN lookup successful');
      console.log('📊 BVN exists in records');

      // Now try with full details
      const paystackResponse = await axios.post(
        'https://api.paystack.co/bvn/resolve',
        requestPayload,
        {
          headers: {
            'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      console.log('✅ Full BVN verification response received');
      console.log('📊 Response status:', paystackResponse.data.status);

      if (!paystackResponse.data.status) {
        console.log('❌ Paystack verification failed:', paystackResponse.data.message);
        
        // Log the actual vs expected data for debugging
        if (basicResponse.data.status && basicResponse.data.data) {
          const actualData = basicResponse.data.data;
          console.log('🔍 Actual BVN data from bank:', {
            firstName: actualData.first_name,
            lastName: actualData.last_name,
            dateOfBirth: actualData.date_of_birth
          });
          console.log('🔍 Provided data:', {
            firstName: firstName,
            lastName: lastName,
            dateOfBirth: convertDateFormat(dateOfBirth)
          });
        }

        return res.status(422).json({
          success: false,
          message: 'BVN verification failed. Please ensure your details match exactly as they appear on your BVN records.',
          error: paystackResponse.data.message,
          // In development, show what was expected vs provided
          ...(process.env.NODE_ENV === 'development' && basicResponse.data.status && {
            debug: {
              expected: basicResponse.data.data ? {
                firstName: basicResponse.data.data.first_name,
                lastName: basicResponse.data.data.last_name,
                dateOfBirth: basicResponse.data.data.date_of_birth
              } : null,
              provided: {
                firstName: firstName,
                lastName: lastName,
                dateOfBirth: convertDateFormat(dateOfBirth)
              }
            }
          })
        });
      }

      // Continue with successful verification...
      const bvnData = paystackResponse.data.data;
      console.log('🔍 BVN verification successful');

      // ... rest of your existing success logic ...

    } catch (innerError: any) {
      console.error('❌ Inner API error:', innerError.response?.data || innerError.message);
      
      // If basic BVN lookup fails, the BVN doesn't exist
      if (innerError.response?.status === 422 || innerError.response?.status === 404) {
        return res.status(422).json({
          success: false,
          message: 'BVN not found in bank records. Please verify your BVN number is correct.',
          error: innerError.response?.data?.message
        });
      }
      
      throw innerError; // Re-throw to be caught by outer catch
    }

  } catch (error: any) {
    console.error('❌ BVN verification error:', error);
    
    // Enhanced error handling
    if (error.response?.status === 422) {
      return res.status(422).json({
        success: false,
        message: 'BVN not found in bank records',
        error: error.response.data?.message
      });
    }
    
    if (error.response?.status === 400) {
      return res.status(422).json({
        success: false,
        message: 'Invalid BVN details provided',
        error: error.response.data?.message
      });
    }
    
    if (error.response?.status === 401) {
      console.error('🔑 Paystack API key issue');
      return res.status(500).json({
        success: false,
        message: 'BVN verification service configuration error'
      });
    }

    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return res.status(500).json({
        success: false,
        message: 'BVN verification timed out. Please try again.'
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'BVN verification service temporarily unavailable',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get BVN verification status
export const getBVNStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: 'User not authenticated' 
      });
    }

    const user = await User.findById(userId).select('bvnVerified bvnVerifiedAt trustScore verificationLevel');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      bvnVerified: user.bvnVerified,
      bvnVerifiedAt: user.bvnVerifiedAt,
      trustScore: user.trustScore,
      verificationLevel: user.verificationLevel
    });

  } catch (error: any) {
    console.error('❌ Get BVN status error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get BVN status'
    });
  }
};

