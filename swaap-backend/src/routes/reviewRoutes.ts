import express from 'express';
import mongoose from 'mongoose';
import Review from '@/models/Review';
import Product from '@/models/Product';
import User from '@/models/User';
import UserReview from '@/models/UserReview';
import Swap from '@/models/Swap';
import { verifyJwtToken } from '@/middlewares/verifyJwtToken';

const router = express.Router();

// Unified rating update function that combines product reviews and user reviews
const updateUserRating = async (userId: string) => {
  try {
    console.log(`🔄 Starting rating update for user ${userId}`);
    
    // Get product reviews where user was the seller
    const productReviews = await Review.find({ seller: userId });
    console.log(`📦 Found ${productReviews.length} product reviews for seller ${userId}`);
    if (productReviews.length > 0) {
      console.log(`📦 Product reviews:`, productReviews.map(r => ({ id: r._id, rating: r.rating, comment: r.comment.substring(0, 50) })));
    }
    
    // Get user-to-user reviews where user was reviewed
    const userReviews = await UserReview.find({ reviewedUser: userId });
    console.log(`👤 Found ${userReviews.length} user reviews for user ${userId}`);
    if (userReviews.length > 0) {
      console.log(`👤 User reviews:`, userReviews.map(r => ({ id: r._id, rating: r.rating, type: r.reviewType })));
    }
    
    // Combine all reviews
    const allReviews = [
      ...productReviews.map(r => ({ rating: r.rating, type: 'product' })),
      ...userReviews.map(r => ({ rating: r.rating, type: 'user' }))
    ];
    
    if (allReviews.length === 0) {
      console.log(`❌ No reviews found for user ${userId}, setting defaults`);
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
    
    console.log(`📊 Calculated average: ${totalRating}/${allReviews.length} = ${averageRating}`);
    
    const result = await User.findByIdAndUpdate(userId, {
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      totalReviews: allReviews.length
    }, { new: true });
    
    console.log(`✅ Updated rating for user ${userId}: ${averageRating.toFixed(1)} (${allReviews.length} reviews: ${productReviews.length} product + ${userReviews.length} user)`);
    console.log(`✅ User record now shows: averageRating=${result?.averageRating}, totalReviews=${result?.totalReviews}`);
    
  } catch (error) {
    console.error('❌ Error updating user rating:', error);
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

// GET /api/products/:productId/reviews - Get reviews for a product
router.get('/products/:productId/reviews', async (req, res) => {
  try {
    const { productId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get product to verify it exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        type: 'error',
        message: 'Product not found'
      });
    }

    // Get reviews with populated reviewer info
    const reviews = await Review.find({ product: productId })
      .populate('reviewer', '_id fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Calculate summary statistics
    const totalReviews = await Review.countDocuments({ product: productId });
    const ratingStats = await Review.aggregate([
      { $match: { product: product._id } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          ratingBreakdown: {
            $push: '$rating'
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
      }
    };

    // Calculate rating breakdown
    if (ratingStats[0]?.ratingBreakdown) {
      ratingStats[0].ratingBreakdown.forEach((rating: number) => {
        summary.ratingBreakdown[rating as keyof typeof summary.ratingBreakdown]++;
      });
    }

    // Format reviews for response
    console.log(`🔍 Formatting ${reviews.length} reviews for response`);
    const formattedReviews = reviews.map(review => {
      console.log(`📝 Review ${review._id}:`);
      console.log(`   - reviewer object:`, review.reviewer);
      console.log(`   - reviewer._id:`, review.reviewer?._id);
      console.log(`   - reviewer.id:`, review.reviewer?.id);
      
      const reviewerId = review.reviewer?._id || review.reviewer?.id;
      console.log(`   - final reviewerId:`, reviewerId);
      
      return {
        _id: review._id,
        rating: review.rating,
        comment: review.comment,
        reviewerName: getDisplayName(review.reviewer),
        reviewerId: reviewerId, // Include reviewer ID for ownership check
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
        helpful: review.helpful,
        userHelpfulVote: false, // Will be set below if user is authenticated
        isOwner: false, // Will be set below if user is authenticated
      };
    });

    // If user is authenticated, check their helpful votes
    const authHeader = req.headers.authorization;
    console.log(`🔍 Auth header:`, authHeader ? 'Present' : 'Missing');
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        console.log(`🔑 Token extracted:`, token ? 'Present' : 'Missing');
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log(`🔓 JWT decoded:`, decoded);
        const userId = decoded.id || decoded._id;
        console.log(`👤 Final userId:`, userId);

        // Update userHelpfulVote and isOwner for each review
        console.log(`🔍 Processing ${formattedReviews.length} reviews for ownership check with userId: ${userId}`);
        for (let review of formattedReviews) {
          const originalReview = await Review.findById(review._id);
          if (originalReview && originalReview.helpfulVotes.includes(userId)) {
            review.userHelpfulVote = true;
          }
          // Check if current user is the reviewer
          console.log(`📊 Ownership check for review ${review._id}:`);
          console.log(`   - reviewerId: ${review.reviewerId} (type: ${typeof review.reviewerId})`);
          console.log(`   - currentUserId: ${userId} (type: ${typeof userId})`);
          console.log(`   - reviewerId toString: ${review.reviewerId?.toString()}`);
          console.log(`   - userId toString: ${userId?.toString()}`);
          
          // Convert both to strings for comparison
          const reviewerIdStr = review.reviewerId?.toString();
          const userIdStr = userId?.toString();
          console.log(`   - Final comparison: "${reviewerIdStr}" === "${userIdStr}" = ${reviewerIdStr === userIdStr}`);
          
          if (review.reviewerId && userId && reviewerIdStr === userIdStr) {
            review.isOwner = true;
            console.log(`✅ Set isOwner=true for review ${review._id}`);
          } else {
            console.log(`❌ NOT setting isOwner for review ${review._id}`);
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
    console.error('Get product reviews error:', error);
    return res.status(500).json({
      type: 'error',
      message: 'Server error'
    });
  }
});

// GET /api/products/:productId/can-review - Check if user can review a product
router.get('/products/:productId/can-review', verifyJwtToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        type: 'error',
        message: 'Product not found'
      });
    }

    // User cannot review their own product
    if (product.user.toString() === userId.toString()) {
      return res.status(200).json({ canReview: false, reason: 'Cannot review own product' });
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      product: productId,
      reviewer: userId
    });

    if (existingReview) {
      return res.status(200).json({ canReview: false, reason: 'Already reviewed' });
    }

    // Check if user has a completed swap with this product
    const hasSwapped = await Swap.findOne({
      $or: [
        { 
          offeringProduct: productId,
          toUser: userId,
          status: { $in: ['accepted', 'completed'] }
        },
        { 
          requestedProduct: productId,
          fromUser: userId,
          status: { $in: ['accepted', 'completed'] }
        }
      ]
    });

    // For now, allow anyone to review (can be made stricter later)
    const canReview = true; // !hasSwapped ? false : true;

    return res.status(200).json({ 
      canReview,
      reason: canReview ? 'Can review' : 'Must complete a swap first'
    });

  } catch (error) {
    console.error('Check can review error:', error);
    return res.status(500).json({
      type: 'error',
      message: 'Server error'
    });
  }
});

