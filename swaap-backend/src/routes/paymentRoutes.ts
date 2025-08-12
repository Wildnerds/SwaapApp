// Enhanced payment routes - Orders created ONLY after successful payment

import { ensureMongoUserExists } from "@/middlewares/ensureMongoUserExists";
import { verifyJwtToken } from "@/middlewares/verifyJwtToken";
import Order from "@/models/Order";
import PaymentLog from "@/models/PaymentLog";
import User from "@/models/User";
import { paystackApi } from "@/utils/paystack";
import router from "./authRoutes";


// POST /api/pay/cart-pay - Initialize payment WITHOUT creating orders
router.post('/cart-pay', verifyJwtToken, ensureMongoUserExists, async (req, res) => {
  try {
    const { 
      items, 
      totalAmount, 
      serviceFee = 0, 
      shippingFee = 0,
      shippingMethod = 'self-arranged',
      shippingAddress 
    } = req.body;
    const userId = req.user?._id;

    console.log('📦 Cart pay initialization:', {
      itemsCount: items?.length,
      totalAmount,
      serviceFee,
      shippingFee,
      shippingMethod
    });

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Invalid cart items' });
    }

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ message: 'Invalid total amount' });
    }

    // Validate shipping requirements
    if (shippingMethod !== 'self-arranged' && !shippingAddress) {
      return res.status(400).json({ message: 'Shipping address required for delivery' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Calculate and validate amounts
    const itemsTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const expectedTotal = itemsTotal + shippingFee;
    
    if (Math.abs(totalAmount - expectedTotal) > 1) {
      return res.status(400).json({ 
        message: 'Total amount mismatch',
        expected: expectedTotal,
        received: totalAmount,
        breakdown: {
          items: itemsTotal,
          shipping: shippingFee,
          service: serviceFee
        }
      });
    }

    // Initialize Paystack payment with cart data in metadata
    const response = await paystackApi.post('/transaction/initialize', {
      email: user.email,
      amount: totalAmount * 100, // Convert to kobo
      metadata: {
        purpose: 'cart_payment',
        user_id: user._id.toString(),
        shipping_method: shippingMethod,
        service_fee: serviceFee,
        shipping_fee: shippingFee,
        items_total: itemsTotal,
        // Store cart items for order creation after payment
        cart_items: JSON.stringify(items),
        // Store shipping address if provided
        shipping_address: shippingAddress ? JSON.stringify(shippingAddress) : null
      }
    });

    const data = response.data?.data;

    // Log payment initialization (not successful payment yet)
    await PaymentLog.create({
      user: userId,
      amount: totalAmount,
      reference: data.reference,
      status: 'pending',
      type: 'cart_payment',
      method: 'paystack',
      serviceFeeAmount: serviceFee,
      shippingFeeAmount: shippingFee,
      gatewayResponse: 'Payment initialized',
      // Don't set paidAt for pending payments
    });

    return res.status(200).json({
      message: 'Cart payment initialized - complete payment to create orders',
      authorization_url: data.authorization_url,
      access_code: data.access_code,
      reference: data.reference,
      payment_breakdown: {
        items_total: itemsTotal,
        shipping_fee: shippingFee,
        service_fee: serviceFee,
        total_amount: totalAmount
      }
    });

  } catch (err) {
    console.error('❌ Cart payment initialization error:', err);
    return res.status(500).json({ 
      message: 'Cart payment initialization failed',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// POST /api/pay/wallet/cart-pay - Wallet payment (immediate order creation since payment is instant)
router.post('/wallet/cart-pay', verifyJwtToken, ensureMongoUserExists, async (req, res) => {
  try {
    const { 
      items, 
      totalAmount, 
      serviceFee = 0, 
      shippingFee = 0,
      shippingMethod = 'self-arranged',
      shippingAddress 
    } = req.body;
    const userId = req.user?._id;

    console.log('💰 Wallet cart payment request:', {
      itemsCount: items?.length,
      totalAmount,
      serviceFee,
      shippingFee
    });

    // Validate inputs
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Invalid cart items' });
    }

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ message: 'Invalid total amount' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check wallet balance
    if (user.walletBalance < totalAmount) {
      return res.status(400).json({ 
        message: 'Insufficient wallet balance',
        required: totalAmount,
        available: user.walletBalance,
        shortfall: totalAmount - user.walletBalance
      });
    }

    // Start transaction to ensure atomicity
    const session = await User.startSession();
    session.startTransaction();

    try {
      // Deduct from wallet
      await User.findByIdAndUpdate(
        userId, 
        { $inc: { walletBalance: -totalAmount } },
        { session }
      );

      const reference = `WALLET-CART-${Date.now()}`;
      const orders = [];
      
      // Create orders (wallet payment is immediate)
      for (const item of items) {
        const productId = item._id || item.productId || item.id;
        if (!productId) continue;

        const itemServiceFee = Math.round(serviceFee / items.length);
        const itemShippingFee = Math.round(shippingFee / items.length);

        const order = await Order.create([{
          user: userId,
          product: productId,
          quantity: item.quantity,
          totalAmount: (item.price * item.quantity) + itemShippingFee,
          paymentMethod: 'wallet',
          reference: reference,
          status: 'paid',
          paidAt: new Date(),
          
          buyer: userId,
          seller: item.user?._id || item.sellerId,
          shippingMethod: shippingMethod === 'self-arranged' ? 'self-arranged' : 'shipbubble',
          verificationLevel: item.verificationLevel || 'basic',
          serviceFee: itemServiceFee,
          shippingFee: itemShippingFee,
          
          shipToAddress: shippingMethod !== 'self-arranged' ? {
            name: shippingAddress?.name || user.fullName,
            phone: shippingAddress?.phone || user.mobile,
            email: user.email,
            address: shippingAddress?.address,
            city: shippingAddress?.city,
            state: shippingAddress?.state
          } : undefined,
          
          shipFromAddress: {
            name: 'Swaap Marketplace',
            phone: '+2348000000000',
            email: 'shipping@swaap.com',
            address: 'Victoria Island',
            city: 'Lagos',
            state: 'Lagos'
          }
        }], { session });

        orders.push(order[0]);
      }

      // Log successful wallet payment
      await PaymentLog.create([{
        user: userId,
        amount: totalAmount,
        reference: reference,
        status: 'success',
        type: 'cart_payment',
        method: 'wallet',
        serviceFeeAmount: serviceFee,
        shippingFeeAmount: shippingFee,
        gatewayResponse: 'Wallet payment successful',
        paidAt: new Date(),
      }], { session });

      await session.commitTransaction();

      // Create ShipBubble orders after successful transaction
      for (const order of orders) {
        if (order.shippingMethod === 'shipbubble' && order.shipToAddress) {
          try {
            const { shippingService } = require('@/services/ShippingService');
            
            const shippingOrder = await shippingService.createShippingOrder({
              ship_from: order.shipFromAddress,
              ship_to: order.shipToAddress,
              package: {
                weight: 1.0,
                value: order.totalAmount - order.shippingFee,
                description: `Order ${order._id}`,
                length: 30,
                width: 20,
                height: 15
              },
              service: 'standard',
              callback_url: `${process.env.BASE_URL}/api/webhook/shipbubble`
            });

            order.shipbubbleOrderId = shippingOrder.order_id;
            order.trackingCode = shippingOrder.tracking_code;
            order.trackingUrl = shippingOrder.tracking_url;
            order.shippingStatus = 'pending';
            await order.save();

            console.log('✅ ShipBubble order created:', shippingOrder.order_id);
            
          } catch (shippingError) {
            console.error('❌ ShipBubble order creation failed:', shippingError);
          }
        }
      }

      const updatedUser = await User.findById(userId);

      return res.status(200).json({
        message: 'Cart payment successful via wallet',
        reference: reference,
        orders: orders.map(o => ({ id: o._id, product: o.product })),
        new_wallet_balance: updatedUser.walletBalance,
        payment_breakdown: {
          items_total: totalAmount - shippingFee,
          shipping_fee: shippingFee,
          service_fee: serviceFee,
          total_amount: totalAmount
        }
      });

    } catch (transactionError) {
      await session.abortTransaction();
      throw transactionError;
    } finally {
      session.endSession();
    }

  } catch (err) {
    console.error('❌ Wallet cart payment error:', err);
    return res.status(500).json({ 
      message: 'Wallet payment failed',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// POST /api/pay/wallet/cart-pay-partial - Hybrid wallet + card payment
router.post('/wallet/cart-pay-partial', verifyJwtToken, ensureMongoUserExists, async (req, res) => {
  try {
    const { 
      items, 
      totalAmount, 
      serviceFee = 0, 
      shippingFee = 0,
      shippingMethod = 'self-arranged',
      shippingAddress 
    } = req.body;
    const userId = req.user?._id;

    console.log('🔄 Hybrid cart payment initialization:', {
      itemsCount: items?.length,
      totalAmount,
      serviceFee,
      shippingFee
    });

    // Validate inputs
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Invalid cart items' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const walletUsed = Math.min(user.walletBalance, totalAmount);
    const amountLeft = totalAmount - walletUsed;

    if (amountLeft <= 0) {
      // If fully covered by wallet, redirect to wallet payment
      return res.status(400).json({
        message: 'Use wallet payment endpoint - sufficient wallet balance',
        redirect_to: 'wallet/cart-pay'
      });
    }

    // Initialize Paystack for remaining amount (don't deduct wallet yet)
    const response = await paystackApi.post('/transaction/initialize', {
      email: user.email,
      amount: amountLeft * 100,
      metadata: {
        purpose: 'cart_hybrid_payment',
        user_id: user._id.toString(),
        wallet_used: walletUsed,
        total_amount: totalAmount,
        shipping_method: shippingMethod,
        service_fee: serviceFee,
        shipping_fee: shippingFee,
        items_total: totalAmount - shippingFee,
        cart_items: JSON.stringify(items),
        shipping_address: shippingAddress ? JSON.stringify(shippingAddress) : null
      }
    });

    const data = response.data?.data;

    // Log hybrid payment initialization
    await PaymentLog.create({
      user: userId,
      amount: amountLeft,
      reference: data.reference,
      status: 'pending',
      type: 'cart_hybrid_payment',
      method: 'paystack',
      serviceFeeAmount: serviceFee,
      shippingFeeAmount: shippingFee,
      gatewayResponse: `Hybrid payment initialized - wallet: ${walletUsed}, card: ${amountLeft}`,
      // Don't set paidAt for pending payments
    });

    return res.status(200).json({
      message: 'Hybrid payment initialized - complete card payment to process',
      authorization_url: data.authorization_url,
      reference: data.reference,
      wallet_used: walletUsed,
      amount_left: amountLeft,
      payment_breakdown: {
        total: totalAmount,
        wallet_used: walletUsed,
        card_amount: amountLeft
      }
    });

  } catch (err) {
    console.error('❌ Hybrid cart payment initialization error:', err);
    return res.status(500).json({ 
      message: 'Hybrid payment initialization failed',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// POST /api/webhook/paystack - Handle Paystack webhooks and create orders
router.post('/webhook/paystack', async (req, res) => {
  try {
    const { event, data } = req.body;

    if (event === 'charge.success') {
      const { reference, metadata, amount } = data;
      const purpose = metadata?.purpose;

      console.log(`🎉 Payment successful: ${reference}, Purpose: ${purpose}`);

      if (purpose === 'cart_payment') {
        await handleCartPaymentSuccess(metadata, reference, amount / 100);
      } else if (purpose === 'cart_hybrid_payment') {
        await handleHybridPaymentSuccess(metadata, reference, amount / 100);
      } else if (purpose === 'advertisement_payment') {
        await handleAdvertisementPaymentSuccess(metadata, reference, amount / 100);
      }

      // Update payment log
      await PaymentLog.findOneAndUpdate(
        { reference },
        { 
          status: 'success',
          paidAt: new Date(),
          gatewayResponse: JSON.stringify(data)
        }
      );
    }

    return res.status(200).json({ message: 'Webhook processed' });

  } catch (err) {
    console.error('❌ Webhook processing error:', err);
    return res.status(500).json({ message: 'Webhook processing failed' });
  }
});

// Helper function to handle successful cart payment
async function handleCartPaymentSuccess(metadata, reference, paidAmount) {
  try {
    const userId = metadata.user_id;
    const cartItems = JSON.parse(metadata.cart_items);
    const shippingAddress = metadata.shipping_address ? JSON.parse(metadata.shipping_address) : null;
    const serviceFee = parseFloat(metadata.service_fee) || 0;
    const shippingFee = parseFloat(metadata.shipping_fee) || 0;
    const shippingMethod = metadata.shipping_method || 'self-arranged';

    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const orders = [];

    // Create orders after successful payment
    for (const item of cartItems) {
      const productId = item._id || item.productId || item.id;
      if (!productId) continue;

      const itemServiceFee = Math.round(serviceFee / cartItems.length);
      const itemShippingFee = Math.round(shippingFee / cartItems.length);

      const order = await Order.create({
        user: userId,
        product: productId,
        quantity: item.quantity,
        totalAmount: (item.price * item.quantity) + itemShippingFee,
        paymentMethod: 'paystack',
        reference: reference,
        status: 'paid',
        paidAt: new Date(),
        
        buyer: userId,
        seller: item.user?._id || item.sellerId,
        shippingMethod: shippingMethod === 'self-arranged' ? 'self-arranged' : 'shipbubble',
        verificationLevel: item.verificationLevel || 'basic',
        serviceFee: itemServiceFee,
        shippingFee: itemShippingFee,
        
        shipToAddress: shippingMethod !== 'self-arranged' ? {
          name: shippingAddress?.name || user.fullName,
          phone: shippingAddress?.phone || user.mobile,
          email: user.email,
          address: shippingAddress?.address,
          city: shippingAddress?.city,
          state: shippingAddress?.state
        } : undefined,
        
        shipFromAddress: {
          name: 'Swaap Marketplace',
          phone: '+2348000000000',
          email: 'shipping@swaap.com',
          address: 'Victoria Island',
          city: 'Lagos',
          state: 'Lagos'
        }
      });

      orders.push(order);
      console.log(`✅ Order created after payment: ${order._id}`);

      // Create ShipBubble orders if needed
      if (order.shippingMethod === 'shipbubble' && order.shipToAddress) {
        try {
          const { shippingService } = require('@/services/ShippingService');
          
          const shippingOrder = await shippingService.createShippingOrder({
            ship_from: order.shipFromAddress,
            ship_to: order.shipToAddress,
            package: {
              weight: 1.0,
              value: order.totalAmount - order.shippingFee,
              description: `Order ${order._id}`,
              length: 30,
              width: 20,
              height: 15
            },
            service: 'standard',
            callback_url: `${process.env.BASE_URL}/api/webhook/shipbubble`
          });

          order.shipbubbleOrderId = shippingOrder.order_id;
          order.trackingCode = shippingOrder.tracking_code;
          order.trackingUrl = shippingOrder.tracking_url;
          order.shippingStatus = 'pending';
          await order.save();

          console.log('✅ ShipBubble order created:', shippingOrder.order_id);
          
        } catch (shippingError) {
          console.error('❌ ShipBubble order creation failed:', shippingError);
        }
      }
    }

    console.log(`✅ Created ${orders.length} orders for payment ${reference}`);

  } catch (err) {
    console.error('❌ Cart payment success handling error:', err);
    throw err;
  }
}

// Helper function to handle successful hybrid payment
async function handleHybridPaymentSuccess(metadata, reference, cardAmount) {
  try {
    const userId = metadata.user_id;
    const walletUsed = parseFloat(metadata.wallet_used) || 0;
    const totalAmount = parseFloat(metadata.total_amount);
    const cartItems = JSON.parse(metadata.cart_items);

    // Start transaction for hybrid payment
    const session = await User.startSession();
    session.startTransaction();

    try {
      // Deduct wallet amount now that card payment is successful
      if (walletUsed > 0) {
        await User.findByIdAndUpdate(
          userId,
          { $inc: { walletBalance: -walletUsed } },
          { session }
        );

        // Log wallet portion
        await PaymentLog.create([{
          user: userId,
          amount: walletUsed,
          reference: `${reference}-WALLET`,
          status: 'success',
          type: 'cart_hybrid_payment',
          method: 'wallet',
          gatewayResponse: 'Hybrid payment - wallet portion',
          paidAt: new Date(),
        }], { session });
      }

      // Create orders (similar to handleCartPaymentSuccess)
      await handleCartPaymentSuccess(metadata, reference, totalAmount);

      await session.commitTransaction();
      console.log(`✅ Hybrid payment completed: wallet ${walletUsed}, card ${cardAmount}`);

    } catch (transactionError) {
      await session.abortTransaction();
      throw transactionError;
    } finally {
      session.endSession();
    }

  } catch (err) {
    console.error('❌ Hybrid payment success handling error:', err);
    throw err;
  }
}

// Helper function to handle successful advertisement payment
async function handleAdvertisementPaymentSuccess(metadata, reference, paidAmount) {
  try {
    const userId = metadata.user_id;
    const advertisementId = metadata.advertisement_id;

    console.log('🎯 Processing advertisement payment success:', {
      userId,
      advertisementId,
      paidAmount
    });

    // Find and activate the advertisement
    const Advertisement = require('@/models/Advertisement');
    const advertisement = await Advertisement.findById(advertisementId);
    
    if (!advertisement) {
      throw new Error('Advertisement not found');
    }

    if (advertisement.userId.toString() !== userId) {
      throw new Error('Advertisement does not belong to this user');
    }

    // Activate the advertisement
    advertisement.status = 'active';
    advertisement.paymentStatus = 'completed';
    advertisement.paidAt = new Date();
    advertisement.paymentMethod = 'paystack';
    advertisement.paymentReference = reference;
    await advertisement.save();

    console.log(`✅ Advertisement activated after payment: ${advertisement._id}`);

  } catch (err) {
    console.error('❌ Advertisement payment success handling error:', err);
    throw err;
  }
}


// ✅ ADD: GET /api/pay/billing-history
router.get('/billing-history', verifyJwtToken, async (req, res) => {
  try {
    const userId = req.user?._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    console.log('🔍 Fetching billing history for user:', userId, 'page:', page);

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Collect billing data from different sources
    const billingHistory = [];

    // 1. Get wallet transactions (if you have a Transaction model)
    try {
      // Uncomment if you have a Transaction model
      /*
      const transactions = await Transaction.find({ 
        user: userId,
        type: { $in: ['wallet_topup', 'payment', 'withdrawal'] }
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

      const transactionHistory = transactions.map(tx => ({
        _id: tx._id,
        type: tx.type,
        amount: tx.amount,
        status: tx.status,
        date: tx.createdAt,
        reference: tx.reference
      }));

      billingHistory.push(...transactionHistory);
      */
    } catch (error) {
      console.log('No Transaction model or error fetching transactions');
    }

    // 2. Get orders/purchases
    try {
      const Order = require('@/models/Order'); // Adjust path as needed
      const orders = await Order.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      const orderHistory = orders.map(order => ({
        _id: order._id,
        type: 'purchase',
        amount: order.totalAmount,
        status: order.status === 'completed' ? 'paid' : order.status,
        date: order.createdAt,
        reference: order.reference || order._id
      }));

      billingHistory.push(...orderHistory);
    } catch (error) {
      console.log('No Order model or error fetching orders');
    }

    // 3. Add any pro upgrade records (if you track them)
    try {
      const User = require('@/models/User'); // Adjust path as needed
      const user = await User.findById(userId);
      
      if (user?.proUpgradeHistory) {
        const proHistory = user.proUpgradeHistory.map(upgrade => ({
          _id: upgrade._id || new Date(upgrade.date).getTime(),
          type: 'pro_upgrade',
          amount: upgrade.amount || 0,
          status: 'paid',
          date: upgrade.date,
          reference: upgrade.reference
        }));

        billingHistory.push(...proHistory);
      }
    } catch (error) {
      console.log('No pro upgrade history found');
    }

    // Sort by date (newest first) and paginate
    billingHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const paginatedHistory = billingHistory.slice(0, limit);

    console.log('✅ Found', paginatedHistory.length, 'billing records');

    res.json({
      history: paginatedHistory,
      page,
      hasMore: paginatedHistory.length === limit,
      total: billingHistory.length
    });

  } catch (error: any) {
    console.error('❌ Billing history error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch billing history',
      error: error.message 
    });
  }
});
// ================================
// 📺 ADVERTISEMENT PAYMENT ROUTES
// ================================

// POST /api/pay/advertisement-pay - Initialize advertisement payment
router.post('/advertisement-pay', verifyJwtToken, ensureMongoUserExists, async (req, res) => {
  try {
    const { advertisementId } = req.body;
    const userId = req.user?._id;

    console.log('📺 Advertisement payment initialization:', {
      advertisementId,
      userId
    });

    // Validate required fields
    if (!advertisementId) {
      return res.status(400).json({ message: 'Advertisement ID is required' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Find the advertisement
    const Advertisement = require('@/models/Advertisement');
    const advertisement = await Advertisement.findById(advertisementId);
    
    if (!advertisement) {
      return res.status(404).json({ message: 'Advertisement not found' });
    }

    // Verify advertisement belongs to user
    if (advertisement.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You can only pay for your own advertisements' });
    }

    // Check if advertisement is pending payment
    if (advertisement.status !== 'pending') {
      return res.status(400).json({ 
        message: `Advertisement is not pending payment. Current status: ${advertisement.status}` 
      });
    }

    if (!advertisement.paymentAmount || advertisement.paymentAmount <= 0) {
      return res.status(400).json({ message: 'Invalid payment amount' });
    }

    // Initialize Paystack payment with advertisement data in metadata
    const response = await paystackApi.post('/transaction/initialize', {
      email: user.email,
      amount: advertisement.paymentAmount * 100, // Convert to kobo
      metadata: {
        purpose: 'advertisement_payment',
        user_id: user._id.toString(),
        advertisement_id: advertisementId,
        advertisement_title: advertisement.title,
        duration_days: Math.ceil((advertisement.endDate - advertisement.startDate) / (1000 * 60 * 60 * 24))
      }
    });

    const data = response.data?.data;

    // Log payment initialization
    await PaymentLog.create({
      user: userId,
      amount: advertisement.paymentAmount,
      reference: data.reference,
      status: 'pending',
      type: 'advertisement_payment',
      method: 'paystack',
      gatewayResponse: 'Advertisement payment initialized',
    });

    return res.status(200).json({
      message: 'Advertisement payment initialized - complete payment to activate advertisement',
      authorization_url: data.authorization_url,
      access_code: data.access_code,
      reference: data.reference,
      advertisement: {
        id: advertisement._id,
        title: advertisement.title,
        duration: Math.ceil((advertisement.endDate - advertisement.startDate) / (1000 * 60 * 60 * 24)),
        amount: advertisement.paymentAmount
      }
    });

  } catch (err) {
    console.error('❌ Advertisement payment initialization error:', err);
    return res.status(500).json({ 
      message: 'Advertisement payment initialization failed',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// POST /api/pay/wallet/advertisement-pay - Wallet payment for advertisement
router.post('/wallet/advertisement-pay', verifyJwtToken, ensureMongoUserExists, async (req, res) => {
  try {
    const { advertisementId } = req.body;
    const userId = req.user?._id;

    console.log('💰 Wallet advertisement payment request:', {
      advertisementId,
      userId
    });

    // Validate inputs
    if (!advertisementId) {
      return res.status(400).json({ message: 'Advertisement ID is required' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Find the advertisement
    const Advertisement = require('@/models/Advertisement');
    const advertisement = await Advertisement.findById(advertisementId);
    
    if (!advertisement) {
      return res.status(404).json({ message: 'Advertisement not found' });
    }

    // Verify advertisement belongs to user
    if (advertisement.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You can only pay for your own advertisements' });
    }

    // Check if advertisement is pending payment
    if (advertisement.status !== 'pending') {
      return res.status(400).json({ 
        message: `Advertisement is not pending payment. Current status: ${advertisement.status}` 
      });
    }

    const paymentAmount = advertisement.paymentAmount;

    // Check wallet balance
    if (user.walletBalance < paymentAmount) {
      return res.status(400).json({ 
        message: 'Insufficient wallet balance',
        required: paymentAmount,
        available: user.walletBalance,
        shortfall: paymentAmount - user.walletBalance
      });
    }

    // Start transaction to ensure atomicity
    const session = await User.startSession();
    session.startTransaction();

    try {
      // Deduct from wallet
      await User.findByIdAndUpdate(
        userId, 
        { $inc: { walletBalance: -paymentAmount } },
        { session }
      );

      // Activate advertisement
      advertisement.status = 'active';
      advertisement.paymentStatus = 'completed';
      advertisement.paidAt = new Date();
      advertisement.paymentMethod = 'wallet';
      await advertisement.save({ session });

      const reference = `WALLET-AD-${Date.now()}`;
      
      // Log successful wallet payment
      await PaymentLog.create([{
        user: userId,
        amount: paymentAmount,
        reference: reference,
        status: 'success',
        type: 'advertisement_payment',
        method: 'wallet',
        gatewayResponse: 'Wallet advertisement payment successful',
        paidAt: new Date(),
      }], { session });

      await session.commitTransaction();

      const updatedUser = await User.findById(userId);

      console.log(`✅ Advertisement payment successful via wallet: ${advertisement._id}`);

      return res.status(200).json({
        message: 'Advertisement payment successful via wallet',
        reference: reference,
        advertisement: {
          id: advertisement._id,
          status: advertisement.status,
          paidAt: advertisement.paidAt
        },
        new_wallet_balance: updatedUser.walletBalance
      });

    } catch (transactionError) {
      await session.abortTransaction();
      throw transactionError;
    } finally {
      session.endSession();
    }

  } catch (err) {
    console.error('❌ Wallet advertisement payment error:', err);
    return res.status(500).json({ 
      message: 'Wallet advertisement payment failed',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

export default router;