// routes/adminRoutes.ts - UPDATED WITH ENHANCED VERIFICATION SUPPORT
import express from 'express';
import { startOfDay, subDays } from 'date-fns';
import Swap from '@/models/Swap';
import User from '@/models/User';
import Product from '@/models/Product';

// Identity verification models and controllers
import IdentityVerification from '../models/IdentityVerification';
import { 
  getPendingVerifications,
  reviewVerification,
  getVerificationDetails,
  getVerificationStats,
  getAdvertisements,
  createAdvertisement,
  updateAdvertisement,
  deleteAdvertisement,
  getAdvertisementStats,
  approveUserAdvertisement,
  rejectUserAdvertisement
} from '../controllers/adminController';

import { expireOldSwaps } from '@/utils/expireOldSwaps';
import { verifyJwtToken } from '@/middlewares/verifyJwtToken';
import { isAdmin } from '@/middlewares/isAdmin';
import { getLevelFromSwaps } from '@/utils/levelUtils';
import multer from 'multer';
import bcrypt from 'bcryptjs';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ================================
// 🏪 EXISTING SWAP & USER MANAGEMENT
// ================================

router.post('/expire-swaps', verifyJwtToken, isAdmin, async (_req, res) => {
  await expireOldSwaps();
  res.json({ message: 'Old swaps expired successfully' });
});

router.get('/expired-swaps', verifyJwtToken, isAdmin, async (_req, res) => {
  const expired = await Swap.find({ status: 'expired' }).populate('offeringProduct requestedProduct fromUser toUser');
  res.status(200).json(expired);
});

router.get('/swaps/:id', verifyJwtToken, isAdmin, async (req, res) => {
  try {
    const swap = await Swap.findById(req.params.id).populate('offeringProduct requestedProduct fromUser toUser');
    if (!swap) return res.status(404).json({ message: 'Swap not found' });
    res.status(200).json(swap);
  } catch (error) {
    console.error('Error fetching swap', error);
    res.status(500).json({ message: 'Failed to fetch swap' });
  }
});

router.put('/swaps/:id/expire', verifyJwtToken, isAdmin, async (req, res) => {
  try {
    const swap = await Swap.findById(req.params.id);
    if (!swap) return res.status(404).json({ message: 'Swap not found' });

    swap.status = 'expired';
    await swap.save();

    res.status(200).json({ message: 'Swap manually expired.', swap });
  } catch (error) {
    console.error('Manual expire error', error);
    res.status(500).json({ message: 'Failed to expire swap' });
  }
});

router.post('/make-admin/:uid', verifyJwtToken, isAdmin, async (req, res) => {
  const { uid } = req.params;
  const user = await User.findById(uid);
  if (!user) return res.status(404).json({ message: 'User not found' });

  user.role = 'admin';
  await user.save();

  res.status(200).json({ message: `User ${uid} promoted to admin.` });
});

router.post('/demote-admin/:uid', verifyJwtToken, isAdmin, async (req, res) => {
  const { uid } = req.params;
  const user = await User.findById(uid);
  if (!user) return res.status(404).json({ message: 'User not found' });

  user.role = 'user';
  await user.save();

  res.status(200).json({ message: `User ${uid} demoted to regular user.` });
});

router.get('/all-users', verifyJwtToken, isAdmin, async (req, res) => {
  const { role, createdBefore } = req.query;
  const filter: any = {};

  if (role) filter.role = role;
  if (createdBefore) filter.createdAt = { $lte: new Date(createdBefore as string) };

  const users = await User.find(filter)
    .select('fullName email role verificationLevel trustScore phoneVerified emailVerified addressVerified identityVerified socialVerifications createdAt')
    .sort({ createdAt: -1 });
  
  res.status(200).json(users);
});

router.post('/recalculate-levels', verifyJwtToken, isAdmin, async (_req, res) => {
  const users = await User.find();
  for (const user of users) {
    const newLevel = getLevelFromSwaps(user.successfulSwaps || 0);
    if (user.level !== newLevel) {
      user.level = newLevel;
      await user.save();
    }
  }
  res.json({ message: 'Levels recalculated for all users.' });
});

