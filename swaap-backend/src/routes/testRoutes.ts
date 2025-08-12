// routes/testRoutes.ts
import express from 'express';
import Order from '../models/Order';
import User from '../models/User';
import ShippingLog from '../models/ShippingLog';
import mongoose from 'mongoose';

const router = express.Router();

// ✅ TEST: Database Status Check
router.get('/db-status', async (req, res) => {
  try {
    console.log('MongoDB connection state:', mongoose.connection.readyState);
    console.log('Database name:', mongoose.connection.name);
    
    // Try to count existing orders
    const orderCount = await Order.countDocuments();
    console.log('Existing orders in database:', orderCount);
    
    // Try to find any user
    const userCount = await User.countDocuments();
    console.log('Existing users in database:', userCount);
    
    // Get recent orders
    const recentOrders = await Order.find({}, 'shipbubbleOrderId verificationLevel status createdAt')
      .sort({ createdAt: -1 })
      .limit(5);
    
    res.json({
      connectionState: mongoose.connection.readyState,
      dbName: mongoose.connection.name,
      orderCount,
      userCount,
      recentOrders
    });
  } catch (error) {
    console.error('DB Status Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ TEST: Create Test Order
router.post('/create-test-order', async (req, res) => {
  try {
    const { verificationLevel = 'basic', shippingMethod = 'shipbubble' } = req.body;
    
    // Find or create test users
    let testBuyer = await User.findOne({ email: 'testbuyer@example.com' });
    if (!testBuyer) {
      testBuyer = await User.create({
        fullName: 'Test Buyer',
        email: 'testbuyer@example.com',
        mobile: '08012345678',
        password: 'password123',
        walletBalance: 10000
      });
    }

    let testSeller = await User.findOne({ email: 'testseller@example.com' });
    if (!testSeller) {
      testSeller = await User.create({
        fullName: 'Test Seller',
        email: 'testseller@example.com',
        mobile: '08087654321',
        password: 'password123',
        walletBalance: 0
      });
    }

    // Create test order
    const testOrder = await Order.create({
      user: testBuyer._id,
      buyer: testBuyer._id,
      seller: testSeller._id,
      product: testBuyer._id, // Using user ID as dummy product ID
      quantity: 1,
      totalAmount: 5000,
      paymentMethod: 'wallet',
      walletPaid: 5000,
      paystackPaid: 0,
      status: 'paid',
      reference: `TEST-${Date.now()}`,
      paidAt: new Date(),
      
      // Three-tier system fields
      verificationLevel,
      shippingMethod,
      serviceFee: verificationLevel === 'self-arranged' ? 0 : 
                  verificationLevel === 'basic' ? 150 : 250,
      shippingFee: shippingMethod === 'shipbubble' ? 2000 : 0,
      
      // Mock ShipBubble order ID for webhook testing
      shipbubbleOrderId: shippingMethod === 'shipbubble' ? `SB-TEST-${Date.now()}` : undefined,
      
      // Shipping addresses (required for shipbubble)
      shipFromAddress: shippingMethod === 'shipbubble' ? {
        name: 'Test Seller',
        phone: '08087654321',
        email: 'testseller@example.com',
        address: '123 Seller Street',
        city: 'Lagos',
        state: 'Lagos'
      } : undefined,
      
      shipToAddress: shippingMethod === 'shipbubble' ? {
        name: 'Test Buyer',
        phone: '08012345678',
        email: 'testbuyer@example.com',
        address: '456 Buyer Avenue',
        city: 'Abuja',
        state: 'FCT'
      } : undefined,
      
      // Self-arranged details
      selfArrangedDetails: shippingMethod === 'self-arranged' ? {
        meetupLocation: 'Computer Village, Ikeja',
        meetupTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        deliveryInstructions: 'Call when you arrive',
        contactMethod: 'phone'
      } : undefined
    });

    console.log(`✅ Test order created: ${testOrder._id}`);
    console.log(`   Service Level: ${verificationLevel}`);
    console.log(`   Shipping Method: ${shippingMethod}`);
    console.log(`   ShipBubble ID: ${testOrder.shipbubbleOrderId || 'N/A'}`);

    res.json({
      message: 'Test order created successfully',
      order: {
        id: testOrder._id,
        verificationLevel: testOrder.verificationLevel,
        shippingMethod: testOrder.shippingMethod,
        shipbubbleOrderId: testOrder.shipbubbleOrderId,
        serviceFee: testOrder.serviceFee,
        shippingFee: testOrder.shippingFee
      }
    });

  } catch (error) {
    console.error('❌ Test Order Creation Error:', error);
    res.status(500).json({ error: 'Failed to create test order', details: error.message });
  }
});

// ✅ TEST: Simulate Webhook (Simplified)
router.post('/simulate-webhook', async (req, res) => {
  try {
    const { shipbubbleOrderId, status = 'delivered' } = req.body;
    
    if (!shipbubbleOrderId) {
      return res.status(400).json({ error: 'shipbubbleOrderId required' });
    }

    // Find the order first to verify it exists
    const order = await Order.findOne({ shipbubbleOrderId });
    if (!order) {
      console.log(`❌ No order found with shipbubbleOrderId: ${shipbubbleOrderId}`);
      
      // Let's check what orders exist
      const allOrders = await Order.find({}, 'shipbubbleOrderId _id').limit(5);
      console.log('Available orders:', allOrders);
      
      return res.status(404).json({ 
        error: 'Order not found',
        searchedFor: shipbubbleOrderId,
        availableOrders: allOrders
      });
    }

    console.log(`✅ Found order: ${order._id} with ShipBubble ID: ${order.shipbubbleOrderId}`);

    // Process webhook directly
    try {
      console.log(`📦 Processing webhook: ${status} for order ${shipbubbleOrderId}`);
      
      order.shippingStatus = status;
      order.trackingCode = `TR-${Date.now()}`;
      order.trackingUrl = `https://track.shipbubble.com/${shipbubbleOrderId}`;
      order.courierName = 'Test Courier';
      order.lastShippingUpdate = new Date();
      
      if (status.toLowerCase() === 'delivered') {
        order.deliveredAt = new Date();
        order.status = 'delivered';
        
        // Handle escrow based on verification level
        if (order.verificationLevel === 'basic') {
          order.escrowReleased = true;
          order.status = 'completed';
          order.completedAt = new Date();
          
          // Credit seller's wallet
          const seller = await User.findById(order.seller);
          if (seller) {
            const sellerAmount = order.totalAmount - (order.serviceFee || 0);
            seller.walletBalance = (seller.walletBalance || 0) + sellerAmount;
            await seller.save();
            console.log(`💰 Basic service: Auto-released ₦${sellerAmount} to seller`);
          }
        } else if (order.verificationLevel === 'premium') {
          const inspectionEnd = new Date();
          inspectionEnd.setHours(inspectionEnd.getHours() + 48);
          order.inspectionPeriodEnd = inspectionEnd;
          console.log(`🔍 Premium service: Started 48hr inspection period until ${inspectionEnd}`);
        }
      }
      
      await order.save();
      console.log('✅ Order updated successfully');
      
    } catch (webhookError) {
      console.error('❌ Webhook processing error:', webhookError);
      return res.status(500).json({ error: 'Webhook processing failed' });
    }

    res.json({
      message: `Webhook simulated: ${status}`,
      order: shipbubbleOrderId,
      success: true,
      updatedOrder: {
        id: order._id,
        status: order.status,
        shippingStatus: order.shippingStatus,
        escrowReleased: order.escrowReleased,
        deliveredAt: order.deliveredAt,
        inspectionPeriodEnd: order.inspectionPeriodEnd
      }
    });

  } catch (error) {
    console.error('❌ Webhook Simulation Error:', error);
    res.status(500).json({ error: 'Failed to simulate webhook' });
  }
});

// ✅ TEST: Get Order Status
router.get('/order-status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findById(orderId)
      .populate('buyer', 'fullName email')
      .populate('seller', 'fullName email walletBalance');
      
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      order: {
        id: order._id,
        status: order.status,
        verificationLevel: order.verificationLevel,
        shippingMethod: order.shippingMethod,
        shippingStatus: order.shippingStatus,
        escrowReleased: order.escrowReleased,
        buyerConfirmedReceipt: order.buyerConfirmedReceipt,
        deliveredAt: order.deliveredAt,
        completedAt: order.completedAt,
        inspectionPeriodEnd: order.inspectionPeriodEnd,
        trackingCode: order.trackingCode,
        trackingUrl: order.trackingUrl,
        seller: order.seller,
        buyer: order.buyer
      }
    });

  } catch (error) {
    console.error('❌ Order Status Error:', error);
    res.status(500).json({ error: 'Failed to get order status' });
  }
});

