// src/controllers/adminController.ts
import { Request, Response } from 'express';
import IdentityVerification from '../models/IdentityVerification';
import User from '../models/User';
import Advertisement from '../models/Advertisement';
import Product from '../models/Product';
import { sendVerificationNotification } from '../services/notificationService';
import { createAuditLog } from '../services/auditService';
import { uploadToCloudinary } from '../utils/cloudinary';
import path from 'path';

interface AuthRequest extends Request {
  user?: {
    _id: string;
    email: string;
    role: 'user' | 'admin';
  };
}

export const getPendingVerifications = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const verifications = await IdentityVerification.find({ 
      status: { $in: ['pending_review', 'uploaded', 'processing'] }
    })
    .populate('userId', 'email fullName mobile createdAt')
    .sort({ submittedAt: 1 }) // Oldest first
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit));

    const total = await IdentityVerification.countDocuments({ 
      status: { $in: ['pending_review', 'uploaded', 'processing'] }
    });

    res.json({
      success: true,
      verifications,
      pagination: {
        currentPage: parseInt(String(page)),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        hasNext: Number(page) * Number(limit) < total,
        hasPrev: Number(page) > 1
      }
    });

  } catch (error) {
    console.error('Get pending verifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending verifications'
    });
  }
};

export const getVerificationDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { uploadId } = req.params;

    const verification = await IdentityVerification.findOne({ uploadId })
      .populate('userId', 'email fullName mobile createdAt');

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'Verification not found'
      });
    }

    // Return full details for admin review with secure image URLs
    res.json({
      success: true,
      verification: {
        ...verification.toObject(),
        frontImageUrl: verification.frontImagePath ? 
          `/uploads/identity-docs/${verification.userId}/${path.basename(verification.frontImagePath)}` : null,
        backImageUrl: verification.backImagePath ? 
          `/uploads/identity-docs/${verification.userId}/${path.basename(verification.backImagePath)}` : null,
      }
    });

  } catch (error) {
    console.error('Get verification details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch verification details'
    });
  }
};

export const reviewVerification = async (req: AuthRequest, res: Response) => {
  try {
    const { uploadId } = req.params;
    const { action, comments } = req.body;
    const adminId = req.user._id;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either "approve" or "reject"'
      });
    }

    const verification = await IdentityVerification.findOne({ uploadId });
    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'Verification not found'
      });
    }

    if (!['pending_review', 'uploaded', 'processing'].includes(verification.status)) {
      return res.status(400).json({
        success: false,
        message: 'Verification has already been reviewed'
      });
    }

    // Update verification status
    verification.status = action === 'approve' ? 'verified' : 'rejected';
    verification.reviewedAt = new Date();
    verification.reviewedBy = adminId;
    verification.reviewComments = comments;

    await verification.save();

    // Update user if approved - using your existing User model structure
    if (action === 'approve') {
      const user = await User.findById(verification.userId);
      if (user) {
        // Update user with identity verification
        user.identityVerified = true;
        
        // Update trust score and verification level using new 4-step calculation
        const currentScore = user.trustScore || 0;
        user.trustScore = Math.min(currentScore + 25, 100); // Add 25 points for identity
        
        // Calculate verification level based on completed verifications
        let completedSteps = 0;
        if (user.emailVerified) completedSteps++;
        if (user.phoneVerified) completedSteps++;
        if (user.addressVerified || user.address?.verified) completedSteps++;
        if (user.identityVerified) completedSteps++; // Now verified
        
        // Set verification level based on completed steps
        if (completedSteps === 4) user.verificationLevel = 'FULLY_VERIFIED';
        else if (completedSteps >= 3) user.verificationLevel = 'ADVANCED';
        else if (completedSteps >= 2) user.verificationLevel = 'INTERMEDIATE';
        else if (completedSteps >= 1) user.verificationLevel = 'BASIC';
        
        // Update verifications object if it exists
        if (user.verifications) {
          user.verifications.identity = {
            completed: true,
            verifiedAt: new Date(),
            documentType: verification.documentType,
            uploadId: verification.uploadId
          };
        }
        
        await user.save();
        
        console.log(`✅ User ${user.email} identity verified. Trust score: ${user.trustScore}, Level: ${user.verificationLevel}`);
      }
    }

    // Send notification to user
    await sendVerificationNotification(
      action === 'approve' ? 'verification_approved' : 'verification_rejected',
      {
        userId: verification.userId,
        documentType: verification.documentType,
        comments
      }
    );

    // Create audit log
    await createAuditLog({
      userId: adminId,
      action: `IDENTITY_VERIFICATION_${action.toUpperCase()}`,
      details: {
        uploadId,
        targetUserId: verification.userId,
        documentType: verification.documentType,
        comments
      },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `Verification ${action}d successfully`,
      verification: {
        uploadId: verification.uploadId,
        status: verification.status,
        reviewedAt: verification.reviewedAt,
        reviewComments: verification.reviewComments
      }
    });

  } catch (error) {
    console.error('Review verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to review verification'
    });
  }
};

