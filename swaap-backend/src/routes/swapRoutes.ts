 import express from 'express';
  import Swap from '@/models/Swap';
  import Product from '@/models/Product';
  // import User from '@models/User';
  import { sendEmail } from '@/utils/sendEmail';
  import { sendPushNotification } from '@/utils/sendPushNotification';
  import { sendInAppNotification } from '@/utils/sendInAppNotification';
  import { getLevelFromSwaps } from '@/utils/levelUtils';
  import { verifyJwtToken } from '@/middlewares/verifyJwtToken';

  const router = express.Router();

  // Helper function to get display name with better fallback
  const getDisplayName = (user: any): string => {
    if (user.fullName && user.fullName.trim()) {
      return user.fullName.trim();
    }
    
    // Extract first part of email before @ as fallback
    if (user.email) {
      const emailPrefix = user.email.split('@')[0];
      // Capitalize first letter and replace dots/underscores with spaces for better readability
      return emailPrefix
        .replace(/[._]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    
    return 'User';
  };

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

      // ✅ Log exact payment calculation
      const priceDifference = Math.abs(offeringProduct.price - requestedProduct.price);
      console.log(`💰 Swap Payment Analysis:
        - Offering Product: "${offeringProduct.title}" - ₦${offeringProduct.price}
        - Requested Product: "${requestedProduct.title}" - ₦${requestedProduct.price}
        - Price Difference: ₦${priceDifference}
        - Extra Payment Required: ₦${extraPayment || 0}
      `);

      // Create the swap
      const swap = await Swap.create({
        fromUser: fromUser._id,
        toUser: toUser._id,
        offeringProduct: offeringProduct._id,
        requestedProduct: requestedProduct._id,
        message,
        extraPayment: extraPayment || 0,
        status: 'pending',
      });

      // ✅ UPDATED: Get display names with better fallback
      const fromUserName = getDisplayName(fromUser);
      const toUserName = getDisplayName(toUser);

      // ✅ UPDATED: Email notification with user-friendly names
      await sendEmail(
        toUser.email,
        'Hey Swaapper!! You received a swap offer!',
        `
          <p>Hi ${toUserName},</p>
          <p><strong>${fromUserName}</strong> offered to swap their "${offeringProduct.title}" for your "${requestedProduct.title}".</p>
          ${extraPayment > 0 ? `<p>They're also offering an additional ₦${extraPayment.toLocaleString()} cash!</p>` : ''}
          ${message ? `<p><em>Message: "${message}"</em></p>` : ''}
          <p><a href="https://yourswaapapp.com/swaps/${swap._id}" style="background-color: #FFC107; color: #121212; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Swaap Offer</a></p>
          <p>Happy Swaapping! 🔄</p>
        `
      );

      // ✅ UPDATED: Push notification with user-friendly names
      if (toUser.expoPushToken) {
        await sendPushNotification(
          toUser.expoPushToken,
          'New Swap Offer! 🔄',
          `${fromUserName} wants to swap ${offeringProduct.title} for your ${requestedProduct.title}${extraPayment > 0 ? ` + ₦${extraPayment.toLocaleString()}` : ''}!`,
          {
            swapId: swap._id,
            type: 'swap_offer',
            fromUserId: fromUser._id,
            fromUserName: fromUserName,
            productTitle: requestedProduct.title
          }
        );
      }

      // ✅ NEW: In-app notification for swap offer
      console.log(`🔔 Creating in-app swap offer notification for user: ${toUser._id}`);
      await sendInAppNotification(toUser._id.toString(), {
        type: 'swap_offer',
        message: `${fromUserName} wants to swap ${offeringProduct.title} for your ${requestedProduct.title}${extraPayment > 0 ? ` + ₦${extraPayment.toLocaleString()}` : ''}!`,
        data: {
          swapId: swap._id,
          fromUserId: fromUser._id,
          fromUserName: fromUserName,
          offeringProductTitle: offeringProduct.title,
          requestedProductTitle: requestedProduct.title,
          extraPayment: extraPayment
        }
      });
      console.log(`✅ Swap offer notification created successfully`);

      // ✅ Example usage of your level utils
      const toUserLevel = getLevelFromSwaps(toUser.successfulSwaps);
      console.log(`${toUserName} is currently level ${toUserLevel}`);

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

      return res.status(200).json(swaps);
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

      return res.status(200).json(swaps);
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

      return res.status(200).json(swap);
    } catch (err) {
      console.error('Get single swap error:', err);
      return res.status(500).json({
        type: 'error',
        message: 'Server error'
      });
    }
  });

  // PUT /api/swaps/:id/accept - Accept a swap offer
  router.put('/:id/accept', verifyJwtToken, async (req, res) => {
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
        .populate(['fromUser', 'toUser', 'offeringProduct', 'requestedProduct']);

      if (!swap) {
        return res.status(404).json({
          type: 'error',
          message: 'Swap not found'
        });
      }

      // Only the recipient can accept the swap
      if (swap.toUser._id.toString() !== currentUser._id.toString()) {
        return res.status(403).json({
          type: 'error',
          message: 'Only the recipient can accept this swap'
        });
      }

      // Can only accept pending swaps
      if (swap.status !== 'pending') {
        return res.status(400).json({
          type: 'error',
          message: 'This swap is no longer pending'
        });
      }

      // Update swap status
      swap.status = 'accepted';
      await swap.save();

      // Send notification to the person who made the offer
      const fromUserName = getDisplayName(swap.fromUser);
      const toUserName = getDisplayName(swap.toUser);

      await sendEmail(
        swap.fromUser.email,
        'Swap Accepted! 🎉',
        `
          <p>Hi ${fromUserName},</p>
          <p>Great news! <strong>${toUserName}</strong> accepted your swap offer!</p>
          <p><a href="https://yourswaapapp.com/swaps/${swap._id}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Accepted Swap</a></p>
          <p>Happy Swaapping! 🔄</p>
        `
      );

      if (swap.fromUser.expoPushToken) {
        await sendPushNotification(
          swap.fromUser.expoPushToken,
          'Swap Accepted! 🎉',
          `${toUserName} accepted your swap offer!`,
          {
            swapId: swap._id,
            type: 'swap_accepted',
            fromUserId: swap.toUser._id,
            fromUserName: toUserName
          }
        );
      }

      // ✅ NEW: In-app notification for swap accepted
      await sendInAppNotification(swap.fromUser._id.toString(), {
        type: 'swap_accepted',
        message: `${toUserName} accepted your swap offer!`,
        data: {
          swapId: swap._id,
          fromUserId: swap.toUser._id,
          fromUserName: toUserName
        }
      });

      return res.status(200).json({
        type: 'success',
        message: 'Swap accepted successfully',
        data: swap
      });
    } catch (err) {
      console.error('Accept swap error:', err);
      return res.status(500).json({
        type: 'error',
        message: 'Server error'
      });
    }
  });

  // PUT /api/swaps/:id/reject - Reject a swap offer
  router.put('/:id/reject', verifyJwtToken, async (req, res) => {
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
        .populate(['fromUser', 'toUser', 'offeringProduct', 'requestedProduct']);

      if (!swap) {
        return res.status(404).json({
          type: 'error',
          message: 'Swap not found'
        });
      }

      // Only the recipient can reject the swap
      if (swap.toUser._id.toString() !== currentUser._id.toString()) {
        return res.status(403).json({
          type: 'error',
          message: 'Only the recipient can reject this swap'
        });
      }

      // Can only reject pending swaps
      if (swap.status !== 'pending') {
        return res.status(400).json({
          type: 'error',
          message: 'This swap is no longer pending'
        });
      }

      // Update swap status
      swap.status = 'rejected';
      await swap.save();

      // Send notification to the person who made the offer
      const fromUserName = getDisplayName(swap.fromUser);
      const toUserName = getDisplayName(swap.toUser);

      await sendEmail(
        swap.fromUser.email,
        'Swap Update',
        `
          <p>Hi ${fromUserName},</p>
          <p><strong>${toUserName}</strong> declined your swap offer.</p>
          <p>Don't worry, there are plenty of other Swaappers out there!</p>
          <p><a href="https://yourswaapapp.com" style="background-color: #FFC107; color: #121212; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Find More Items</a></p>
          <p>Happy Swaapping! 🔄</p>
        `
      );

      if (swap.fromUser.expoPushToken) {
        await sendPushNotification(
          swap.fromUser.expoPushToken,
          'Swap Update',
          `${toUserName} declined your swap offer`,
          {
            swapId: swap._id,
            type: 'swap_rejected',
            fromUserId: swap.toUser._id,
            fromUserName: toUserName
          }
        );
      }

      // ✅ NEW: In-app notification for swap rejected
      await sendInAppNotification(swap.fromUser._id.toString(), {
        type: 'swap_rejected',
        message: `${toUserName} declined your swap offer`,
        data: {
          swapId: swap._id,
          fromUserId: swap.toUser._id,
          fromUserName: toUserName
        }
      });

      return res.status(200).json({
        type: 'success',
        message: 'Swap rejected successfully',
        data: swap
      });
    } catch (err) {
      console.error('Reject swap error:', err);
      return res.status(500).json({
        type: 'error',
        message: 'Server error'
      });
    }
  });

  // DELETE /api/swaps/:id - Delete a swap
  router.delete('/:id', verifyJwtToken, async (req, res) => {
    try {
      const { id } = req.params;
      const currentUser = req.user;

      if (!currentUser) {
        return res.status(404).json({
          type: 'error',
          message: 'User not found'
        });
      }

      const swap = await Swap.findById(id);

      if (!swap) {
        return res.status(404).json({
          type: 'error',
          message: 'Swap not found'
        });
      }

      // Only participants can delete the swap
      if (swap.fromUser.toString() !== currentUser._id.toString() &&
          swap.toUser.toString() !== currentUser._id.toString()) {
        return res.status(403).json({
          type: 'error',
          message: 'You can only delete your own swaps'
        });
      }

      await Swap.findByIdAndDelete(id);

      return res.status(200).json({
        type: 'success',
        message: 'Swap deleted successfully'
      });
    } catch (err) {
      console.error('Delete swap error:', err);
      return res.status(500).json({
        type: 'error',
        message: 'Server error'
      });
    }
  });

// POST /api/swaps/:id/status - Generic status update endpoint (for backward compatibility)
router.post('/:id/status', verifyJwtToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(404).json({
        type: 'error',
        message: 'User not found'
      });
    }

    const swap = await Swap.findById(id)
      .populate(['fromUser', 'toUser', 'offeringProduct', 'requestedProduct']);

    if (!swap) {
      return res.status(404).json({
        type: 'error',
        message: 'Swap not found'
      });
    }

    // Only the recipient can update the swap
    if (swap.toUser._id.toString() !== currentUser._id.toString()) {
      return res.status(403).json({
        type: 'error',
        message: 'Only the recipient can update this swap'
      });
    }

    // Can only update pending swaps
    if (swap.status !== 'pending') {
      return res.status(400).json({
        type: 'error',
        message: 'This swap is no longer pending'
      });
    }
    
    if (status === 'accepted') {
      swap.status = 'accepted';
      await swap.save();
      
      // Send notifications (same as accept route)
      const fromUserName = getDisplayName(swap.fromUser);
      const toUserName = getDisplayName(swap.toUser);

      try {
        await sendEmail(
          swap.fromUser.email,
          'Swap Accepted! 🎉',
          `
            <p>Hi ${fromUserName},</p>
            <p>Great news! <strong>${toUserName}</strong> accepted your swap offer!</p>
            <p><a href="https://yourswaapapp.com/swaps/${swap._id}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Accepted Swap</a></p>
            <p>Happy Swaapping! 🔄</p>
          `
        );

        if (swap.fromUser.expoPushToken) {
          await sendPushNotification(
            swap.fromUser.expoPushToken,
            'Swap Accepted! 🎉',
            `${toUserName} accepted your swap offer!`,
            {
              swapId: swap._id,
              type: 'swap_accepted',
              fromUserId: swap.toUser._id,
              fromUserName: toUserName
            }
          );
        }

        // ✅ NEW: In-app notification for swap accepted
        await sendInAppNotification(swap.fromUser._id.toString(), {
          type: 'swap_accepted',
          message: `${toUserName} accepted your swap offer!`,
          data: {
            swapId: swap._id,
            fromUserId: swap.toUser._id,
            fromUserName: toUserName
          }
        });
      } catch (emailError) {
        console.log('Email/notification error:', emailError);
      }
      
      return res.status(200).json({
        type: 'success',
        message: 'Swap accepted successfully',
        data: swap
      });
      
    } else if (status === 'rejected') {
      swap.status = 'rejected';
      await swap.save();
      
      // Send notifications (same as reject route)
      const fromUserName = getDisplayName(swap.fromUser);
      const toUserName = getDisplayName(swap.toUser);

      try {
        await sendEmail(
          swap.fromUser.email,
          'Swap Declined 😔',
          `
            <p>Hi ${fromUserName},</p>
            <p>Unfortunately, <strong>${toUserName}</strong> declined your swap offer.</p>
            <p>Don't worry, there are plenty of other great items to swap on Swaap!</p>
            <p><a href="https://yourswaapapp.com/explore" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Explore More Items</a></p>
            <p>Happy Swaapping! 🔄</p>
          `
        );

        if (swap.fromUser.expoPushToken) {
          await sendPushNotification(
            swap.fromUser.expoPushToken,
            'Swap Declined 😔',
            `${toUserName} declined your swap offer`,
            {
              swapId: swap._id,
              type: 'swap_rejected',
              fromUserId: swap.toUser._id,
              fromUserName: toUserName
            }
          );
        }

        // ✅ NEW: In-app notification for swap rejected
        await sendInAppNotification(swap.fromUser._id.toString(), {
          type: 'swap_rejected',
          message: `${toUserName} declined your swap offer`,
          data: {
            swapId: swap._id,
            fromUserId: swap.toUser._id,
            fromUserName: toUserName
          }
        });
      } catch (emailError) {
        console.log('Email/notification error:', emailError);
      }
      
      return res.status(200).json({
        type: 'success',
        message: 'Swap rejected successfully',
        data: swap
      });
      
    } else {
      return res.status(400).json({
        type: 'error',
        message: 'Invalid status. Use "accepted" or "rejected"'
      });
    }
  } catch (err) {
    console.error('Status update error:', err);
    return res.status(500).json({
      type: 'error', 
      message: 'Server error'
    });
  }
});

// POST /api/swaps/payment/wallet - Process swap payment via wallet
router.post('/payment/wallet', verifyJwtToken, async (req, res) => {
  try {
    const { swapId, amount, description, recipient } = req.body;
    const userId = req.user._id;

    console.log(`💰 Processing swap wallet payment: ${swapId}, amount: ₦${amount}`);

    // Verify swap exists and user is authorized
    const swap = await Swap.findById(swapId).populate(['fromUser', 'toUser']);
    if (!swap) {
      return res.status(404).json({
        type: 'error',
        message: 'Swap not found'
      });
    }

    // Check if user is involved in the swap
    if (swap.fromUser._id.toString() !== userId.toString() &&
        swap.toUser._id.toString() !== userId.toString()) {
      return res.status(403).json({
        type: 'error',
        message: 'Access denied'
      });
    }

    // For now, return success - actual payment processing would happen here
    const reference = `SWAP-WALLET-${swapId}-${Date.now()}`;
    
    // Update swap status to indicate payment made
    swap.paymentStatus = 'completed';
    swap.paymentReference = reference;
    await swap.save();

    console.log(`✅ Swap wallet payment successful: ${reference}`);

    // Send notifications to both parties
    const payerName = getDisplayName(req.user);
    const recipientName = getDisplayName(swap.fromUser._id.toString() === userId.toString() ? swap.toUser : swap.fromUser);
    const recipientUser = swap.fromUser._id.toString() === userId.toString() ? swap.toUser : swap.fromUser;

    // Email notification to payment recipient
    await sendEmail(
      recipientUser.email,
      'Swap Payment Received! 💰',
      `
        <p>Hi ${recipientName},</p>
        <p>Great news! <strong>${payerName}</strong> has completed the payment of ₦${amount.toLocaleString()} for your swap!</p>
        <p><strong>Payment Details:</strong></p>
        <ul>
          <li>Amount: ₦${amount.toLocaleString()}</li>
          <li>Reference: ${reference}</li>
          <li>Description: ${description}</li>
        </ul>
        <p>Your swap is now fully completed. You can arrange to exchange your items.</p>
        <p>Happy Swaapping! 🔄</p>
      `
    );

    // Email notification to payment sender
    await sendEmail(
      req.user.email,
      'Swap Payment Successful! ✅',
      `
        <p>Hi ${payerName},</p>
        <p>Your swap payment has been processed successfully!</p>
        <p><strong>Payment Details:</strong></p>
        <ul>
          <li>Amount: ₦${amount.toLocaleString()}</li>
          <li>Reference: ${reference}</li>
          <li>Recipient: ${recipientName}</li>
        </ul>
        <p>Your swap is now complete. You can proceed to exchange your items.</p>
        <p>Happy Swaapping! 🔄</p>
      `
    );

    // In-app notification to payment recipient
    await sendInAppNotification(recipientUser._id.toString(), {
      type: 'swap_payment_received',
      message: `${payerName} sent you ₦${amount.toLocaleString()} for your swap`,
      data: {
        swapId: swap._id,
        amount,
        payerName,
        reference
      }
    });

    // In-app notification to payment sender
    await sendInAppNotification(userId.toString(), {
      type: 'swap_payment_sent',
      message: `Payment of ₦${amount.toLocaleString()} sent to ${recipientName}`,
      data: {
        swapId: swap._id,
        amount,
        recipientName,
        reference
      }
    });

    return res.status(200).json({
      type: 'success',
      message: 'Swap payment successful',
      reference
    });
  } catch (err) {
    console.error('Swap wallet payment error:', err);
    return res.status(500).json({
      type: 'error',
      message: 'Payment processing failed'
    });
  }
});

// POST /api/swaps/payment/card - Process swap payment via card
router.post('/payment/card', verifyJwtToken, async (req, res) => {
  try {
    const { swapId, amount, description, recipient } = req.body;
    const userId = req.user._id;

    console.log(`💳 Processing swap card payment: ${swapId}, amount: ₦${amount}`);

    // Verify swap exists and user is authorized
    const swap = await Swap.findById(swapId).populate(['fromUser', 'toUser']);
    if (!swap) {
      return res.status(404).json({
        type: 'error',
        message: 'Swap not found'
      });
    }

    // Check if user is involved in the swap
    if (swap.fromUser._id.toString() !== userId.toString() &&
        swap.toUser._id.toString() !== userId.toString()) {
      return res.status(403).json({
        type: 'error',
        message: 'Access denied'
      });
    }

    // Initialize actual Paystack payment with swap payment metadata
    const paystackResponse = await paystackApi.post('/transaction/initialize', {
      email: req.user.email,
      amount: amount * 100, // Convert to kobo
      reference: `SWAP-CARD-${swapId}-${Date.now()}`,
      metadata: {
        purpose: 'swap_payment',
        swap_id: swapId,
        user_id: req.user._id.toString(),
        amount: amount,
        description: description,
        recipient: recipient
      }
    });

    const data = paystackResponse.data?.data;
    console.log(`✅ Swap card payment initialized: ${data.reference}`);

    return res.status(200).json({
      type: 'success',
      message: 'Payment initialized',
      authorization_url: data.authorization_url,
      reference: data.reference
    });
  } catch (err) {
    console.error('Swap card payment error:', err);
    return res.status(500).json({
      type: 'error',
      message: 'Payment initialization failed'
    });
  }
});

// POST /api/swaps/payment/hybrid - Process swap payment via hybrid (wallet + card)
router.post('/payment/hybrid', verifyJwtToken, async (req, res) => {
  try {
    const { swapId, amount, description, recipient } = req.body;
    const userId = req.user._id;

    console.log(`🔄 Processing swap hybrid payment: ${swapId}, amount: ₦${amount}`);

    // Verify swap exists and user is authorized
    const swap = await Swap.findById(swapId).populate(['fromUser', 'toUser']);
    if (!swap) {
      return res.status(404).json({
        type: 'error',
        message: 'Swap not found'
      });
    }

    // Check if user is involved in the swap
    if (swap.fromUser._id.toString() !== userId.toString() &&
        swap.toUser._id.toString() !== userId.toString()) {
      return res.status(403).json({
        type: 'error',
        message: 'Access denied'
      });
    }

    // Mock hybrid payment logic - in reality would check wallet balance
    const mockWalletBalance = 5000; // Mock wallet balance
    const amountLeft = Math.max(0, amount - mockWalletBalance);
    
    if (amountLeft > 0) {
      // Need card payment for remaining amount
      const reference = `SWAP-HYBRID-${swapId}-${Date.now()}`;
      const authorization_url = `https://checkout.paystack.com/mock/${reference}`;
      
      console.log(`✅ Swap hybrid payment initialized: ${reference}, remaining: ₦${amountLeft}`);
      
      return res.status(200).json({
        type: 'success',
        message: 'Hybrid payment initialized',
        authorization_url,
        reference,
        amountLeft
      });
    } else {
      // Wallet covers full amount
      const reference = `SWAP-WALLET-FULL-${swapId}-${Date.now()}`;
      
      // Update swap status
      swap.paymentStatus = 'completed';
      swap.paymentReference = reference;
      await swap.save();
      
      console.log(`✅ Swap hybrid payment completed via wallet: ${reference}`);
      
      return res.status(200).json({
        type: 'success',
        message: 'Payment successful',
        reference,
        amountLeft: 0
      });
    }
  } catch (err) {
    console.error('Swap hybrid payment error:', err);
    return res.status(500).json({
      type: 'error',
      message: 'Payment processing failed'
    });
  }
});

export default router;