// ✅ TEST: Manual Confirmation (for self-arranged and premium)
router.post('/test-manual-confirmation/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Only allow confirmation for self-arranged and premium orders
    if (!['self-arranged', 'premium'].includes(order.verificationLevel)) {
      return res.status(400).json({ error: 'Manual confirmation not required for this service level' });
    }
    
    console.log(`👤 Testing manual confirmation for ${order.verificationLevel} order ${order._id}`);
    
    // Update order
    order.buyerConfirmedReceipt = true;
    
    if (!order.escrowReleased) {
      order.escrowReleased = true;
      order.status = 'completed';
      order.completedAt = new Date();
      
      // Credit seller's wallet
      const seller = await User.findById(order.seller);
      if (seller) {
        const sellerAmount = order.totalAmount - (order.serviceFee || 0);
        seller.walletBalance = (seller.walletBalance || 0) + sellerAmount;
        await seller.save();
        console.log(`💰 Manual confirmation: Released ₦${sellerAmount} to seller ${seller.email}`);
      }
    }
    
    await order.save();

    res.json({
      message: 'Manual confirmation completed successfully',
      order: {
        id: order._id,
        buyerConfirmedReceipt: order.buyerConfirmedReceipt,
        escrowReleased: order.escrowReleased,
        status: order.status,
        completedAt: order.completedAt
      }
    });

  } catch (error) {
    console.error('❌ Manual Confirmation Test Error:', error);
    res.status(500).json({ error: 'Failed to test manual confirmation' });
  }
});

export default router;