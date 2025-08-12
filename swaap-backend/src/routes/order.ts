import express from 'express';
import Order from '../models/Order';
import { verifyJwtToken } from '../middlewares/verifyJwtToken';
import { shippingService } from '../services/ShippingService';

const router = express.Router();

// ✅ NEW: POST /orders/:orderId/confirm-receipt - Buyer confirms receipt
router.post('/:orderId/confirm-receipt', verifyJwtToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?._id;

    console.log('🔍 Confirming receipt for order:', orderId, 'by user:', userId);

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user is the buyer
    if (order.buyer.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only the buyer can confirm receipt' });
    }

    // Check if order is delivered
    if (order.status !== 'delivered') {
      return res.status(400).json({ message: 'Order must be delivered before confirming receipt' });
    }

    // Update order with buyer confirmation
    order.buyerConfirmedReceipt = true;
    
    // If basic verification, release escrow immediately
    if (order.verificationLevel === 'basic') {
      order.escrowReleased = true;
      order.status = 'completed';
      order.completedAt = new Date();
    }
    
    await order.save();

    console.log('✅ Receipt confirmed for order:', orderId);
    res.status(200).json({ 
      message: 'Receipt confirmed successfully',
      order,
      escrowReleased: order.escrowReleased 
    });
  } catch (error) {
    console.error('❌ Confirm receipt error:', error);
    res.status(500).json({ message: 'Failed to confirm receipt' });
  }
});

// ✅ NEW: POST /orders/:orderId/confirm-quality - Buyer confirms product is in good condition (releases escrow immediately)
router.post('/:orderId/confirm-quality', verifyJwtToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?._id;
    const { qualityRating, qualityNotes } = req.body; // Optional quality feedback

    console.log('🔍 Confirming product quality for order:', orderId, 'by user:', userId);

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user is the buyer
    if (order.buyer.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only the buyer can confirm product quality' });
    }

    // Check if order is delivered
    if (order.status !== 'delivered') {
      return res.status(400).json({ message: 'Order must be delivered before confirming quality' });
    }

    // Check if escrow is already released
    if (order.escrowReleased) {
      return res.status(400).json({ message: 'Escrow already released' });
    }

    // Update order with buyer confirmation and quality check
    order.buyerConfirmedReceipt = true;
    order.escrowReleased = true;
    order.status = 'completed';
    order.completedAt = new Date();
    
    // Add quality confirmation data (you might want to add these fields to the Order model)
    if (qualityRating) {
      // Store quality rating if provided (1-5 stars)
      order.qualityRating = qualityRating;
    }
    if (qualityNotes) {
      // Store quality notes if provided
      order.qualityNotes = qualityNotes;
    }
    
    await order.save();

    console.log('✅ Product quality confirmed and escrow released for order:', orderId);
    res.status(200).json({ 
      message: 'Product quality confirmed and escrow released successfully',
      order,
      escrowReleased: true,
      message_details: 'Thank you for confirming the product quality. Payment has been released to the seller.'
    });
  } catch (error) {
    console.error('❌ Confirm quality error:', error);
    res.status(500).json({ message: 'Failed to confirm product quality' });
  }
});

// ✅ NEW: POST /orders/:orderId/release-escrow - System releases escrow after inspection period
router.post('/:orderId/release-escrow', verifyJwtToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?._id;

    console.log('🔍 Releasing escrow for order:', orderId);

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user is buyer or seller (both should be able to trigger this)
    if (order.buyer.toString() !== userId.toString() && order.seller.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only buyer or seller can trigger escrow release' });
    }

    // Check if escrow is already released
    if (order.escrowReleased) {
      return res.status(400).json({ message: 'Escrow already released' });
    }

    // For premium verification, check inspection period
    if (order.verificationLevel === 'premium') {
      if (!order.inspectionPeriodEnd || new Date() < order.inspectionPeriodEnd) {
        return res.status(400).json({ 
          message: 'Inspection period not yet ended',
          inspectionPeriodEnd: order.inspectionPeriodEnd
        });
      }
    }

    // For basic verification, buyer must have confirmed receipt
    if (order.verificationLevel === 'basic' && !order.buyerConfirmedReceipt) {
      return res.status(400).json({ message: 'Buyer must confirm receipt first' });
    }

    // Release escrow
    order.escrowReleased = true;
    order.status = 'completed';
    order.completedAt = new Date();
    await order.save();

    console.log('✅ Escrow released for order:', orderId);
    res.status(200).json({ 
      message: 'Escrow released successfully',
      order 
    });
  } catch (error) {
    console.error('❌ Release escrow error:', error);
    res.status(500).json({ message: 'Failed to release escrow' });
  }
});