// 🆕 ENHANCED: Recalculate trust scores for new enhanced system
router.post('/recalculate-trust-scores', verifyJwtToken, isAdmin, async (_req, res) => {
  try {
    const users = await User.find();
    let updatedCount = 0;
    
    for (const user of users) {
      // Calculate new enhanced trust score
      let newScore = 0;
      
      // Core verifications (25 points each)
      if (user.emailVerified) newScore += 25;
      if (user.phoneVerified) newScore += 25;
      if (user.addressVerified || user.address?.verified) newScore += 25;
      if (user.identityVerified) newScore += 25;
      
      // Social media bonus (10 points each, max 50)
      if (user.socialVerifications) {
        const verifiedSocial = user.socialVerifications.filter((v: any) => v.status === 'verified').length;
        newScore += Math.min(verifiedSocial * 10, 50);
      }
      
      // Determine verification level (based on core steps only)
      let coreCompleted = 0;
      if (user.emailVerified) coreCompleted++;
      if (user.phoneVerified) coreCompleted++;
      if (user.addressVerified || user.address?.verified) coreCompleted++;
      if (user.identityVerified) coreCompleted++;
      
      const newLevel = coreCompleted;
      
      // Update if changed
      if (user.trustScore !== newScore || user.verificationLevel !== newLevel) {
        user.trustScore = Math.min(newScore, 150); // Max 150 (100 core + 50 social)
        user.verificationLevel = newLevel;
        await user.save();
        updatedCount++;
      }
    }
    
    res.json({ 
      message: `Trust scores recalculated for ${updatedCount} users.`,
      totalUsers: users.length,
      updatedUsers: updatedCount,
      maxScore: 150
    });
  } catch (error) {
    console.error('Trust score recalculation error:', error);
    res.status(500).json({ message: 'Failed to recalculate trust scores' });
  }
});

router.get('/summary', verifyJwtToken, isAdmin, async (_req, res) => {
  try {
    const [users, products, swaps, activeSwaps] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Swap.countDocuments(),
      Swap.countDocuments({ status: 'pending' }),
    ]);

    res.status(200).json({
      totalUsers: users,
      totalProducts: products,
      totalSwaps: swaps,
      activeSwaps,
    });
  } catch (err) {
    console.error('Admin summary error:', err);
    res.status(500).json({ message: 'Failed to fetch admin summary' });
  }
});

router.get('/insights', verifyJwtToken, isAdmin, async (_req, res) => {
  const [totalUsers, totalSwaps, activeSwaps] = await Promise.all([
    User.countDocuments(),
    Swap.countDocuments(),
    Swap.countDocuments({ status: 'pending' }),
  ]);

  const topUsers = await User.find().sort({ successfulSwaps: -1 }).limit(5).select('fullName email successfulSwaps');

  res.json({ stats: { totalUsers, totalSwaps, activeSwaps }, topUsers });
});

