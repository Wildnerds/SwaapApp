// routes/shipbubbleWebhook.ts
import express from 'express';
import crypto, { createHmac } from 'crypto';
import getRawBody from 'raw-body';
import Order from '../models/Order';
import User from '../models/User';
import ShippingLog from '../models/ShippingLog';

const router = express.Router();

// ShipBubble Webhook Route
router.post('/shipbubble', async (req, res) => {
  try {
    // ShipBubble doesn't provide webhook signature verification
    // So we'll process the webhook directly (ensure your webhook URL is secure)
    console.log(`📦 ShipBubble webhook received:`, req.body);
    
    const webhookData = req.body;

    // Handle different shipping events
    await handleShippingUpdate(webhookData);

    return res.sendStatus(200);
  } catch (err: any) {
    console.error('❌ ShipBubble webhook error:', err);
    return res.status(500).json({ message: 'Internal error' });
  }
});

// ✅ HANDLE SHIPPING STATUS UPDATES FOR THREE-TIER SYSTEM
async function handleShippingUpdate(data: any) {
  try {
    const {
      order_id,
      status,
      courier,
      tracking_code,
      tracking_url,
      package_status,
      events,
      payment
    } = data;

    console.log(`🚚 Shipping update: ${order_id} - ${status}`);

    // Find the order in your database
    const order = await Order.findOne({ shipbubbleOrderId: order_id });
    
    if (!order) {
      console.warn(`⚠️ Order not found for ShipBubble ID: ${order_id}`);
      return;
    }

    // Only process ShipBubble webhooks for orders that use ShipBubble delivery
    if (order.shippingMethod !== 'shipbubble') {
      console.warn(`⚠️ Webhook received for non-ShipBubble order: ${order._id}`);
      return;
    }

    // Update order with shipping information
    order.shippingStatus = status;
    order.trackingCode = tracking_code;
    order.trackingUrl = tracking_url;
    order.courierName = courier?.name;
    order.courierPhone = courier?.phone;
    order.lastShippingUpdate = new Date();

    // Handle different shipping statuses based on verification level
    switch (status.toLowerCase()) {
      case 'pending':
        order.shippingStatus = 'pending';
        console.log(`📋 Order ${order._id} shipping is pending`);
        break;

      case 'picked_up':
      case 'in_transit':
        order.shippingStatus = 'in_transit';
        order.status = 'shipped'; // Update overall order status
        console.log(`🚛 Order ${order._id} is in transit`);
        break;

      case 'delivered':
        order.shippingStatus = 'delivered';
        order.deliveredAt = new Date();
        order.status = 'delivered';
        
        // Handle escrow based on verification level
        await handleDeliveryByVerificationLevel(order);
        
        console.log(`✅ Order ${order._id} delivered successfully`);
        break;

      case 'failed':
      case 'cancelled':
        order.shippingStatus = 'failed';
        console.log(`❌ Order ${order._id} shipping failed`);
        
        // For failed deliveries, handle based on verification level
        await handleFailedDelivery(order);
        break;

      case 'returned':
        order.shippingStatus = 'returned';
        console.log(`🔄 Order ${order._id} was returned`);
        await handleReturnedDelivery(order);
        break;

      default:
        console.log(`ℹ️ Unknown shipping status: ${status} for order ${order._id}`);
    }

    await order.save();

    // Create shipping log for tracking history
    await ShippingLog.create({
      order: order._id,
      shipbubbleOrderId: order_id,
      status,
      trackingCode: tracking_code,
      courierName: courier?.name,
      courierPhone: courier?.phone,
      trackingUrl: tracking_url,
      shippingFee: payment?.shipping_fee ? payment.shipping_fee / 100 : null,
      events: events || [],
      timestamp: new Date(),
      rawData: data
    });

    // Send notifications to buyer and seller
    await sendShippingNotifications(order, status, tracking_code);

  } catch (error) {
    console.error('❌ Shipping Update Error:', error);
    throw error;
  }
}