// POST /api/products/:productId/reviews - Create a review for a product
router.post('/products/:productId/reviews', verifyJwtToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user._id;

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

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        type: 'error',
        message: 'Product not found'
      });
    }

    // User cannot review their own product
    if (product.user.toString() === userId.toString()) {
      return res.status(403).json({
        type: 'error',
        message: 'Cannot review your own product'
      });
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      product: productId,
      reviewer: userId
    });

    if (existingReview) {
      return res.status(409).json({
        type: 'error',
        message: 'You have already reviewed this product'
      });
    }

    // Create the review
    console.log(`📝 Creating product review: productId=${productId}, reviewer=${userId}, seller=${product.user}, rating=${rating}`);
    const review = await Review.create({
      product: productId,
      reviewer: userId,
      seller: product.user,
      rating: parseInt(rating),
      comment: comment.trim(),
      verified: false // TODO: Check if user actually swapped/purchased
    });
    console.log(`✅ Created review: ${review._id}`);

    // Update product's average rating
    const reviews = await Review.find({ product: productId });
    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    
    await Product.findByIdAndUpdate(productId, {
      averageRating: averageRating,
      reviewCount: reviews.length
    });
    console.log(`✅ Updated product ${productId} rating to ${averageRating} (${reviews.length} reviews)`);

    // Update seller's rating (combining both product reviews and user reviews)
    console.log(`🔄 About to update seller rating for user: ${product.user}`);
    await updateUserRating(product.user.toString());

    return res.status(201).json({
      type: 'success',
      message: 'Review created successfully',
      data: review
    });

  } catch (error) {
    console.error('Create review error:', error);
    return res.status(500).json({
      type: 'error',
      message: 'Server error'
    });
  }
});