// 🆕 ENHANCED: Metrics with comprehensive verification data
router.get('/metrics', verifyJwtToken, isAdmin, async (_req, res) => {
  try {
    const [totalUsers, proUsers, totalProducts, totalSwaps] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ plan: 'pro' }),
      Product.countDocuments(),
      Swap.countDocuments(),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [dailySwaps, latestUsers, topSwappers] = await Promise.all([
      Swap.countDocuments({ createdAt: { $gte: today } }),
      User.find().sort({ createdAt: -1 }).limit(5).select('fullName email createdAt verificationLevel trustScore'),
      User.find().sort({ successfulSwaps: -1 }).limit(5).select('fullName email successfulSwaps verificationLevel'),
    ]);

    // 🆕 Enhanced verification metrics
    const verificationStats = await Promise.all([
      User.countDocuments({ emailVerified: true }),
      User.countDocuments({ phoneVerified: true }),
      User.countDocuments({ addressVerified: true }),
      User.countDocuments({ identityVerified: true }),
      User.countDocuments({ verificationLevel: 4 }), // Fully verified
      IdentityVerification.countDocuments({ status: 'pending_review' }),
      User.countDocuments({ 'address.verificationStatus': 'pending_review' }),
    ]);

    const [emailVerified, phoneVerified, addressVerified, identityVerified, fullyVerified, pendingIdentity, pendingAddress] = verificationStats;

    // Social media verification stats
    const socialStats = await User.aggregate([
      { $unwind: { path: '$socialVerifications', preserveNullAndEmptyArrays: true } },
      { $match: { 'socialVerifications.status': 'verified' } },
      { $group: { _id: '$socialVerifications.platform', count: { $sum: 1 } } }
    ]);

    // Trust score distribution
    const trustScoreDistribution = await User.aggregate([
      {
        $bucket: {
          groupBy: '$trustScore',
          boundaries: [0, 25, 50, 75, 100, 125, 150],
          default: 'other',
          output: { count: { $sum: 1 } }
        }
      }
    ]);

    // Recent verification activity
    const recentVerifications = await IdentityVerification.find()
      .sort({ submittedAt: -1 })
      .limit(5)
      .populate('userId', 'fullName email')
      .select('uploadId documentType status submittedAt userId');

    const roleCounts = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);
    const planCounts = await User.aggregate([{ $group: { _id: '$plan', count: { $sum: 1 } } }]);
    const swapStatuses = await Swap.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);

    const averageTrustScore = await User.aggregate([
      { $group: { _id: null, avgTrustScore: { $avg: '$trustScore' } } }
    ]);

    // Weekly trend
    const trend: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = startOfDay(subDays(new Date(), i));
      const next = startOfDay(subDays(new Date(), i - 1));
      const count = await Swap.countDocuments({
        createdAt: { $gte: day, $lt: next },
        status: 'accepted',
      });
      trend.push({ date: day.toISOString().split('T')[0], count });
    }

    res.status(200).json({
      // Core metrics
      totalUsers,
      proUsers,
      totalProducts,
      totalSwaps,
      dailySwaps,
      latestUsers,
      topSwappers,
      
      // Enhanced verification metrics
      verification: {
        core: {
          email: emailVerified,
          phone: phoneVerified,
          address: addressVerified,
          identity: identityVerified,
          fullyVerified
        },
        pending: {
          identity: pendingIdentity,
          address: pendingAddress
        },
        social: socialStats,
        trustScoreDistribution,
        averageTrustScore: averageTrustScore[0]?.avgTrustScore || 0
      },
      
      // Recent activity
      recentVerifications,
      
      // Legacy metrics
      users: { 
        total: totalUsers, 
        byRole: roleCounts, 
        byPlan: planCounts,
        averageTrustScore: averageTrustScore[0]?.avgTrustScore || 0
      },
      products: { total: totalProducts },
      swaps: { total: totalSwaps, byStatus: swapStatuses, acceptedLast7Days: trend },
    });
  } catch (err: any) {
    console.error('Metrics fetch error:', err?.message || err);
    res.status(500).json({ message: 'Failed to fetch metrics' });
  }
});

// ================================
// 🆔 IDENTITY VERIFICATION MANAGEMENT 
// ================================

// Get pending identity verifications
router.get('/verifications/identity/pending', verifyJwtToken, isAdmin, getPendingVerifications);

// Get identity verification statistics
router.get('/verifications/identity/stats', verifyJwtToken, isAdmin, getVerificationStats);

// Get specific identity verification details
router.get('/verifications/identity/:uploadId', verifyJwtToken, isAdmin, getVerificationDetails);

// Review identity verification (approve/reject)
router.post('/verifications/identity/:uploadId/review', 
  verifyJwtToken,
  isAdmin,
  reviewVerification
);

// Get all identity verifications (with filters)
router.get('/verifications/identity', verifyJwtToken, isAdmin, async (req, res) => {
  try {
    const { 
      status, 
      documentType, 
      page = 1, 
      limit = 20,
      sortBy = 'submittedAt',
      sortOrder = 'desc'
    } = req.query;

    const filter: any = {};
    if (status) filter.status = status;
    if (documentType) filter.documentType = documentType;

    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    const verifications = await IdentityVerification.find(filter)
      .populate('userId', 'fullName email mobile trustScore verificationLevel')
      .populate('reviewedBy', 'fullName email')
      .sort(sort)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .select('-frontImagePath -backImagePath');

    const total = await IdentityVerification.countDocuments(filter);

    res.json({
      success: true,
      verifications,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        hasNext: Number(page) * Number(limit) < total,
        hasPrev: Number(page) > 1
      }
    });

  } catch (error) {
    console.error('Get all identity verifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch identity verifications'
    });
  }
});

// ================================
// 🏠 ADDRESS VERIFICATION MANAGEMENT
// ================================