// ✅ NEW: GET /orders/:orderId/escrow-status - Check escrow status
router.get('/:orderId/escrow-status', verifyJwtToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?._id;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user is buyer or seller
    if (order.buyer.toString() !== userId.toString() && order.seller.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const now = new Date();
    const inspectionPeriodEnded = order.inspectionPeriodEnd ? now >= order.inspectionPeriodEnd : false;
    const canReleaseEscrow = order.verificationLevel === 'basic' 
      ? order.buyerConfirmedReceipt
      : inspectionPeriodEnded;
    
    // Check if buyer can confirm product quality (for immediate escrow release)
    const canConfirmQuality = !order.escrowReleased && 
                             order.status === 'delivered' && 
                             order.buyer.toString() === userId.toString();

    res.status(200).json({
      orderId: order._id,
      verificationLevel: order.verificationLevel,
      escrowReleased: order.escrowReleased,
      buyerConfirmedReceipt: order.buyerConfirmedReceipt,
      inspectionPeriodEnd: order.inspectionPeriodEnd,
      inspectionPeriodEnded,
      canReleaseEscrow,
      canConfirmQuality,
      hoursRemaining: order.inspectionPeriodEnd 
        ? Math.max(0, Math.ceil((order.inspectionPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60)))
        : null,
      qualityRating: order.qualityRating || null,
      qualityNotes: order.qualityNotes || null,
      actions: {
        confirmQuality: canConfirmQuality,
        waitForInspectionPeriod: !canConfirmQuality && !inspectionPeriodEnded && order.verificationLevel === 'premium'
      }
    });
  } catch (error) {
    console.error('❌ Get escrow status error:', error);
    res.status(500).json({ message: 'Failed to get escrow status' });
  }
});

// ✅ NEW: POST /orders/process-expired-escrows - Process expired inspection periods (can be called by cron)
router.post('/process-expired-escrows', async (req, res) => {
  try {
    console.log('🔍 Processing expired escrow inspection periods...');
    
    const now = new Date();
    
    // Find orders where inspection period has ended but escrow hasn't been released
    const expiredOrders = await Order.find({
      verificationLevel: 'premium',
      escrowReleased: false,
      inspectionPeriodEnd: { $lte: now },
      status: 'delivered'
    });

    console.log('🔍 Found', expiredOrders.length, 'expired escrow periods');

    let processedCount = 0;
    for (const order of expiredOrders) {
      try {
        order.escrowReleased = true;
        order.status = 'completed';
        order.completedAt = new Date();
        await order.save();
        processedCount++;
        
        console.log('✅ Auto-released escrow for order:', order._id);
      } catch (error) {
        console.error('❌ Failed to release escrow for order:', order._id, error);
      }
    }

    res.status(200).json({
      message: 'Processed expired escrow periods',
      totalFound: expiredOrders.length,
      processed: processedCount
    });
  } catch (error) {
    console.error('❌ Process expired escrows error:', error);
    res.status(500).json({ message: 'Failed to process expired escrows' });
  }
});

