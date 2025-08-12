// src/routes/userRoutes.ts
import express, { Request, Response } from 'express';
import User, { IUser } from '@/models/User';
import Product from '@/models/Product';
import { Types } from 'mongoose';
import { verifyJwtToken, createAuthenticatedHandler } from '@/middlewares/verifyJwtToken';
import { 
  updateUserProfile,
  sendPhoneVerification,
  verifyPhoneCode 
} from '@/controllers/authController';
import upload from '@/uploads/upload';
import { uploadToCloudinary } from '@/utils/cloudinary';
import twilio from 'twilio';
import { verifyBVN, getBVNStatus } from '@/controllers/authController';


const router = express.Router();

// ✅ Public profile route — anyone can view by user ID (no auth needed)
router.get('/:id/profile', async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id)
      .select(
        'fullName email level successfulSwaps successfulSales plan photoURL ' +
        // ✅ ADD TRUST SCORE AND VERIFICATION FIELDS
        'trustScore verificationLevel phoneVerified emailVerified identityVerified addressVerified ' +
        'rating isActive lastSeen'
      );
    
    if (!user) return res.status(404).json({ message: 'User not found' });

    console.log('✅ Public profile fetched for user:', {
      id: user._id,
      trustScore: user.trustScore,
      verificationLevel: user.verificationLevel,
      successfulSwaps: user.successfulSwaps,
      successfulSales: user.successfulSales
    });

    res.status(200).json(user);
  } catch (err) {
    console.error('Fetch profile failed:', err);
    res.status(500).json({ message: 'Failed to fetch user profile' });
  }
});