// Get pending address verifications
router.get('/verifications/address/pending', verifyJwtToken, isAdmin, async (req, res) => {
  try {
    const pendingAddresses = await User.find({
      'address.verificationStatus': 'pending_review'
    })
    .select('fullName email address createdAt trustScore verificationLevel')
    .sort({ 'address.lastUpdated': -1 });

    const formattedAddresses = pendingAddresses.map(user => ({
      userId: user._id,
      fullName: user.fullName,
      email: user.email,
      address: user.address,
      trustScore: user.trustScore,
      verificationLevel: user.verificationLevel,
      submittedAt: user.address?.lastUpdated || user.createdAt
    }));

    res.json({
      success: true,
      count: formattedAddresses.length,
      addresses: formattedAddresses
    });

  } catch (error) {
    console.error('Get pending addresses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending address verifications'
    });
  }
});

// Get all address verifications
router.get('/verifications/address', verifyJwtToken, isAdmin, async (req, res) => {
  try {
    const { 
      status, 
      state,
      city,
      page = 1, 
      limit = 20,
      sortBy = 'address.lastUpdated',
      sortOrder = 'desc'
    } = req.query;

    const filter: any = { address: { $exists: true } };
    if (status) filter['address.verificationStatus'] = status;
    if (state) filter['address.state'] = new RegExp(state as string, 'i');
    if (city) filter['address.city'] = new RegExp(city as string, 'i');

    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    const addresses = await User.find(filter)
      .select('fullName email address trustScore verificationLevel createdAt')
      .sort(sort)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await User.countDocuments(filter);

    const formattedAddresses = addresses.map(user => ({
      userId: user._id,
      fullName: user.fullName,
      email: user.email,
      address: user.address,
      trustScore: user.trustScore,
      verificationLevel: user.verificationLevel,
      submittedAt: user.address?.lastUpdated || user.createdAt
    }));

    res.json({
      success: true,
      addresses: formattedAddresses,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        hasNext: Number(page) * Number(limit) < total,
        hasPrev: Number(page) > 1
      }
    });

  } catch (error) {
    console.error('Get all addresses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch address verifications'
    });
  }
});

// Review address verification
router.post('/verifications/address/:userId/review', verifyJwtToken, isAdmin, async (req, res) => {
  try {
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

    // Add trust score if approved
    if (action === 'approve') {
      const currentTrustScore = Number(user.trustScore) || 0;
      const currentVerificationLevel = Number(user.verificationLevel) || 0;
      updateData.trustScore = currentTrustScore + 25;
      updateData.verificationLevel = currentVerificationLevel + 1;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });

    console.log(`✅ Address ${action}d by admin ${req.user.email} for user ${user.email}`);

    res.json({
      success: true,
      message: `Address ${action}d successfully`,
      data: {
        userId: updatedUser?._id,
        addressVerified: updatedUser?.addressVerified,
        trustScore: updatedUser?.trustScore,
        verificationLevel: updatedUser?.verificationLevel
      }
    });

  } catch (error) {
    console.error('Address review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to review address'
    });
  }
});

// ================================
// 🔗 SOCIAL MEDIA VERIFICATION MANAGEMENT
// ================================

// Get social media verification stats
router.get('/verifications/social/stats', verifyJwtToken, isAdmin, async (req, res) => {
  try {
    const socialStats = await User.aggregate([
      { $unwind: { path: '$socialVerifications', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            platform: '$socialVerifications.platform',
            status: '$socialVerifications.status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.platform',
          statuses: {
            $push: {
              status: '$_id.status',
              count: '$count'
            }
          },
          total: { $sum: '$count' }
        }
      }
    ]);

    const totalSocialVerifications = await User.aggregate([
      { $match: { socialVerifications: { $exists: true, $ne: [] } } },
      { $count: 'total' }
    ]);

    res.json({
      success: true,
      stats: {
        byPlatform: socialStats,
        totalUsersWithSocial: totalSocialVerifications[0]?.total || 0
      }
    });

  } catch (error) {
    console.error('Social verification stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch social verification stats'
    });
  }
});