// ✅ NEW: GET /orders - Get all orders for the authenticated user
router.get('/', verifyJwtToken, async (req, res) => {
  try {
    console.log('🔍 Fetching orders for user:', req.user?._id);
    
    const userId = req.user?._id;
    
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Find all orders for this user
    const orders = await Order.find({ user: userId })
      .populate('product', 'title images price') // Populate product details
      .populate('user', 'fullName email') // Populate user details
      .sort({ createdAt: -1 }); // Sort by newest first

    console.log('✅ Found', orders.length, 'orders for user');

    res.status(200).json({ 
      orders,
      count: orders.length 
    });
  } catch (err) {
    console.error('❌ Orders GET error:', err);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

// ✅ ALTERNATIVE: GET /orders/my - Alternative endpoint for user orders
router.get('/my', verifyJwtToken, async (req, res) => {
  try {
    console.log('🔍 Fetching MY orders for user:', req.user?._id);
    
    const userId = req.user?._id;
    
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const orders = await Order.find({ user: userId })
      .populate('product', 'title images price')
      .populate('user', 'fullName email')
      .sort({ createdAt: -1 });

    console.log('✅ Found', orders.length, 'orders for user');

    res.status(200).json({ 
      orders,
      count: orders.length 
    });
  } catch (err) {
    console.error('❌ My Orders GET error:', err);
    res.status(500).json({ message: 'Failed to fetch user orders' });
  }
});

// ✅ NEW: GET /orders/by-reference/:reference - Get orders by payment reference
router.get('/by-reference/:reference', verifyJwtToken, async (req, res) => {
  try {
    const reference = req.params.reference;
    const userId = req.user?._id;

    console.log('🔍 Fetching orders by reference:', reference, 'for user:', userId);

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Find all orders with this reference for this user
    const orders = await Order.find({ 
      reference: reference,
      user: userId 
    })
      .populate('product', 'title images price')
      .populate('user', 'fullName email')
      .sort({ createdAt: -1 });

    console.log('✅ Found', orders.length, 'orders for reference:', reference);

    res.status(200).json({ 
      orders,
      count: orders.length,
      reference 
    });
  } catch (err) {
    console.error('❌ Orders by reference GET error:', err);
    res.status(500).json({ message: 'Failed to fetch orders by reference' });
  }
});


// ✅ OPTIONAL: POST /orders - Create a new order (if needed)
router.post('/', verifyJwtToken, async (req, res) => {
  try {
    const { product, quantity, totalAmount, paymentMethod, reference } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    console.log('🔍 Creating new order for user:', userId);

    const newOrder = new Order({
      user: userId,
      product,
      quantity: quantity || 1,
      totalAmount,
      paymentMethod: paymentMethod || 'card',
      reference,
      status: 'pending'
    });

    const savedOrder = await newOrder.save();
    
    // Populate the order before returning
    const populatedOrder = await Order.findById(savedOrder._id)
      .populate('product', 'title images price')
      .populate('user', 'fullName email');

    console.log('✅ Order created:', savedOrder._id);

    res.status(201).json({ 
      order: populatedOrder,
      message: 'Order created successfully'
    });
  } catch (err) {
    console.error('❌ Order POST error:', err);
    res.status(500).json({ message: 'Failed to create order' });
  }
});

// ✅ TEST: GET /orders/test-tracking - Create a test order for tracking demo
router.get('/test-tracking', verifyJwtToken, async (req, res) => {
  try {
    console.log('🧪 Creating test tracking order for user:', req.user?._id);
    
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Create a mock order for testing tracking
    const testOrder = {
      id: 'test-order-' + Date.now(),
      reference: 'TEST-REF-' + Date.now(),
      status: 'shipped',
      totalAmount: 15000,
      product: {
        title: 'Test Product for Tracking Demo',
        images: ['https://via.placeholder.com/150'],
        price: 15000
      },
      trackingCode: 'TRK-TEST-' + Date.now(),
      trackingUrl: 'https://track.shipbubble.com/TRK-TEST-' + Date.now(),
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      paidAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      shippingTimeline: { picked_up: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) }, // 1 day ago
      deliveredAt: null,
      verificationLevel: 'verified',
      shippingMethod: 'Express Delivery'
    };

    // Generate test tracking steps
    const trackingSteps = [
      {
        id: 'confirmed',
        title: 'Order Confirmed',
        description: 'Your order has been confirmed and payment received',
        timestamp: testOrder.paidAt.toISOString(),
        completed: true,
        current: false,
      },
      {
        id: 'processing',
        title: 'Processing',
        description: 'Your order is being prepared for shipment',
        timestamp: testOrder.paidAt.toISOString(),
        completed: true,
        current: false,
      },
      {
        id: 'shipped',
        title: 'Shipped',
        description: 'Your order has been shipped and is on the way',
        timestamp: testOrder.shippingTimeline?.picked_up?.toISOString(),
        completed: true,
        current: true,
      },
      {
        id: 'out_for_delivery',
        title: 'Out for Delivery',
        description: 'Your order is out for delivery',
        timestamp: null,
        completed: false,
        current: false,
      },
      {
        id: 'delivered',
        title: 'Delivered',
        description: 'Your order has been delivered successfully',
        timestamp: null,
        completed: false,
        current: false,
      },
    ];

    res.status(200).json({
      order: testOrder,
      tracking: {
        steps: trackingSteps,
        shipbubbleData: {
          status: 'in_transit',
          events: [
            {
              status: 'confirmed',
              message: 'Order confirmed and processing',
              datetime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              location: 'Lagos Warehouse'
            },
            {
              status: 'picked_up', 
              message: 'Package picked up by courier',
              datetime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
              location: 'Lagos Dispatch Center'
            },
            {
              status: 'in_transit',
              message: 'Package in transit to destination',
              datetime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
              location: 'En route to Abuja'
            }
          ],
          current_location: 'En route to Abuja',
          estimated_delivery: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
          courier_contact: { 
            name: 'Test Courier Service', 
            phone: '+234800000000' 
          }
        }
      }
    });
  } catch (err) {
    console.error('❌ Test tracking error:', err);
    res.status(500).json({ message: 'Failed to create test tracking order' });
  }
});

// ✅ NEW: GET /orders/:orderId/tracking - Get tracking information for a specific order
router.get('/:orderId/tracking', verifyJwtToken, async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const userId = req.user?._id;

    console.log('📦 Fetching tracking info for order:', orderId);

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Check if this is a test request
    if (orderId === 'test' || orderId === 'test-tracking') {
      console.log('🧪 Test tracking request detected, redirecting to test endpoint');
      // Forward to test endpoint logic
      const testOrder = {
        id: 'test-order-' + Date.now(),
        reference: 'TEST-REF-' + Date.now(),
        status: 'shipped',
        totalAmount: 15000,
        product: {
          title: 'Test Product for Tracking Demo',
          images: ['https://via.placeholder.com/150'],
          price: 15000
        },
        trackingCode: 'TRK-TEST-' + Date.now(),
        trackingUrl: 'https://track.shipbubble.com/TRK-TEST-' + Date.now(),
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        paidAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        shippingTimeline: { picked_up: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) }, // 1 day ago
        deliveredAt: null,
        verificationLevel: 'verified',
        shippingMethod: 'Express Delivery'
      };

      const trackingSteps = [
        {
          id: 'confirmed',
          title: 'Order Confirmed',
          description: 'Your order has been confirmed and payment received',
          timestamp: testOrder.paidAt.toISOString(),
          completed: true,
          current: false,
        },
        {
          id: 'processing',
          title: 'Processing',
          description: 'Your order is being prepared for shipment',
          timestamp: testOrder.paidAt.toISOString(),
          completed: true,
          current: false,
        },
        {
          id: 'shipped',
          title: 'Shipped',
          description: 'Your order has been shipped and is on the way',
          timestamp: testOrder.shippingTimeline?.picked_up?.toISOString(),
          completed: true,
          current: true,
        },
        {
          id: 'out_for_delivery',
          title: 'Out for Delivery',
          description: 'Your order is out for delivery',
          timestamp: null,
          completed: false,
          current: false,
        },
        {
          id: 'delivered',
          title: 'Delivered',
          description: 'Your order has been delivered successfully',
          timestamp: null,
          completed: false,
          current: false,
        },
      ];

      return res.status(200).json({
        order: testOrder,
        tracking: {
          steps: trackingSteps,
          shipbubbleData: {
            status: 'in_transit',
            events: [
              {
                status: 'confirmed',
                message: 'Order confirmed and processing',
                datetime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                location: 'Lagos Warehouse'
              },
              {
                status: 'picked_up', 
                message: 'Package picked up by courier',
                datetime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                location: 'Lagos Dispatch Center'
              },
              {
                status: 'in_transit',
                message: 'Package in transit to destination',
                datetime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
                location: 'En route to Abuja'
              }
            ],
            current_location: 'En route to Abuja',
            estimated_delivery: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
            courier_contact: { 
              name: 'Test Courier Service', 
              phone: '+234800000000' 
            }
          }
        }
      });
    }

    // Find the order and verify ownership
    const order = await Order.findOne({ 
      _id: orderId, 
      user: userId 
    }).populate('product', 'title images price');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    console.log('🔍 Order found:', {
      id: order._id,
      status: order.status,
      trackingCode: order.trackingCode,
      shipbubbleOrderId: order.shipbubbleOrderId
    });

    // Get tracking information from Shipbubble if available
    let trackingInfo = null;
    if (order.shipbubbleOrderId) {
      try {
        trackingInfo = await shippingService.getDetailedTracking(order.shipbubbleOrderId);
        console.log('📦 Shipbubble tracking info:', trackingInfo);
      } catch (trackingError) {
        console.warn('⚠️ Failed to get Shipbubble tracking:', trackingError.message);
        // Continue with order data even if tracking fails
      }
    }

    // Create tracking timeline based on order status and Shipbubble data
    const trackingSteps = generateTrackingSteps(order, trackingInfo);

    res.status(200).json({
      order: {
        id: order._id,
        reference: order.reference,
        status: order.status,
        totalAmount: order.totalAmount,
        product: order.product,
        trackingCode: order.trackingCode,
        trackingUrl: order.trackingUrl,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
        shippingTimeline: order.shippingTimeline,
        deliveredAt: order.deliveredAt,
        verificationLevel: order.verificationLevel,
        shippingMethod: order.shippingMethod
      },
      tracking: {
        steps: trackingSteps,
        shipbubbleData: trackingInfo
      }
    });
  } catch (err) {
    console.error('❌ Order tracking error:', err);
    res.status(500).json({ message: 'Failed to fetch tracking information' });
  }
});