export const getVerificationStats = async (req: AuthRequest, res: Response) => {
  try {
    const stats = await IdentityVerification.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalToday = await IdentityVerification.countDocuments({
      submittedAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    });

    const avgReviewTime = await IdentityVerification.aggregate([
      {
        $match: {
          status: { $in: ['verified', 'rejected'] },
          reviewedAt: { $exists: true }
        }
      },
      {
        $project: {
          reviewTime: {
            $subtract: ['$reviewedAt', '$submittedAt']
          }
        }
      },
      {
        $group: {
          _id: null,
          avgTime: { $avg: '$reviewTime' }
        }
      }
    ]);

    const formattedStats = {
      pending_review: 0,
      uploaded: 0,
      processing: 0,
      verified: 0,
      rejected: 0,
      ...stats.reduce((acc: any, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    };

    res.json({
      success: true,
      stats: {
        byStatus: formattedStats,
        totalToday,
        avgReviewTimeHours: avgReviewTime[0] ? Math.round(avgReviewTime[0].avgTime / (1000 * 60 * 60) * 100) / 100 : 0,
        pending: formattedStats.pending_review + formattedStats.uploaded + formattedStats.processing
      }
    });

  } catch (error) {
    console.error('Get verification stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch verification statistics'
    });
  }
};

// ================================
// 📺 ADVERTISEMENT MANAGEMENT
// ================================

export const getAdvertisements = async (req: AuthRequest, res: Response) => {
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
    
    res.json({
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
    console.error('Get advertisements error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch advertisements'
    });
  }
};

export const createAdvertisement = async (req: any, res: Response) => {
  try {
    const { title, subtitle, type, externalUrl, priority, startDate, endDate } = req.body;
    
    if (!title || !type) {
      return res.status(400).json({
        success: false,
        message: 'Title and type are required'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Image is required'
      });
    }
    
    const imageUrl = await uploadToCloudinary(req.file.buffer, {
      folder: 'advertisements',
      transformation: [
        { width: 800, height: 400, crop: 'fill' },
        { quality: 'auto' }
      ]
    });
    
    const advertisement = await Advertisement.create({
      title,
      subtitle,
      image: imageUrl,
      type,
      externalUrl: type === 'external' ? externalUrl : undefined,
      priority: parseInt(priority) || 1,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: new Date(endDate),
      status: 'active',
      createdBy: req.user._id,
      approvedBy: req.user._id,
      approvedAt: new Date()
    });
    
    await createAuditLog({
      userId: req.user._id,
      action: 'ADVERTISEMENT_CREATED',
      details: {
        advertisementId: advertisement._id,
        title,
        type,
        priority
      },
      ipAddress: req.ip
    });
    
    console.log(`✅ Admin created advertisement: ${advertisement._id}`);
    
    res.status(201).json({
      success: true,
      message: 'Advertisement created successfully',
      advertisement
    });
    
  } catch (error) {
    console.error('Create advertisement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create advertisement'
    });
  }
};

export const updateAdvertisement = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { title, subtitle, externalUrl, priority, startDate, endDate, status } = req.body;
    
    const advertisement = await Advertisement.findById(id);
    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }
    
    if (title) advertisement.title = title;
    if (subtitle !== undefined) advertisement.subtitle = subtitle;
    if (externalUrl !== undefined) advertisement.externalUrl = externalUrl;
    if (priority) advertisement.priority = parseInt(priority);
    if (startDate) advertisement.startDate = new Date(startDate);
    if (endDate) advertisement.endDate = new Date(endDate);
    if (status) advertisement.status = status;
    
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
    
    await createAuditLog({
      userId: req.user._id,
      action: 'ADVERTISEMENT_UPDATED',
      details: {
        advertisementId: advertisement._id,
        updatedFields: Object.keys(req.body)
      },
      ipAddress: req.ip
    });
    
    console.log(`✅ Admin updated advertisement: ${advertisement._id}`);
    
    res.json({
      success: true,
      message: 'Advertisement updated successfully',
      advertisement
    });
    
  } catch (error) {
    console.error('Update advertisement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update advertisement'
    });
  }
};