// PUT /api/reviews/:reviewId - Update a product review
router.put('/reviews/:reviewId', verifyJwtToken, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user._id;

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

    // Find the review
    const review = await Review.findById(reviewId).populate('product');
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
        message: 'You can only edit your own reviews'
      });
    }

    // Update the review
    review.rating = parseInt(rating);
    review.comment = comment.trim();
    review.updatedAt = new Date();
    
    await review.save();

    // Update product's average rating
    const reviews = await Review.find({ product: review.product._id });
    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    
    await Product.findByIdAndUpdate(review.product._id, {
      averageRating: averageRating,
      reviewCount: reviews.length
    });

    // Update seller's unified rating
    await updateUserRating(review.seller.toString());

    return res.status(200).json({
      type: 'success',
      message: 'Review updated successfully',
      data: review
    });

  } catch (error) {
    console.error('Update review error:', error);
    return res.status(500).json({
      type: 'error',
      message: 'Server error'
    });
  }
});

// DELETE /api/reviews/:reviewId - Delete a product review
router.delete('/reviews/:reviewId', verifyJwtToken, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user._id;

    // Find the review
    const review = await Review.findById(reviewId).populate('product');
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

    const productId = review.product._id;
    const sellerId = review.seller;

    // Delete the review
    await Review.findByIdAndDelete(reviewId);

    // Update product's average rating
    const remainingReviews = await Review.find({ product: productId });
    const averageRating = remainingReviews.length > 0 
      ? remainingReviews.reduce((sum, r) => sum + r.rating, 0) / remainingReviews.length 
      : 0;
    
    await Product.findByIdAndUpdate(productId, {
      averageRating: averageRating,
      reviewCount: remainingReviews.length
    });

    // Update seller's unified rating
    await updateUserRating(sellerId.toString());

    return res.status(200).json({
      type: 'success',
      message: 'Review deleted successfully'
    });

  } catch (error) {
    console.error('Delete review error:', error);
    return res.status(500).json({
      type: 'error',
      message: 'Server error'
    });
  }
});

// POST /api/reviews/:reviewId/helpful - Mark a review as helpful
router.post('/reviews/:reviewId/helpful', verifyJwtToken, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user._id;

    const review = await Review.findById(reviewId);
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
    console.error('Vote helpful error:', error);
    return res.status(500).json({
      type: 'error',
      message: 'Server error'
    });
  }
});