// Helper function to generate tracking steps based on order status
function generateTrackingSteps(order: any, shipbubbleData: any) {
  const steps = [
    {
      id: 'confirmed',
      title: 'Order Confirmed',
      description: 'Your order has been confirmed and payment received',
      timestamp: order.paidAt || order.createdAt,
      completed: true,
      current: false,
    },
    {
      id: 'processing',
      title: 'Processing',
      description: 'Your order is being prepared for shipment',
      timestamp: order.status === 'paid' ? order.paidAt : null,
      completed: ['paid', 'processing', 'shipped', 'delivered'].includes(order.status),
      current: order.status === 'processing',
    },
    {
      id: 'shipped',
      title: 'Shipped',
      description: 'Your order has been shipped and is on the way',
      timestamp: order.shippingTimeline?.picked_up,
      completed: ['shipped', 'delivered'].includes(order.status),
      current: order.status === 'shipped',
    },
    {
      id: 'out_for_delivery',
      title: 'Out for Delivery',
      description: 'Your order is out for delivery',
      timestamp: null, // This would come from Shipbubble
      completed: order.status === 'delivered',
      current: false, // This would be determined by Shipbubble status
    },
    {
      id: 'delivered',
      title: 'Delivered',
      description: 'Your order has been delivered successfully',
      timestamp: order.deliveredAt,
      completed: order.status === 'delivered',
      current: order.status === 'delivered',
    },
  ];

  // Update steps based on Shipbubble data if available
  if (shipbubbleData && shipbubbleData.events) {
    // Process Shipbubble events to update tracking steps
    shipbubbleData.events.forEach((event: any) => {
      const eventStatus = event.status?.toLowerCase();
      if (eventStatus === 'out_for_delivery') {
        const outForDeliveryStep = steps.find(s => s.id === 'out_for_delivery');
        if (outForDeliveryStep) {
          outForDeliveryStep.completed = true;
          outForDeliveryStep.current = !order.deliveredAt;
          outForDeliveryStep.timestamp = event.timestamp;
        }
      }
    });
  }

  return steps;
}

// ✅ MOVED: Generic GET /orders/:id route - MUST be last to avoid conflicts with specific routes
router.get('/:id', verifyJwtToken, async (req, res) => {
  try {
    const orderId = req.params.id;

    console.log('🔍 Fetching order by ID:', orderId);

    const order = await Order.findById(orderId)
      .populate('product')
      .populate('user', 'fullName email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Ensure the user owns this order (unless admin)
    if (
      order.user._id.toString() !== req.user?._id &&
      req.user?.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    console.log('✅ Order found:', order._id);

    res.status(200).json({ order });
  } catch (err) {
    console.error('❌ Order GET error:', err);
    res.status(500).json({ message: 'Failed to fetch order' });
  }
});

export default router;