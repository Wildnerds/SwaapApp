// advertisement-routes.ts - Admin-controlled carousel ads system
import express from 'express';
import multer from 'multer';
import Advertisement from '../models/Advertisement';
import Product from '../models/Product';
import User from '../models/User';
import { verifyJwtToken } from '../middlewares/verifyJwtToken';
import { uploadToCloudinary } from '../utils/cloudinary';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Middleware to check if user is admin
const isAdmin = async (req: any, res: any, next: any) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error checking admin status'
    });
  }
};

// 🔓 PUBLIC ROUTES

// GET /api/advertisements - Get active ads for carousel (public)
router.get('/', async (req, res) => {
  try {
    console.log('🎯 Fetching active advertisements for carousel');
    
    const ads = await Advertisement.getActiveAds();
    
    // Record impressions for all returned ads
    const adUpdatePromises = ads.map(ad => ad.recordImpression());
    await Promise.all(adUpdatePromises);
    
    // Format ads for frontend
    const formattedAds = ads.map(ad => ({
      id: ad._id,
      title: ad.title,
      subtitle: ad.subtitle,
      image: ad.image,
      type: ad.type,
      externalUrl: ad.externalUrl,
      product: ad.productId ? {
        _id: ad.productId._id,
        title: ad.productId.title,
        price: ad.productId.price,
        image: ad.productId.images?.[0]
      } : null,
      user: ad.userId ? {
        _id: ad.userId._id,
        fullName: ad.userId.fullName
      } : null,
      priority: ad.priority
    }));
    
    console.log(`✅ Returning ${formattedAds.length} active advertisements`);
    
    res.status(200).json({
      success: true,
      advertisements: formattedAds
    });
    
  } catch (error) {
    console.error('❌ Error fetching advertisements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch advertisements'
    });
  }
});

// POST /api/advertisements/:id/click - Record ad click (public)
router.post('/:id/click', async (req, res) => {
  try {
    const advertisement = await Advertisement.findById(req.params.id);
    
    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }
    
    await advertisement.recordClick();
    
    res.status(200).json({
      success: true,
      message: 'Click recorded'
    });
    
  } catch (error) {
    console.error('❌ Error recording ad click:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record click'
    });
  }
});

// 🔐 ADMIN ROUTES

// GET /api/advertisements/admin - Get all ads for admin management
router.get('/admin', verifyJwtToken, isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status as string;
    const type = req.query.type as string;
    
    const query: any = {};
    if (status) query.status = status;
    if (type) query.type = type;
    
    const ads = await Advertisement.find(query)
      .populate('productId', 'title price images')
      .populate('userId', 'fullName email')
      .populate('createdBy', 'fullName email')
      .populate('approvedBy', 'fullName email')
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Advertisement.countDocuments(query);
    
    res.status(200).json({
      success: true,
      advertisements: ads,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasMore: skip + ads.length < total
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching admin advertisements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch advertisements'
    });
  }
});

// POST /api/advertisements/admin - Create new admin advertisement  
router.post('/admin', verifyJwtToken, isAdmin, upload.fields([
  { name: 'images', maxCount: 5 },
  { name: 'image', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('📝 Creating advertisement - Body:', req.body);
    console.log('📷 Files received:', req.files);
    
    const { title, subtitle, type, externalUrl, priority, startDate, endDate } = req.body;
    
    // Validate required fields
    if (!title || !type) {
      console.log('❌ Validation failed: missing title or type');
      return res.status(400).json({
        success: false,
        message: 'Title and type are required'
      });
    }
    
    // Handle both single and multiple image uploads
    let files: Express.Multer.File[] = [];
    
    if (req.files) {
      const filesObject = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      // Get files from 'images' field (multiple)
      if (filesObject.images) {
        files = files.concat(filesObject.images);
      }
      
      // Get file from 'image' field (single) for backward compatibility
      if (filesObject.image) {
        files = files.concat(filesObject.image);
      }
    }
    
    console.log('📷 Total files to process:', files.length);
    
    if (files.length === 0) {
      console.log('❌ No files received');
      return res.status(400).json({
        success: false,
        message: 'At least one image is required'
      });
    }
    
    // Upload all images to cloudinary
    const imageUploadPromises = files.map(file => 
      uploadToCloudinary(file.buffer, {
        folder: 'advertisements',
        transformation: [
          { width: 800, height: 400, crop: 'fill' },
          { quality: 'auto' }
        ]
      })
    );
    
    const imageUrls = await Promise.all(imageUploadPromises);
    
    // Create advertisement
    const advertisement = await Advertisement.create({
      title,
      subtitle,
      image: imageUrls[0], // Use first image as primary
      images: imageUrls,   // Store all images
      type,
      externalUrl: type === 'external' ? externalUrl : undefined,
      priority: parseInt(priority) || 1,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: new Date(endDate),
      status: 'active', // Admin ads are immediately active
      createdBy: req.user._id,
      approvedBy: req.user._id,
      approvedAt: new Date()
    });
    
    console.log(`✅ Admin created advertisement: ${advertisement._id}`);
    
    res.status(201).json({
      success: true,
      message: 'Advertisement created successfully',
      advertisement
    });
    
  } catch (error) {
    console.error('❌ Error creating admin advertisement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create advertisement'
    });
  }
});

