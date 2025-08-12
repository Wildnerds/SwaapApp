import express from 'express';
import mongoose from 'mongoose';
import UserReview from '@/models/UserReview';
import User from '@/models/User';
import Review from '@/models/Review';
import Swap from '@/models/Swap';
import { verifyJwtToken } from '@/middlewares/verifyJwtToken';

const router = express.Router();

// Unified rating update function that combines product reviews and user reviews
const updateUserRating = async (userId: string) => {
  try {
    console.log(`🔄 [UserReview] Starting rating update for user ${userId}`);
    
    // Get product reviews where user was the seller
    const productReviews = await Review.find({ seller: userId });
    console.log(`📦 [UserReview] Found ${productReviews.length} product reviews for seller ${userId}`);
    if (productReviews.length > 0) {
      console.log(`📦 [UserReview] Product reviews:`, productReviews.map(r => ({ id: r._id, rating: r.rating, comment: r.comment.substring(0, 30) })));
    }
    
    // Get user-to-user reviews where user was reviewed
    const userReviews = await UserReview.find({ reviewedUser: userId });
    console.log(`👤 [UserReview] Found ${userReviews.length} user reviews for user ${userId}`);
    if (userReviews.length > 0) {
      console.log(`👤 [UserReview] User reviews:`, userReviews.map(r => ({ id: r._id, rating: r.rating, type: r.reviewType })));
    }
    
    // Combine all reviews
    const allReviews = [
      ...productReviews.map(r => ({ rating: r.rating, type: 'product' })),
      ...userReviews.map(r => ({ rating: r.rating, type: 'user' }))
    ];
    
    if (allReviews.length === 0) {
      console.log(`❌ [UserReview] No reviews found for user ${userId}, setting defaults`);
      // No reviews, set defaults
      await User.findByIdAndUpdate(userId, {
        averageRating: 0,
        totalReviews: 0
      });
      return;
    }
    
    // Calculate combined average
    const totalRating = allReviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / allReviews.length;
    
    console.log(`📊 [UserReview] Calculated average: ${totalRating}/${allReviews.length} = ${averageRating}`);
    
    const result = await User.findByIdAndUpdate(userId, {
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      totalReviews: allReviews.length
    }, { new: true });
    
    console.log(`✅ [UserReview] Updated rating for user ${userId}: ${averageRating.toFixed(1)} (${allReviews.length} reviews: ${productReviews.length} product + ${userReviews.length} user)`);
    console.log(`✅ [UserReview] User record now shows: averageRating=${result?.averageRating}, totalReviews=${result?.totalReviews}`);
    
  } catch (error) {
    console.error('❌ [UserReview] Error updating user rating:', error);
  }
};

// Helper function to get display name
const getDisplayName = (user: any): string => {
  if (user.fullName && user.fullName.trim()) {
    return user.fullName.trim();
  }
  
  if (user.email) {
    const emailPrefix = user.email.split('@')[0];
    return emailPrefix
      .replace(/[._]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  return 'Anonymous User';
};

// GET /api/users/:userId/reviews - Get reviews for a user
router.get('/users/:userId/reviews', async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const reviewType = req.query.type as string; // 'seller', 'buyer', 'swapper'
    const skip = (page - 1) * limit;

    console.log(`🔍 UserReview: Fetching reviews for user ${userId} with type filter: ${reviewType || 'all'}`);

    // Convert string to ObjectId for proper querying
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Build query
    let query: any = { reviewedUser: userObjectId };
    if (reviewType && ['seller', 'buyer', 'swapper'].includes(reviewType)) {
      query.reviewType = reviewType;
      console.log(`🔍 UserReview: Applied filter - query:`, query);
    } else {
      console.log(`🔍 UserReview: No filter applied - query:`, query);
    }

    // Get user to verify they exist
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        type: 'error',
        message: 'User not found'
      });
    }

    // Get reviews with populated reviewer info
    const reviews = await UserReview.find(query)
      .populate('reviewer', '_id fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    console.log(`🔍 UserReview: Found ${reviews.length} reviews matching query`);
    if (reviews.length > 0) {
      console.log(`🔍 UserReview: Sample reviews:`, reviews.map(r => ({ 
        id: r._id, 
        type: r.reviewType, 
        rating: r.rating,
        reviewedUser: r.reviewedUser.toString()
      })));
    }

    // Calculate summary statistics
    const totalReviews = await UserReview.countDocuments(query);
    const ratingStats = await UserReview.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          ratingBreakdown: {
            $push: '$rating'
          },
          reviewTypeBreakdown: {
            $push: '$reviewType'
          }
        }
      }
    ]);

    const summary = {
      averageRating: totalReviews > 0 ? ratingStats[0]?.averageRating || 0 : 0,
      totalReviews,
      ratingBreakdown: {
        5: 0,
        4: 0,
        3: 0,
        2: 0,
        1: 0
      },
      reviewTypeBreakdown: {
        seller: 0,
        buyer: 0,
        swapper: 0
      }
    };

    // Calculate rating breakdown
    if (ratingStats[0]?.ratingBreakdown) {
      ratingStats[0].ratingBreakdown.forEach((rating: number) => {
        summary.ratingBreakdown[rating as keyof typeof summary.ratingBreakdown]++;
      });
    }

    // Calculate review type breakdown
    if (ratingStats[0]?.reviewTypeBreakdown) {
      ratingStats[0].reviewTypeBreakdown.forEach((type: string) => {
        if (type in summary.reviewTypeBreakdown) {
          summary.reviewTypeBreakdown[type as keyof typeof summary.reviewTypeBreakdown]++;
        }
      });
    }

    // Format reviews for response
    const formattedReviews = reviews.map(review => ({
      _id: review._id,
      rating: review.rating,
      comment: review.comment,
      reviewType: review.reviewType,
      reviewerName: getDisplayName(review.reviewer),
      reviewerId: review.reviewer._id, // Include reviewer ID for ownership check
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      helpful: review.helpful,
      userHelpfulVote: false, // Will be set below if user is authenticated
      verified: review.verified,
      isOwner: false, // Will be set below if user is authenticated
    }));

    // If user is authenticated, check their helpful votes
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const currentUserId = decoded.id;

        // Update userHelpfulVote and isOwner for each review
        for (let review of formattedReviews) {
          const originalReview = await UserReview.findById(review._id);
          if (originalReview && originalReview.helpfulVotes.includes(currentUserId)) {
            review.userHelpfulVote = true;
          }
          // Check if current user is the reviewer
          console.log(`📊 User review ownership check: reviewerId=${review.reviewerId}, currentUserId=${currentUserId}, isOwner=${review.reviewerId?.toString() === currentUserId.toString()}`);
          if (review.reviewerId && review.reviewerId.toString() === currentUserId.toString()) {
            review.isOwner = true;
            console.log(`✅ Set isOwner=true for user review ${review._id}`);
          }
        }
      } catch (error) {
        // Ignore token errors for this optional feature
      }
    }

    return res.status(200).json({
      reviews: formattedReviews,
      summary,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalReviews / limit),
        totalReviews,
        hasMore: skip + reviews.length < totalReviews
      }
    });

  } catch (error) {
    console.error('Get user reviews error:', error);
    return res.status(500).json({
      type: 'error',
      message: 'Server error'
    });
  }
});