// ✅ FIXED: Authenticated user — get their own profile WITH VERIFICATION FIELDS
router.get('/me', verifyJwtToken, async (req: Request, res: Response) => {
  try {
    console.log('🔍 GET /me route hit for user:', req.user?.email);
    
    const user = await User.findById(req.user?._id).select(
      '_id fullName email photoURL mobile role successfulSwaps plan verified createdAt updatedAt ' +
      'address level isPro isAdmin walletBalance hasVirtualAccount virtualAccount ' +
      // ✅ ADD ALL VERIFICATION FIELDS
      'phoneVerified emailVerified bvnVerified identityVerified addressVerified verificationLevel trustScore ' +
      'location locationUpdatedAt maxSearchRadius locationSharing nearbyNotifications verifiedUsersOnly ' +
      'lastSeen isActive rating successfulSales'
    );

    if (!user) {
      console.log('❌ User not found for ID:', req.user?._id);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('✅ User found with verification fields:', {
      id: user._id,
      phoneVerified: user.phoneVerified,
      emailVerified: user.emailVerified,
      trustScore: user.trustScore,
      verificationLevel: user.verificationLevel
    });

    res.json({ 
      user,
      success: true 
    });
  } catch (error) {
    console.error('❌ Get current user error:', error);
    res.status(500).json({ message: 'Failed to fetch user profile' });
  }
});

// ✅ Upload photo route using helper function
router.post('/upload-photo', 
  verifyJwtToken, 
  upload.single('photo'), 
  createAuthenticatedHandler(async (req, res) => {
    console.log('📸 Photo upload route hit');
    
    if (!req.file) {
      res.status(400).json({ message: 'No photo uploaded' });
      return;
    }

    console.log('Received file:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    // Upload to Cloudinary
    const photoURL = await uploadToCloudinary(req.file.buffer);
    console.log('✅ Uploaded to Cloudinary:', photoURL);

    // ✅ req.user is guaranteed to exist and be properly typed
    const userId = req.user._id;
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { photoURL },
      { new: true }
    ).select('_id fullName email level successfulSwaps plan photoURL phoneVerified emailVerified trustScore verificationLevel');

    if (!updatedUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({ 
      success: true, 
      photoURL,
      user: updatedUser,
      message: 'Photo uploaded successfully' 
    });
  })
);

// ✅ Update profile route
router.patch('/me', verifyJwtToken, (req: Request, res: Response, next) => {
  console.log('✅ PATCH /api/users/me route hit');
  next();
}, updateUserProfile);

// ✅ Phone verification routes
router.post('/send-phone-verification', verifyJwtToken, sendPhoneVerification);
router.post('/verify-phone', verifyJwtToken, verifyPhoneCode);

// ✅ Get favorites using helper function - improved version
router.get('/favorites', 
  verifyJwtToken, 
  createAuthenticatedHandler(async (req, res) => {
    try {
      const user = await User.findById(req.user._id)
        .populate({
          path: 'favorites',
          select: 'title price images category type description user createdAt',
          populate: {
            path: 'user',
            select: 'fullName level'
          }
        }) as IUser | null;
      
      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }
      
      res.json({ 
        favorites: user.favorites || [],
        count: user.favorites?.length || 0
      });
    } catch (error) {
      console.error('Get favorites error:', error);
      res.status(500).json({ message: 'Failed to fetch favorites' });
    }
  })
);

// ✅ Add to favorites - improved version with proper ObjectId handling
router.post('/favorites/:productId', 
  verifyJwtToken, 
  createAuthenticatedHandler(async (req, res) => {
    try {
      const { productId } = req.params;
      const userId = req.user._id;

      // ✅ Validate productId format
      if (!Types.ObjectId.isValid(productId)) {
        res.status(400).json({ message: 'Invalid product ID format' });
        return;
      }

      // Check if product exists
      const product = await Product.findById(productId);
      if (!product) {
        res.status(404).json({ message: 'Product not found' });
        return;
      }

      // Find user and check if product is already in favorites
      const user = await User.findById(userId) as IUser | null;
      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      // ✅ Proper ObjectId comparison using .equals() method
      const productObjectId = new Types.ObjectId(productId);
      const isAlreadyFavorite = user.favorites?.some((favoriteId: Types.ObjectId) => 
        favoriteId.equals(productObjectId)
      ) || false;

      if (!isAlreadyFavorite) {
        // ✅ Initialize favorites array if it doesn't exist
        if (!user.favorites) {
          user.favorites = [];
        }
        user.favorites.push(productObjectId);
        await user.save();
      }

      res.json({ 
        message: isAlreadyFavorite ? 'Already in favorites' : 'Added to favorites',
        favorites: user.favorites
      });

    } catch (error) {
      console.error('Add favorite error:', error);
      res.status(500).json({ message: 'Failed to add to favorites' });
    }
  })
);

// ✅ Remove from favorites - improved version with better error handling
router.delete('/favorites/:productId', 
  verifyJwtToken, 
  createAuthenticatedHandler(async (req, res) => {
    try {
      const { productId } = req.params;
      const userId = req.user._id;

      // ✅ Validate productId format
      if (!Types.ObjectId.isValid(productId)) {
        res.status(400).json({ message: 'Invalid product ID format' });
        return;
      }

      const user = await User.findById(userId) as IUser | null;
      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      // ✅ Proper ObjectId comparison with feedback
      const productObjectId = new Types.ObjectId(productId);
      const initialLength = user.favorites?.length || 0;
      
      if (user.favorites) {
        user.favorites = user.favorites.filter((favoriteId: Types.ObjectId) => 
          !favoriteId.equals(productObjectId)
        );
      }

      const wasRemoved = (user.favorites?.length || 0) < initialLength;
      
      if (wasRemoved) {
        await user.save();
      }

      res.json({ 
        message: wasRemoved ? 'Removed from favorites' : 'Product was not in favorites',
        favorites: user.favorites || []
      });

    } catch (error) {
      console.error('Remove favorite error:', error);
      res.status(500).json({ message: 'Failed to remove from favorites' });
    }
  })
);

// ✅ Alternative MongoDB operator approach (more efficient)
// Add to favorites using $addToSet (prevents duplicates automatically)
router.post('/favorites/:productId/mongo', 
  verifyJwtToken, 
  createAuthenticatedHandler(async (req, res) => {
    try {
      const { productId } = req.params;
      
      if (!Types.ObjectId.isValid(productId)) {
        res.status(400).json({ message: 'Invalid product ID format' });
        return;
      }

      // Check if product exists
      const product = await Product.findById(productId);
      if (!product) {
        res.status(404).json({ message: 'Product not found' });
        return;
      }

      // ✅ Use $addToSet to avoid duplicates automatically
      const result = await User.findByIdAndUpdate(
        req.user._id,
        { $addToSet: { favorites: new Types.ObjectId(productId) } },
        { new: true }
      ).select('favorites') as IUser | null;

      if (!result) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      res.json({ 
        message: 'Added to favorites',
        favorites: result.favorites || []
      });
    } catch (error) {
      console.error('Add favorite error:', error);
      res.status(500).json({ message: 'Failed to add to favorites' });
    }
  })
);

// Remove from favorites using $pull (more efficient)
router.delete('/favorites/:productId/mongo', 
  verifyJwtToken, 
  createAuthenticatedHandler(async (req, res) => {
    try {
      const { productId } = req.params;
      
      if (!Types.ObjectId.isValid(productId)) {
        res.status(400).json({ message: 'Invalid product ID format' });
        return;
      }

      // ✅ Use $pull to remove from array
      const result = await User.findByIdAndUpdate(
        req.user._id,
        { $pull: { favorites: new Types.ObjectId(productId) } },
        { new: true }
      ).select('favorites') as IUser | null;

      if (!result) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      res.json({ 
        message: 'Removed from favorites',
        favorites: result.favorites || []
      });
    } catch (error) {
      console.error('Remove favorite error:', error);
      res.status(500).json({ message: 'Failed to remove from favorites' });
    }
  })
);

// ✅ Test Twilio route using helper function
router.post('/test-twilio', 
  verifyJwtToken, 
  createAuthenticatedHandler(async (req, res) => {
    try {
      console.log('🧪 Testing Twilio connection...');
      console.log('👤 Authenticated user:', req.user.email);
      
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;
      
      console.log('Account SID:', accountSid);
      console.log('From Number:', fromNumber);
      console.log('Auth Token exists:', !!authToken);
      
      if (!accountSid || !authToken) {
        res.status(500).json({
          success: false,
          error: 'Twilio credentials not configured'
        });
        return;
      }
      
      const client = twilio(accountSid, authToken);
      
      // Test 1: Fetch account info
      console.log('Testing account fetch...');
      const account = await client.api.accounts(accountSid).fetch();
      console.log('Account Status:', account.status);
      
      // Test 2: Try to send a test SMS to a verified number
      console.log('Testing SMS send...');
      const testResult = await client.messages.create({
        body: 'Test message from Swaap',
        from: fromNumber,
        to: '+2348012345678' // Replace with your verified test number
      });
      
      res.json({
        success: true,
        message: 'Twilio tests passed',
        accountStatus: account.status,
        testMessageSid: testResult.sid,
        testMessageStatus: testResult.status,
        testedBy: req.user.email
      });
      
    } catch (error: any) {
      console.error('❌ Twilio test error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        status: error.status,
        moreInfo: error.moreInfo
      });
      
      res.status(500).json({
        success: false,
        error: error.message,
        code: error.code,
        status: error.status,
        moreInfo: error.moreInfo
      });
    }
  })
);