export const deleteAdvertisement = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const advertisement = await Advertisement.findById(id);
    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }
    
    await Advertisement.findByIdAndDelete(id);
    
    await createAuditLog({
      userId: req.user._id,
      action: 'ADVERTISEMENT_DELETED',
      details: {
        advertisementId: id,
        title: advertisement.title,
        type: advertisement.type
      },
      ipAddress: req.ip
    });
    
    console.log(`✅ Admin deleted advertisement: ${id}`);
    
    res.json({
      success: true,
      message: 'Advertisement deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete advertisement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete advertisement'
    });
  }
};

export const getAdvertisementStats = async (req: AuthRequest, res: Response) => {
  try {
    const [totalAds, activeAds, userAds, adminAds] = await Promise.all([
      Advertisement.countDocuments(),
      Advertisement.countDocuments({ status: 'active' }),
      Advertisement.countDocuments({ type: 'user_product' }),
      Advertisement.countDocuments({ type: 'admin' })
    ]);

    const totalImpressions = await Advertisement.aggregate([
      { $group: { _id: null, total: { $sum: '$impressions' } } }
    ]);

    const totalClicks = await Advertisement.aggregate([
      { $group: { _id: null, total: { $sum: '$clicks' } } }
    ]);

    const revenueFromAds = await Advertisement.aggregate([
      {
        $match: {
          type: 'user_product',
          paymentStatus: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$paymentAmount' }
        }
      }
    ]);

    const adsByStatus = await Advertisement.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const topPerformingAds = await Advertisement.find({
      status: 'active',
      clicks: { $gt: 0 }
    })
      .populate('productId', 'title')
      .sort({ clicks: -1 })
      .limit(5)
      .select('title clicks impressions type');

    res.json({
      success: true,
      stats: {
        totals: {
          totalAds,
          activeAds,
          userAds,
          adminAds
        },
        performance: {
          totalImpressions: totalImpressions[0]?.total || 0,
          totalClicks: totalClicks[0]?.total || 0,
          averageCTR: totalImpressions[0]?.total > 0 
            ? ((totalClicks[0]?.total || 0) / totalImpressions[0].total * 100).toFixed(2)
            : '0.00'
        },
        revenue: {
          totalRevenue: revenueFromAds[0]?.total || 0
        },
        byStatus: adsByStatus.reduce((acc: any, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        topPerforming: topPerformingAds
      }
    });

  } catch (error) {
    console.error('Get advertisement stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch advertisement statistics'
    });
  }
};

export const approveUserAdvertisement = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    
    const advertisement = await Advertisement.findById(id);
    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }
    
    if (advertisement.type !== 'user_product') {
      return res.status(400).json({
        success: false,
        message: 'Only user product advertisements can be approved'
      });
    }
    
    if (advertisement.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Advertisement is not pending approval'
      });
    }
    
    advertisement.status = 'active';
    advertisement.approvedBy = req.user._id;
    advertisement.approvedAt = new Date();
    
    await advertisement.save();
    
    await createAuditLog({
      userId: req.user._id,
      action: 'USER_ADVERTISEMENT_APPROVED',
      details: {
        advertisementId: id,
        userId: advertisement.userId,
        productId: advertisement.productId,
        comments
      },
      ipAddress: req.ip
    });
    
    console.log(`✅ Admin approved user advertisement: ${id}`);
    
    res.json({
      success: true,
      message: 'User advertisement approved successfully',
      advertisement
    });
    
  } catch (error) {
    console.error('Approve user advertisement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve user advertisement'
    });
  }
};

export const rejectUserAdvertisement = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const advertisement = await Advertisement.findById(id);
    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }
    
    if (advertisement.type !== 'user_product') {
      return res.status(400).json({
        success: false,
        message: 'Only user product advertisements can be rejected'
      });
    }
    
    advertisement.status = 'inactive';
    advertisement.approvedBy = req.user._id;
    advertisement.approvedAt = new Date();
    
    await advertisement.save();
    
    await createAuditLog({
      userId: req.user._id,
      action: 'USER_ADVERTISEMENT_REJECTED',
      details: {
        advertisementId: id,
        userId: advertisement.userId,
        productId: advertisement.productId,
        reason
      },
      ipAddress: req.ip
    });
    
    console.log(`✅ Admin rejected user advertisement: ${id}`);
    
    res.json({
      success: true,
      message: 'User advertisement rejected successfully',
      advertisement
    });
    
  } catch (error) {
    console.error('Reject user advertisement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject user advertisement'
    });
  }
};