// ✅ HANDLE DELIVERY BASED ON VERIFICATION LEVEL
async function handleDeliveryByVerificationLevel(order: any) {
  try {
    switch (order.verificationLevel) {
      case 'basic':
        // BASIC: Auto-release escrow immediately upon delivery
        await releaseEscrowAfterDelivery(order);
        console.log(`🚀 Basic Service: Auto-released escrow for order ${order._id}`);
        break;

      case 'premium':
        // PREMIUM: Start 48-hour inspection period
        const inspectionEnd = new Date();
        inspectionEnd.setHours(inspectionEnd.getHours() + 48);
        order.inspectionPeriodEnd = inspectionEnd;
        
        console.log(`🔍 Premium Service: Started 48hr inspection period for order ${order._id}`);
        await notifyBuyerInspectionPeriod(order);
        break;

      case 'self-arranged':
        // SELF-ARRANGED: This shouldn't happen via ShipBubble webhook
        console.warn(`⚠️ Self-arranged order ${order._id} received ShipBubble delivery update`);
        break;

      default:
        console.warn(`⚠️ Unknown verification level: ${order.verificationLevel} for order ${order._id}`);
    }
  } catch (error) {
    console.error('❌ Delivery Handling Error:', error);
  }
}

// ✅ RELEASE ESCROW AFTER DELIVERY (BASIC SERVICE)
async function releaseEscrowAfterDelivery(order: any) {
  try {
    if (order.escrowReleased) {
      console.log(`⚠️ Escrow already released for order ${order._id}`);
      return;
    }

    order.status = 'completed';
    order.escrowReleased = true;
    order.completedAt = new Date();
    
    // Credit seller's wallet
    const seller = await User.findById(order.seller);
    if (seller) {
      const sellerAmount = order.totalAmount - (order.serviceFee || 0);
      seller.walletBalance = (seller.walletBalance || 0) + sellerAmount;
      await seller.save();
      
      console.log(`💰 Escrow released: ₦${sellerAmount} to seller ${seller.email}`);
      
      // Log the escrow release
      await ShippingLog.create({
        order: order._id,
        status: 'escrow_released',
        timestamp: new Date(),
        notes: `Escrow released - ₦${sellerAmount} credited to seller wallet`
      });
    }
  } catch (error) {
    console.error('❌ Escrow Release Error:', error);
  }
}

// ✅ NOTIFY BUYER ABOUT INSPECTION PERIOD (PREMIUM SERVICE)
async function notifyBuyerInspectionPeriod(order: any) {
  try {
    const buyer = await User.findById(order.buyer);
    if (buyer) {
      console.log(`📧 Notifying buyer ${buyer.email} about 48hr inspection period for order ${order._id}`);
      
      // TODO: Implement actual notification system
      // - Email: "Your order has been delivered. You have 48 hours to inspect and confirm."
      // - In-app notification
      // - SMS reminder after 24 hours
      
      // Log the notification
      await ShippingLog.create({
        order: order._id,
        status: 'inspection_started',
        timestamp: new Date(),
        notes: `Buyer notified about 48hr inspection period ending at ${order.inspectionPeriodEnd}`
      });
    }
  } catch (error) {
    console.error('❌ Buyer Notification Error:', error);
  }
}

// ✅ HANDLE FAILED DELIVERY
async function handleFailedDelivery(order: any) {
  try {
    console.log(`🔄 Handling failed delivery for order ${order._id}`);
    
    // Different handling based on verification level
    switch (order.verificationLevel) {
      case 'basic':
        // Basic: Offer immediate refund or retry
        await handleBasicFailedDelivery(order);
        break;
        
      case 'premium':
        // Premium: More options due to higher service fee
        await handlePremiumFailedDelivery(order);
        break;
        
      default:
        console.log(`ℹ️ Standard failed delivery handling for ${order.verificationLevel}`);
    }
    
    // Log failed delivery
    await ShippingLog.create({
      order: order._id,
      status: 'delivery_failed',
      timestamp: new Date(),
      notes: 'Delivery failed - awaiting resolution'
    });
    
  } catch (error) {
    console.error('❌ Failed Delivery Handler Error:', error);
  }
}