// GET /api/users/:userId/can-review - Check if current user can review another user
router.get('/users/:userId/can-review', verifyJwtToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    console.log(`🔍 Can-review check: currentUser=${currentUserId} wants to review user=${userId}`);

    // User cannot review themselves
    if (userId === currentUserId.toString()) {
      console.log(`❌ Cannot review self`);
      return res.status(200).json({ canReview: false, reason: 'Cannot review yourself' });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        type: 'error',
        message: 'User not found'
      });
    }

    // Check if user already reviewed this user
    const existingReview = await UserReview.findOne({
      reviewer: currentUserId,
      reviewedUser: userId
    });

    if (existingReview) {
      return res.status(200).json({ canReview: false, reason: 'Already reviewed this user' });
    }

    // Check if users have interacted (through swaps, purchases, etc.)
    const hasInteracted = await Swap.findOne({
      $or: [
        { fromUser: currentUserId, toUser: userId, status: { $in: ['accepted', 'completed'] } },
        { fromUser: userId, toUser: currentUserId, status: { $in: ['accepted', 'completed'] } }
      ]
    });

    // For now, allow anyone to review (can be made stricter later)
    const canReview = true; // hasInteracted ? true : false;

    console.log(`✅ Can-review result: canReview=${canReview}, hasInteracted=${!!hasInteracted}`);

    return res.status(200).json({ 
      canReview,
      reason: canReview ? 'Can review' : 'Must interact first',
      hasInteracted: !!hasInteracted
    });

  } catch (error) {
    console.error('Check can review user error:', error);
    return res.status(500).json({
      type: 'error',
      message: 'Server error'
    });
  }
});

