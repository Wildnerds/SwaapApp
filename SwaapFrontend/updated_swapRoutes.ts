import express from 'express';
import Swap from '@/models/Swap';
import Product from '@/models/Product';
// import User from '@models/User';
import { sendEmail } from '@/utils/sendEmail';
import { sendPushNotification } from '@/utils/sendPushNotification';
import { getLevelFromSwaps } from '@/utils/levelUtils';
import { verifyJwtToken } from '@/middlewares/verifyJwtToken';

const router = express.Router();

// POST /api/swaps - create a swap offer
router.post('/', verifyJwtToken, async (req, res) => {
  try {
    // ✅ Changed to match your model field names
    const { offeringProductId, requestedProductId, message, extraPayment } = req.body;

    // ✅ Updated variable names to match
    const offeringProduct = await Product.findById(offeringProductId).populate('user');
    const requestedProduct = await Product.findById(requestedProductId).populate('user');

    if (!offeringProduct || !requestedProduct) {
      return res.status(404).json({
        type: 'error',
        message: 'Product not found'
      });
    }

    const toUser = requestedProduct.user;
    const fromUser = req.user; // set by verifyJwtToken middleware

    if (!fromUser) {
      return res.status(404).json({
        type: 'error',
        message: 'User not found'
      });
    }

    // Create the swap
    const swap = await Swap.create({
      fromUser: fromUser._id,
      toUser: toUser._id,
      offeringProduct: offeringProduct._id, // ✅ Matches model field name
      requestedProduct: requestedProduct._id,
      message,
      extraPayment: extraPayment || 0, // ✅ Added extraPayment support
      status: 'pending',
    });

    // ✅ UPDATED: Send email notification with names instead of emails
    await sendEmail(
      toUser.email,
      'Hey Swapper!! You received a swap offer!',
      `
        <p>Hi ${toUser.fullName || toUser.email},</p>
        <p><strong>${fromUser.fullName || fromUser.email}</strong> offered to swap their "${offeringProduct.title}" for your "${requestedProduct.title}".</p>
        ${extraPayment > 0 ? `<p>They're also offering an additional ₦${extraPayment.toLocaleString()} cash!</p>` : ''}
        ${message ? `<p><em>Message: "${message}"</em></p>` : ''}
        <p><a href="https://yourswaapapp.com/swaps/${swap._id}" style="background-color: #FFC107; color: #121212; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Swap Offer</a></p>
        <p>Happy Swapping! 🔄</p>
      `
    );

    // ✅ UPDATED: Send push notification with names instead of emails
    if (toUser.expoPushToken) {
      await sendPushNotification(
        toUser.expoPushToken,
        'New Swap Offer! 🔄',
        `${fromUser.fullName || fromUser.email} wants to swap ${offeringProduct.title} for your ${requestedProduct.title}${extraPayment > 0 ? ` + ₦${extraPayment.toLocaleString()}` : ''}!`,
        {
          swapId: swap._id,
          type: 'swap_offer',
          fromUserId: fromUser._id,
          fromUserName: fromUser.fullName || fromUser.email,
          productTitle: requestedProduct.title
        }
      );
    }

    // ✅ Example usage of your level utils
    const toUserLevel = getLevelFromSwaps(toUser.successfulSwaps);
    console.log(`${toUser.fullName || toUser.email} is currently level ${toUserLevel}`);

    return res.status(201).json({
      type: 'success',
      message: 'Swap offer created.',
      data: swap
    });
  } catch (err) {
    console.error('Create swap error:', err);
    return res.status(500).json({
      type: 'error',
      message: 'Server error'
    });
  }
});

// GET /api/swaps/my-sent - Get swaps sent by current user
router.get('/my-sent', verifyJwtToken, async (req, res) => {
  try {
    const fromUser = req.user;
    
    if (!fromUser) {
      return res.status(404).json({
        type: 'error',
        message: 'User not found'
      });
    }

    const swaps = await Swap.find({ fromUser: fromUser._id })
      .populate([
        {
          path: 'fromUser',
          select: 'fullName email'
        },
        {
          path: 'toUser', 
          select: 'fullName email'
        },
        {
          path: 'offeringProduct',
          select: 'title price images'
        },
        {
          path: 'requestedProduct',
          select: 'title price images'
        }
      ])
      .sort({ createdAt: -1 });

    return res.status(200).json({
      type: 'success',
      data: swaps
    });
  } catch (err) {
    console.error('Get my sent swaps error:', err);
    return res.status(500).json({
      type: 'error',
      message: 'Server error'
    });
  }
});

// GET /api/swaps/my-received - Get swaps received by current user  
router.get('/my-received', verifyJwtToken, async (req, res) => {
  try {
    const toUser = req.user;
    
    if (!toUser) {
      return res.status(404).json({
        type: 'error',
        message: 'User not found'
      });
    }

    const swaps = await Swap.find({ toUser: toUser._id })
      .populate([
        {
          path: 'fromUser',
          select: 'fullName email'
        },
        {
          path: 'toUser',
          select: 'fullName email'
        },
        {
          path: 'offeringProduct', 
          select: 'title price images'
        },
        {
          path: 'requestedProduct',
          select: 'title price images'
        }
      ])
      .sort({ createdAt: -1 });

    return res.status(200).json({
      type: 'success', 
      data: swaps
    });
  } catch (err) {
    console.error('Get my received swaps error:', err);
    return res.status(500).json({
      type: 'error',
      message: 'Server error'
    });
  }
});

// GET /api/swaps/:id - Get single swap details
router.get('/:id', verifyJwtToken, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;
    
    if (!currentUser) {
      return res.status(404).json({
        type: 'error',
        message: 'User not found'
      });
    }

    const swap = await Swap.findById(id)
      .populate([
        {
          path: 'fromUser',
          select: 'fullName email'
        },
        {
          path: 'toUser',
          select: 'fullName email'  
        },
        {
          path: 'offeringProduct',
          select: 'title price images'
        },
        {
          path: 'requestedProduct',
          select: 'title price images'
        }
      ]);

    if (!swap) {
      return res.status(404).json({
        type: 'error',
        message: 'Swap not found'
      });
    }

    // Check if user is involved in this swap
    if (swap.fromUser._id.toString() !== currentUser._id.toString() && 
        swap.toUser._id.toString() !== currentUser._id.toString()) {
      return res.status(403).json({
        type: 'error',
        message: 'Access denied'
      });
    }

    return res.status(200).json({
      type: 'success',
      data: swap
    });
  } catch (err) {
    console.error('Get single swap error:', err);
    return res.status(500).json({
      type: 'error',
      message: 'Server error'
    });
  }
});

export default router;