// Get users with social verifications
router.get('/verifications/social', verifyJwtToken, isAdmin, async (req, res) => {
  try {
    const { 
      platform,
      status,
      page = 1, 
      limit = 20
    } = req.query;

    const match: any = { socialVerifications: { $exists: true, $ne: [] } };
    
    const pipeline: any[] = [
      { $match: match },
      { $unwind: '$socialVerifications' }
    ];

    if (platform) {
      pipeline.push({ $match: { 'socialVerifications.platform': platform } });
    }
    
    if (status) {
      pipeline.push({ $match: { 'socialVerifications.status': status } });
    }

    pipeline.push(
      {
        $project: {
          fullName: 1,
          email: 1,
          trustScore: 1,
          verificationLevel: 1,
          socialVerification: '$socialVerifications'
        }
      },
      { $sort: { 'socialVerification.createdAt': -1 } },
      { $skip: (Number(page) - 1) * Number(limit) },
      { $limit: Number(limit) }
    );

    const results = await User.aggregate(pipeline);

    res.json({
      success: true,
      socialVerifications: results,
      pagination: {
        currentPage: Number(page),
        totalItems: results.length
      }
    });

  } catch (error) {
    console.error('Get social verifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch social verifications'
    });
  }
});

// Bulk approve/reject identity verifications
router.post('/verifications/identity/bulk-action', verifyJwtToken, isAdmin, async (req, res) => {
  try {
    const { action, uploadIds, comments } = req.body;
    const adminId = req.user._id;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either "approve" or "reject"'
      });
    }

    if (!Array.isArray(uploadIds) || uploadIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'uploadIds array is required'
      });
    }

    const verifications = await IdentityVerification.find({
      uploadId: { $in: uploadIds },
      status: 'pending_review'
    });

    if (verifications.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No pending verifications found'
      });
    }

    const results = [];
    for (const verification of verifications) {
      verification.status = action === 'approve' ? 'verified' : 'rejected';
      verification.reviewedAt = new Date();
      verification.reviewedBy = adminId;
      verification.reviewComments = comments;
      await verification.save();

      // Update user if approved
      if (action === 'approve') {
        const user = await User.findById(verification.userId);
        if (user) {
          user.identityVerified = true;
          const currentScore = user.trustScore || 0;
          const currentLevel = user.verificationLevel || 0;
          user.trustScore = currentScore + 25;
          user.verificationLevel = currentLevel + 1;
          await user.save();
        }
      }

      results.push({
        uploadId: verification.uploadId,
        status: verification.status,
        userId: verification.userId
      });
    }

    res.json({
      success: true,
      message: `Bulk ${action} completed successfully`,
      results,
      processedCount: results.length
    });

  } catch (error) {
    console.error('Bulk verification action error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process bulk action'
    });
  }
});

// Delete old verification records (cleanup)
router.delete('/verifications/cleanup', verifyJwtToken, isAdmin, async (req, res) => {
  try {
    const { olderThanDays = 90 } = req.query;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - Number(olderThanDays));

    const result = await IdentityVerification.deleteMany({
      submittedAt: { $lt: cutoffDate },
      status: { $in: ['verified', 'rejected'] }
    });

    res.json({
      success: true,
      message: `Cleaned up ${result.deletedCount} old verification records`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('Verification cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup old verifications'
    });
  }
});

// ================================
// 📺 ADVERTISEMENT MANAGEMENT
// ================================

// Get all advertisements for admin management
router.get('/advertisements', verifyJwtToken, isAdmin, getAdvertisements);

// Get advertisement statistics
router.get('/advertisements/stats', verifyJwtToken, isAdmin, getAdvertisementStats);

// Create new admin advertisement
router.post('/advertisements', verifyJwtToken, isAdmin, upload.single('image'), createAdvertisement);

// Update advertisement
router.put('/advertisements/:id', verifyJwtToken, isAdmin, upload.single('image'), updateAdvertisement);

// Delete advertisement
router.delete('/advertisements/:id', verifyJwtToken, isAdmin, deleteAdvertisement);

// Approve user product advertisement
router.post('/advertisements/:id/approve', verifyJwtToken, isAdmin, approveUserAdvertisement);

// Reject user product advertisement
router.post('/advertisements/:id/reject', verifyJwtToken, isAdmin, rejectUserAdvertisement);

router.post('/create-admin-simple', async (req, res) => {
  const admin = new User({
    fullName: 'Admin',
    email: 'admin@swaap.com',
    mobile: '+2348012345678',
    password: await bcrypt.hash('admin123456', 10),
    role: 'admin'
  });
  
  await admin.save();
  res.json({ success: true, email: 'admin@swaap.com', password: 'admin123456' });
});

export default router;