router.get('/api/auth/me', (req, res) => {
  console.log('🚨 SOMEONE IS STILL CALLING /api/auth/me - FIND AND FIX THIS!');
  console.log('🚨 Call stack:', new Error().stack);
  res.status(418).json({ 
    error: 'DEPRECATED: Use /api/users/me instead',
    message: 'This endpoint is deprecated. Update your frontend to use /api/users/me'
  });
});

// BVN verification routes
router.post('/verify-bvn', verifyJwtToken, verifyBVN);
router.get('/bvn-status', verifyJwtToken, getBVNStatus);

// Add admin login route
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email }).select('+password');
    if (!user || user.role !== 'admin') {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { _id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed' });
  }
});

// ✅ Get nearby users with posted items
router.get('/location/nearby', 
  verifyJwtToken,
  createAuthenticatedHandler(async (req, res) => {
    try {
      const { 
        latitude, 
        longitude, 
        maxDistance = 25,
        verifiedOnly = false,
        minRating = 0,
        limit = 50 
      } = req.query;

      // Validate required location parameters
      if (!latitude || !longitude) {
        res.status(400).json({ message: 'Latitude and longitude are required' });
        return;
      }

      const lat = parseFloat(latitude as string);
      const lon = parseFloat(longitude as string);
      const maxDist = parseInt(maxDistance as string);
      const limitNum = Math.min(parseInt(limit as string), 100); // Cap at 100

      if (isNaN(lat) || isNaN(lon)) {
        res.status(400).json({ message: 'Invalid latitude or longitude' });
        return;
      }

      // Build query conditions
      const matchConditions: any = {
        _id: { $ne: req.user._id }, // Exclude current user
        location: { $exists: true },
        isActive: { $ne: false },
      };

      // Add verified filter
      if (verifiedOnly === 'true') {
        matchConditions.verified = true;
      }

      // Add rating filter
      if (minRating && parseFloat(minRating as string) > 0) {
        matchConditions.rating = { $gte: parseFloat(minRating as string) };
      }

      // MongoDB aggregation pipeline to find nearby users with posted items
      const pipeline = [
        // Stage 1: Find users within distance
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [lon, lat]
            },
            distanceField: 'distance',
            maxDistance: maxDist * 1000, // Convert km to meters
            spherical: true,
            query: matchConditions
          }
        },
        
        // Stage 2: Lookup user's posted products
        {
          $lookup: {
            from: 'products',
            let: { userId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$user', '$$userId'] },
                  status: 'active' // Only active products
                }
              },
              {
                $project: {
                  _id: 1,
                  title: 1,
                  price: 1,
                  type: 1,
                  category: 1,
                  images: { $arrayElemAt: ['$images', 0] }, // First image only
                  createdAt: 1
                }
              },
              { $sort: { createdAt: -1 } },
              { $limit: 3 } // Show max 3 recent items per user
            ],
            as: 'postedItems'
          }
        },
        
        // Stage 3: Only include users who have posted items
        {
          $match: {
            'postedItems.0': { $exists: true } // At least one posted item
          }
        },
        
        // Stage 4: Project final user data
        {
          $project: {
            _id: 1,
            fullName: 1,
            photoURL: 1,
            rating: { $ifNull: ['$rating', 0] },
            verified: { $ifNull: ['$verified', false] },
            successfulSwaps: { $ifNull: ['$successfulSwaps', 0] },
            lastSeen: 1,
            distance: { $round: [{ $divide: ['$distance', 1000] }, 1] }, // Convert to km
            postedItems: 1,
            totalPostedItems: { $size: '$postedItems' },
            joinedDate: '$createdAt',
            location: {
              city: '$address.city',
              state: '$address.state'
            }
          }
        },
        
        // Stage 5: Sort by distance and recent activity
        {
          $sort: {
            distance: 1,
            lastSeen: -1
          }
        },
        
        // Stage 6: Limit results
        { $limit: limitNum }
      ];

      console.log('🔍 Finding nearby users with posted items:', {
        center: [lat, lon],
        maxDistance: maxDist,
        verifiedOnly,
        minRating
      });

      const nearbyUsers = await User.aggregate(pipeline);

      console.log(`📍 Found ${nearbyUsers.length} nearby users with posted items`);

      res.json({
        success: true,
        users: nearbyUsers,
        searchCenter: { latitude: lat, longitude: lon },
        searchRadius: maxDist,
        totalFound: nearbyUsers.length
      });

    } catch (error) {
      console.error('❌ Nearby users error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to find nearby users' 
      });
    }
  })
);

export default router;