// ✅ HANDLE RETURNED DELIVERY
async function handleReturnedDelivery(order: any) {
  try {
    console.log(`🔄 Handling returned delivery for order ${order._id}`);
    
    // For returned deliveries, typically refund the buyer
    if (!order.escrowReleased) {
      // Refund logic here
      console.log(`💸 Processing refund for returned order ${order._id}`);
      
      await ShippingLog.create({
        order: order._id,
        status: 'returned_refund_initiated',
        timestamp: new Date(),
        notes: 'Package returned - refund process initiated'
      });
    }
  } catch (error) {
    console.error('❌ Returned Delivery Handler Error:', error);
  }
}

// ✅ HANDLE BASIC SERVICE FAILED DELIVERY
async function handleBasicFailedDelivery(order: any) {
  // Notify both parties, offer retry or refund
  console.log(`📧 Basic Service: Notifying parties about failed delivery for order ${order._id}`);
  // TODO: Send notifications with options
}

// ✅ HANDLE PREMIUM SERVICE FAILED DELIVERY  
async function handlePremiumFailedDelivery(order: any) {
  // More comprehensive handling due to premium service
  console.log(`📧 Premium Service: Comprehensive failed delivery handling for order ${order._id}`);
  // TODO: Multiple retry attempts, alternative delivery options, etc.
}

// ✅ SEND SHIPPING NOTIFICATIONS
async function sendShippingNotifications(order: any, status: string, trackingCode: string) {
  try {
    const buyer = await User.findById(order.buyer);
    const seller = await User.findById(order.seller);
    
    console.log(`📧 Sending shipping notifications for ${order.verificationLevel} service:`);
    console.log(`   Buyer: ${buyer?.email} - Status: ${status}`);
    console.log(`   Seller: ${seller?.email} - Status: ${status}`);
    console.log(`   Tracking: ${trackingCode}`);
    
    // Different notification content based on verification level
    switch (order.verificationLevel) {
      case 'basic':
        if (status.toLowerCase() === 'delivered') {
          console.log(`📧 Basic Service: Notifying completion and automatic payment release`);
        }
        break;
        
      case 'premium':
        if (status.toLowerCase() === 'delivered') {
          console.log(`📧 Premium Service: Notifying 48hr inspection period started`);
        }
        break;
    }
    
    // TODO: Implement actual notification system
    // - Email notifications with different templates per service level
    // - In-app notifications
    // - SMS for critical updates
    
  } catch (error) {
    console.error('❌ Notification Error:', error);
  }
}

// ✅ API ENDPOINT FOR MANUAL BUYER CONFIRMATION (SELF-ARRANGED & PREMIUM)
router.post('/confirm-receipt/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { userId } = req.body; // Verify this is the buyer
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Verify user is the buyer
    if (order.buyer.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Only allow confirmation for self-arranged and premium orders
    if (!['self-arranged', 'premium'].includes(order.verificationLevel)) {
      return res.status(400).json({ error: 'Manual confirmation not required for this service level' });
    }
    
    // Confirm receipt and release escrow
    order.buyerConfirmedReceipt = true;
    await releaseEscrowAfterDelivery(order);
    
    console.log(`✅ Buyer confirmed receipt for ${order.verificationLevel} order ${order._id}`);
    
    res.json({ 
      message: 'Receipt confirmed and payment released',
      order: order._id,
      escrowReleased: order.escrowReleased
    });
    
  } catch (error) {
    console.error('❌ Manual Confirmation Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ WEBHOOK HEALTH CHECK
router.get('/health', (req, res) => {
  res.status(200).json({ 
    message: 'ShipBubble webhook endpoint is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

export default router;