// GET /api/users/:userId/product-reviews - Get product reviews written by a user  
router.get('/users/:userId/product-reviews', async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const reviews = await Review.find({ reviewer: userId })
      .populate('product', 'title images')
      .populate('seller', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalReviews = await Review.countDocuments({ reviewer: userId });

    return res.status(200).json({
      reviews,
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

// GET /api/sellers/:sellerId/reviews - Get reviews for a seller
router.get('/sellers/:sellerId/reviews', async (req, res) => {
  try {
    const { sellerId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    console.log(`🔍 Fetching seller reviews for seller: ${sellerId}`);
    
    // Convert string to ObjectId for proper querying
    const sellerObjectId = new mongoose.Types.ObjectId(sellerId);

    const reviews = await Review.find({ seller: sellerObjectId })
      .populate('reviewer', '_id fullName email')
      .populate('product', 'title images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    console.log(`📦 Found ${reviews.length} product reviews for seller ${sellerId}`);

    const totalReviews = await Review.countDocuments({ seller: sellerObjectId });

    // Calculate seller rating summary using proper ObjectId
    const ratingStats = await Review.aggregate([
      { $match: { seller: sellerObjectId } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          ratingBreakdown: { $push: '$rating' }
        }
      }
    ]);

    console.log(`📊 Aggregation result for seller ${sellerId}:`, ratingStats);

    // Also get user-to-user reviews for this seller to show unified rating
    console.log(`🔍 Looking for user reviews with reviewedUser: ${sellerObjectId}`);
    const userReviews = await UserReview.find({ reviewedUser: sellerObjectId });
    console.log(`👤 Found ${userReviews.length} user reviews for seller ${sellerId}`);
    if (userReviews.length > 0) {
      console.log(`👤 User reviews:`, userReviews.map(r => ({ id: r._id, rating: r.rating, type: r.reviewType })));
    }
    
    // Debug: Let's also check all user reviews in the database
    const allUserReviews = await UserReview.find({});
    console.log(`📊 Total user reviews in database: ${allUserReviews.length}`);
    if (allUserReviews.length > 0) {
      console.log(`📊 All user reviews:`, allUserReviews.map(r => ({ id: r._id, reviewedUser: r.reviewedUser.toString(), rating: r.rating })));
    }

    // Calculate unified summary (product reviews + user reviews)
    const allReviews = [
      ...reviews.map(r => ({ rating: r.rating, type: 'product' })),
      ...userReviews.map(r => ({ rating: r.rating, type: 'user' }))
    ];

    const summary = {
      averageRating: 0,
      totalReviews: totalReviews,
      productReviews: reviews.length,
      userReviews: userReviews.length,
      unifiedTotal: allReviews.length,
      ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    };

    // Calculate unified average rating
    if (allReviews.length > 0) {
      const totalRating = allReviews.reduce((sum, review) => sum + review.rating, 0);
      summary.averageRating = totalRating / allReviews.length;
      console.log(`📊 Unified rating: ${totalRating}/${allReviews.length} = ${summary.averageRating}`);
    } else if (ratingStats[0]?.averageRating) {
      // Fallback to just product reviews if no user reviews
      summary.averageRating = ratingStats[0].averageRating;
      console.log(`📊 Product-only rating: ${summary.averageRating}`);
    }

    // Calculate rating breakdown from product reviews only (for this endpoint)
    if (ratingStats[0]?.ratingBreakdown) {
      ratingStats[0].ratingBreakdown.forEach((rating: number) => {
        summary.ratingBreakdown[rating as keyof typeof summary.ratingBreakdown]++;
      });
    }

    console.log(`✅ Final summary for seller ${sellerId}:`, summary);

    return res.status(200).json({
      reviews,
      summary,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalReviews / limit),
        totalReviews,
        hasMore: skip + reviews.length < totalReviews
      }
    });

  } catch (error) {
    console.error('Get seller reviews error:', error);
    return res.status(500).json({
      type: 'error',
      message: 'Server error'
    });
  }
});

// DEBUG: Manual rating recalculation endpoint
router.post('/debug/recalculate-rating/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`🐛 DEBUG: Manual rating recalculation for user ${userId}`);
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log(`🐛 User before update:`, {
      id: user._id,
      fullName: user.fullName,
      averageRating: user.averageRating,
      totalReviews: user.totalReviews
    });
    
    // Manually call the update function
    await updateUserRating(userId);
    
    // Get updated user
    const updatedUser = await User.findById(userId);
    
    return res.json({
      message: 'Rating recalculated',
      before: {
        averageRating: user.averageRating,
        totalReviews: user.totalReviews
      },
      after: {
        averageRating: updatedUser?.averageRating,
        totalReviews: updatedUser?.totalReviews
      }
    });
    
  } catch (error) {
    console.error('Debug recalculate error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;