// PUT /api/advertisements/admin/:id - Update advertisement
router.put('/admin/:id', verifyJwtToken, isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { title, subtitle, externalUrl, priority, startDate, endDate, status } = req.body;
    
    const advertisement = await Advertisement.findById(req.params.id);
    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }
    
    // Update fields
    if (title) advertisement.title = title;
    if (subtitle !== undefined) advertisement.subtitle = subtitle;
    if (externalUrl !== undefined) advertisement.externalUrl = externalUrl;
    if (priority) advertisement.priority = parseInt(priority);
    if (startDate) advertisement.startDate = new Date(startDate);
    if (endDate) advertisement.endDate = new Date(endDate);
    if (status) advertisement.status = status;
    
    // Update image if provided
    if (req.file) {
      const imageUrl = await uploadToCloudinary(req.file.buffer, {
        folder: 'advertisements',
        transformation: [
          { width: 800, height: 400, crop: 'fill' },
          { quality: 'auto' }
        ]
      });
      advertisement.image = imageUrl;
    }
    
    await advertisement.save();
    
    console.log(`✅ Admin updated advertisement: ${advertisement._id}`);
    
    res.status(200).json({
      success: true,
      message: 'Advertisement updated successfully',
      advertisement
    });
    
  } catch (error) {
    console.error('❌ Error updating advertisement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update advertisement'
    });
  }
});

// DELETE /api/advertisements/admin/:id - Delete advertisement
router.delete('/admin/:id', verifyJwtToken, isAdmin, async (req, res) => {
  try {
    const advertisement = await Advertisement.findById(req.params.id);
    
    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }
    
    await Advertisement.findByIdAndDelete(req.params.id);
    
    console.log(`✅ Admin deleted advertisement: ${req.params.id}`);
    
    res.status(200).json({
      success: true,
      message: 'Advertisement deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Error deleting advertisement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete advertisement'
    });
  }
});

// 🔐 USER ROUTES (for paid product advertisements)

// POST /api/advertisements/user/create - User creates product advertisement
router.post('/user/create', verifyJwtToken, async (req, res) => {
  try {
    const { productId, duration, customTitle, customSubtitle } = req.body;
    const userId = req.user._id;
    
    // Validate product ownership
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    if (product.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only advertise your own products'
      });
    }
    
    // Calculate pricing based on duration
    const pricingTiers = {
      3: 500,   // 3 days - ₦500
      7: 1000,  // 1 week - ₦1,000
      14: 1800, // 2 weeks - ₦1,800 (10% discount)
      30: 3500  // 1 month - ₦3,500 (17% discount)
    };
    
    const durationDays = parseInt(duration);
    const paymentAmount = pricingTiers[durationDays];
    
    if (!paymentAmount) {
      return res.status(400).json({
        success: false,
        message: 'Invalid duration. Choose 3, 7, 14, or 30 days'
      });
    }
    
    // Check for existing active ad for this product
    const existingAd = await Advertisement.findOne({
      productId,
      userId,
      status: { $in: ['active', 'pending'] }
    });
    
    if (existingAd) {
      return res.status(400).json({
        success: false,
        message: 'This product already has an active or pending advertisement'
      });
    }
    
    // Create advertisement (pending until payment)
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);
    
    const advertisement = await Advertisement.create({
      title: customTitle || product.title,
      subtitle: customSubtitle || `${product.condition} • ₦${product.price.toLocaleString()}`,
      image: product.images[0], // Use first product image
      type: 'user_product',
      productId,
      userId,
      paymentAmount,
      priority: 5, // User ads have medium priority
      startDate: new Date(),
      endDate,
      status: 'pending' // Will be activated after payment
    });
    
    console.log(`✅ User created product advertisement: ${advertisement._id}`);
    
    res.status(201).json({
      success: true,
      message: 'Advertisement created. Please complete payment to activate.',
      advertisement: {
        _id: advertisement._id,
        title: advertisement.title,
        subtitle: advertisement.subtitle,
        duration: durationDays,
        paymentAmount: advertisement.paymentAmount,
        status: advertisement.status
      }
    });
    
  } catch (error) {
    console.error('❌ Error creating user advertisement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create advertisement'
    });
  }
});

// GET /api/advertisements/user/my - Get user's advertisements
router.get('/user/my', verifyJwtToken, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const ads = await Advertisement.find({ userId })
      .populate('productId', 'title price images')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      advertisements: ads
    });
    
  } catch (error) {
    console.error('❌ Error fetching user advertisements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your advertisements'
    });
  }
});

// GET /api/advertisements/pricing - Get pricing tiers for user ads
router.get('/pricing', (req, res) => {
  const pricing = [
    {
      duration: 3,
      label: '3 Days',
      price: 500,
      description: 'Great for quick sales'
    },
    {
      duration: 7,
      label: '1 Week',
      price: 1000,
      description: 'Most popular choice'
    },
    {
      duration: 14,
      label: '2 Weeks',
      price: 1800,
      originalPrice: 2000,
      discount: '10%',
      description: 'Best value for money'
    },
    {
      duration: 30,
      label: '1 Month',
      price: 3500,
      originalPrice: 4000,
      discount: '17%',
      description: 'Maximum exposure'
    }
  ];
  
  res.status(200).json({
    success: true,
    pricing
  });
});

export default router;