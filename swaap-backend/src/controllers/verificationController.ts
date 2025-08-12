// src/controllers/verificationController.ts
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/User';
import IdentityVerification from '../models/IdentityVerification';
import { sendVerificationNotification } from '../services/notificationService';
import { createAuditLog } from '../services/auditService';

interface AuthRequest extends Request {
  user?: {
    _id: string;
    email: string;
    role: 'user' | 'admin';
  };
  files?: {
    frontImage?: Express.Multer.File[];
    backImage?: Express.Multer.File[];
  };
}

export const uploadIdentityDocuments = async (req: AuthRequest, res: Response) => {
  try {
    const { documentType, documentNumber } = req.body;
    
    // ✅ Fixed: Proper type handling for multer files
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const frontImage = files?.frontImage;
    const backImage = files?.backImage;
    
    const userId = req.user?._id;

    console.log('📤 Upload request received:', {
      userId,
      documentType,
      hasFiles: !!files,
      frontImage: frontImage ? 'Present' : 'Missing',
      backImage: backImage ? 'Present' : 'Missing'
    });

    // Validation
    if (!documentType || !frontImage || !frontImage[0]) {
      return res.status(400).json({ 
        success: false, 
        message: 'Document type and front image are required' 
      });
    }

    const validDocTypes = ['nin', 'drivers_license', 'passport', 'voters_card'];
    if (!validDocTypes.includes(documentType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document type'
      });
    }

    // Check if user already has a pending verification
    const existingPending = await IdentityVerification.findOne({
      userId,
      status: { $in: ['uploaded', 'processing'] }
    });

    if (existingPending) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending verification. Please wait for it to be processed.'
      });
    }

    const uploadId = uuidv4();

    // Create verification record
    const verification = new IdentityVerification({
      uploadId,
      userId,
      documentType,
      documentNumber: documentNumber || '',
      frontImagePath: frontImage[0].path,
      backImagePath: backImage?.[0]?.path || null,
      status: 'uploaded',
      submittedAt: new Date(),
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        fileInfo: {
          frontImage: {
            originalName: frontImage[0].originalname,
            size: frontImage[0].size,
            mimetype: frontImage[0].mimetype
          },
          backImage: backImage?.[0] ? {
            originalName: backImage[0].originalname,
            size: backImage[0].size,
            mimetype: backImage[0].mimetype
          } : null
        }
      }
    });

    await verification.save();

    console.log('✅ Verification record created:', uploadId);

    // Create audit log
    await createAuditLog({
      userId,
      action: 'IDENTITY_VERIFICATION_UPLOADED',
      details: {
        uploadId,
        documentType,
        hasBackImage: !!backImage?.[0]
      },
      ipAddress: req.ip
    });

    // Send notification to admin team
    await sendVerificationNotification('new_verification', {
      uploadId,
      userId,
      documentType,
      userEmail: req.user?.email
    });

    res.json({
      success: true,
      uploadId,
      message: 'Documents uploaded successfully. Review will be completed within 24-48 hours.',
      estimatedReviewTime: '24-48 hours'
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    
    // Clean up uploaded files on error
    const fs = await import('fs/promises');
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const frontImage = files?.frontImage;
      const backImage = files?.backImage;
      
      if (frontImage?.[0]?.path) {
        await fs.unlink(frontImage[0].path);
      }
      if (backImage?.[0]?.path) {
        await fs.unlink(backImage[0].path);
      }
    } catch (cleanupError) {
      console.error('File cleanup error:', cleanupError);
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload documents. Please try again.'
    });
  }
};

export const getVerificationStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { uploadId } = req.params;
    const userId = req.user?._id;

    const verification = await IdentityVerification.findOne({ 
      uploadId, 
      userId 
    }).select('-frontImagePath -backImagePath -metadata');

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'Verification not found'
      });
    }

    res.json({
      success: true,
      verification: {
        uploadId: verification.uploadId,
        documentType: verification.documentType,
        status: verification.status,
        submittedAt: verification.submittedAt,
        reviewedAt: verification.reviewedAt,
        reviewComments: verification.reviewComments,
        estimatedCompletionTime: getEstimatedCompletionTime(verification)
      }
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check verification status'
    });
  }
};

export const getUserVerifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    const verifications = await IdentityVerification.find({ userId })
      .select('-frontImagePath -backImagePath -metadata')
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      verifications
    });

  } catch (error) {
    console.error('Get verifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch verifications'
    });
  }
};

// Helper function
function getEstimatedCompletionTime(verification: any) {
  if (verification.status === 'verified' || verification.status === 'rejected') {
    return null;
  }
  
  const submittedAt = new Date(verification.submittedAt);
  const estimatedCompletion = new Date(submittedAt.getTime() + (48 * 60 * 60 * 1000)); // 48 hours
  
  return estimatedCompletion;
}