// POST /api/users/:userId/reviews - Create a review for a user
router.post('/users/:userId/reviews', verifyJwtToken, async (req, res) => {
  try {
    console.log(`📥 [UserReview] POST request received for user ${req.params.userId}`);
    console.log(`📥 [UserReview] Request body:`, req.body);
    console.log(`📥 [UserReview] Current user:`, req.user._id);
    
    const { userId } = req.params;
    const { rating, comment, reviewType, transactionId } = req.body;
    const currentUserId = req.user._id;

    // Validate input
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        type: 'error',
        message: 'Rating must be between 1 and 5'
      });
    }

    if (!comment || comment.trim().length < 10) {
      return res.status(400).json({
        type: 'error',
        message: 'Comment must be at least 10 characters long'
      });
    }

    if (!reviewType || !['seller', 'buyer', 'swapper'].includes(reviewType)) {
      return res.status(400).json({
        type: 'error',
        message: 'Review type must be seller, buyer, or swapper'
      });
    }

    // User cannot review themselves
    if (userId === currentUserId.toString()) {
      return res.status(403).json({
        type: 'error',
        message: 'Cannot review yourself'
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        type: 'error',
        message: 'User not found'
      });
    }

    // Check if user already reviewed this user
    const existingReview = await UserReview.findOne({
      reviewer: currentUserId,
      reviewedUser: userId
    });

    if (existingReview) {
      return res.status(409).json({
        type: 'error',
        message: 'You have already reviewed this user'
      });
    }

    // Create the review
    console.log(`📝 [UserReview] Creating user review: reviewedUser=${userId}, reviewer=${currentUserId}, rating=${rating}, type=${reviewType}`);
    const review = await UserReview.create({
      reviewer: currentUserId,
      reviewedUser: userId,
      rating: parseInt(rating),
      comment: comment.trim(),
      reviewType,
      transactionReference: transactionId || null,
      verified: !!transactionId // Mark as verified if linked to transaction
    });
    console.log(`✅ [UserReview] Created user review: ${review._id}`);

    // Update user's rating (combining both product reviews and user reviews)
    console.log(`🔄 [UserReview] About to update user rating for: ${userId}`);
    await updateUserRating(userId);

    return res.status(201).json({
      type: 'success',
      message: 'User review created successfully',
      data: review
    });

  } catch (error) {
    console.error('Create user review error:', error);
    return res.status(500).json({
      type: 'error',
      message: 'Server error'
    });
  }
});

// PUT /api/user-reviews/:reviewId - Update a user review
router.put('/user-reviews/:reviewId', verifyJwtToken, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment, reviewType } = req.body;
    const currentUserId = req.user._id;

    // Validate input
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        type: 'error',
        message: 'Rating must be between 1 and 5'
      });
    }

    if (!comment || comment.trim().length < 10) {
      return res.status(400).json({
        type: 'error',
        message: 'Comment must be at least 10 characters long'
      });
    }

    if (reviewType && !['seller', 'buyer', 'swapper'].includes(reviewType)) {
      return res.status(400).json({
        type: 'error',
        message: 'Review type must be seller, buyer, or swapper'
      });
    }

    // Find the review
    const review = await UserReview.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        type: 'error',
        message: 'Review not found'
      });
    }

    // Check if user owns this review
    if (review.reviewer.toString() !== currentUserId.toString()) {
      return res.status(403).json({
        type: 'error',
        message: 'You can only edit your own reviews'
      });
    }

    // Update the review
    review.rating = parseInt(rating);
    review.comment = comment.trim();
    if (reviewType) {
      review.reviewType = reviewType;
    }
    review.updatedAt = new Date();
    
    await review.save();

    // Update user's unified rating
    await updateUserRating(review.reviewedUser.toString());

    return res.status(200).json({
      type: 'success',
      message: 'User review updated successfully',
      data: review
    });

  } catch (error) {
    console.error('Update user review error:', error);
    return res.status(500).json({
      type: 'error',
      message: 'Server error'
    });
  }
});

// DELETE /api/user-reviews/:reviewId - Delete a user review
router.delete('/user-reviews/:reviewId', verifyJwtToken, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user._id;

    // Find the review
    const review = await UserReview.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        type: 'error',
        message: 'Review not found'
      });
    }

    // Check if user owns this review
    if (review.reviewer.toString() !== userId.toString()) {
      return res.status(403).json({
        type: 'error',
        message: 'You can only delete your own reviews'
      });
    }

    const reviewedUserId = review.reviewedUser;

    // Delete the review
    await UserReview.findByIdAndDelete(reviewId);

    // Update user's unified rating
    await updateUserRating(reviewedUserId.toString());

    return res.status(200).json({
      type: 'success',
      message: 'User review deleted successfully'
    });

  } catch (error) {
    console.error('Delete user review error:', error);
    return res.status(500).json({
      type: 'error',
      message: 'Server error'
    });
  }
});

// POST /api/user-reviews/:reviewId/helpful - Mark a user review as helpful
router.post('/user-reviews/:reviewId/helpful', verifyJwtToken, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user._id;

    const review = await UserReview.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        type: 'error',
        message: 'Review not found'
      });
    }

    // User cannot vote on their own review
    if (review.reviewer.toString() === userId.toString()) {
      return res.status(403).json({
        type: 'error',
        message: 'Cannot vote on your own review'
      });
    }

    // Check if user already voted
    const alreadyVoted = review.helpfulVotes.includes(userId);
    
    if (alreadyVoted) {
      // Remove vote (toggle)
      review.helpfulVotes = review.helpfulVotes.filter(
        id => id.toString() !== userId.toString()
      );
      review.helpful = Math.max(0, review.helpful - 1);
    } else {
      // Add vote
      review.helpfulVotes.push(userId);
      review.helpful += 1;
    }

    await review.save();

    return res.status(200).json({
      type: 'success',
      message: alreadyVoted ? 'Vote removed' : 'Vote recorded',
      data: {
        helpful: review.helpful,
        userVoted: !alreadyVoted
      }
    });

  } catch (error) {
    console.error('Vote helpful on user review error:', error);
    return res.status(500).json({
      type: 'error',
      message: 'Server error'
    });
  }
});

export default router;