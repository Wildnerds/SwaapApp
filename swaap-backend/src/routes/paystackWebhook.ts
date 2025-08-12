// routes/paystackWebhook.ts
import express from 'express';
import crypto, { createHmac } from 'crypto';
import getRawBody from 'raw-body';
import User from '../models/User';
import PaymentLog from '../models/PaymentLog';
import { WalletTransaction } from '../models/WalletTransaction';
import Order from '../models/Order';
import Swap from '../models/Swap';
import { sendEmail } from '../utils/sendEmail';
import { sendInAppNotification } from '../utils/sendInAppNotification';

const router = express.Router();

// Paystack Webhook Route
router.post('/paystack', async (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY!;
    const rawBody = await getRawBody(req);
    const signature = req.headers['x-paystack-signature'];

    const hash = createHmac('sha512', secret).update(rawBody).digest('hex');
    if (hash !== signature) {
      console.warn('❌ Invalid Paystack signature');
      return res.status(401).json({ message: 'Invalid signature' });
    }

    const { event, data } = JSON.parse(rawBody.toString());
    console.log(`📥 Webhook received: ${event}`);

    // ✅ HANDLE VIRTUAL ACCOUNT CREDITS (NEW)
    if (event === 'dedicatedaccount.credit' && data.status === 'success') {
      await handleVirtualAccountCredit(data);
      return res.sendStatus(200);
    }

    // ✅ HANDLE TRANSFER EVENTS (WITHDRAWALS)
    if (event === 'transfer.success') {
      await handleTransferSuccess(data);
      return res.sendStatus(200);
    }

    if (event === 'transfer.failed' || event === 'transfer.reversed') {
      await handleTransferFailed(data);
      return res.sendStatus(200);
    }

    // ✅ HANDLE CHARGE SUCCESS (EXISTING + ENHANCED)
    if ((event === 'charge.success') && data.status === 'success') {
      const email = data.customer?.email;
      const reference = data.reference;
      const amount = data.amount / 100;

      const user = await User.findOne({ email });
      if (!user) {
        console.warn(`❌ User not found for email: ${email}`);
        return res.sendStatus(404);
      }

      // Avoid duplicate processing
      const alreadyExists = await PaymentLog.findOne({ reference });
      if (alreadyExists) {
        console.log(`⚠️ Payment ${reference} already handled`);
        return res.sendStatus(200);
      }

      const purpose =
        data.metadata?.purpose ??
        data.metadata?.custom_fields?.find((f: any) => f.variable_name === 'purpose')?.value ??
        'wallet_topup'; // fallback

      // Handle known purposes
      switch (purpose) {
        case 'wallet_topup':
        case 'wallet_funding':
          // Credit user wallet
          const previousBalance = user.walletBalance || 0;
          user.walletBalance = previousBalance + amount;
          await user.save();

          // Create wallet transaction record
          await WalletTransaction.create({
            user: user._id,
            reference,
            amount,
            status: 'success',
            type: 'fund',
            channel: 'card',
            currency: 'NGN',
            narration: 'Direct wallet funding via card payment',
            verified: true,
          });

          // Create payment log
          await PaymentLog.create({
            user: user._id,
            amount,
            reference,
            status: 'success',
            type: 'wallet_topup',
            method: 'paystack',
            gatewayResponse: data.gateway_response,
            paidAt: new Date(data.paid_at),
          });

          console.log(`✅ Wallet funded via card: ₦${amount} to ${email} (Balance: ₦${user.walletBalance})`);
          break;

        case 'pro_upgrade':
          user.plan = 'pro';
          user.proSince = new Date();
          await user.save();

          await PaymentLog.create({
            user: user._id,
            amount,
            reference,
            status: 'success',
            type: 'pro_upgrade',
            method: 'paystack',
            gatewayResponse: data.gateway_response,
            paidAt: new Date(data.paid_at),
          });

          console.log(`✅ Pro upgraded: ${email}`);
          break;

        case 'order_payment':
        case 'full_order_payment':
          // Handle order completion
          await handleOrderPayment(data, user);
          break;

        case 'hybrid_payment':
          // Handle hybrid payment completion (partial wallet + card)
          await handleHybridPayment(data, user);
          break;

        case 'cart_payment':
          // Handle cart payment completion
          await handleCartPayment(data, user);
          break;

        case 'cart_hybrid_payment':
          // Handle cart hybrid payment completion
          await handleCartHybridPayment(data, user);
          break;

        case 'swap_payment':
          // Handle swap payment completion
          await handleSwapPayment(data, user);
          break;

        default:
          console.warn(`⚠️ Unknown purpose '${purpose}', defaulting to wallet top-up`);
          const defaultPreviousBalance = user.walletBalance || 0;
          user.walletBalance = defaultPreviousBalance + amount;
          await user.save();

          await WalletTransaction.create({
            user: user._id,
            reference,
            amount,
            status: 'success',
            type: 'fund',
            channel: 'card',
            currency: 'NGN',
            narration: 'Wallet funding (unknown purpose)',
            verified: true,
          });

          await PaymentLog.create({
            user: user._id,
            amount,
            reference,
            status: 'success',
            type: 'wallet_topup',
            method: 'paystack',
            gatewayResponse: data.gateway_response,
            paidAt: new Date(data.paid_at),
          });

          console.log(`✅ Wallet funded (default): ₦${amount} to ${email}`);
          break;
      }
    } 
    
    // ✅ HANDLE CHARGE FAILED
    else if (event === 'charge.failed') {
      const email = data.customer?.email;
      const reference = data.reference;

      if (email) {
        const user = await User.findOne({ email });
        if (user) {
          await PaymentLog.create({
            user: user._id,
            amount: data.amount / 100,
            reference,
            status: 'failed',
            method: 'paystack',
            gatewayResponse: data.gateway_response,
            paidAt: new Date(),
          });

          // If this was a hybrid payment, we might need to refund the wallet portion
          const order = await Order.findOne({ reference });
          if (order && order.paymentMethod === 'hybrid' && order.walletPaid > 0) {
            console.log(`🔄 Refunding wallet portion for failed hybrid payment: ${reference}`);
            user.walletBalance = (user.walletBalance || 0) + order.walletPaid;
            await user.save();

            await WalletTransaction.create({
              user: user._id,
              reference: `REFUND-${reference}`,
              amount: order.walletPaid,
              status: 'success',
              type: 'fund',
              channel: 'refund',
              currency: 'NGN',
              narration: `Refund for failed hybrid payment - ${reference}`,
              verified: true,
            });
          }
        }
      }

      console.log(`❌ Payment failed: ${reference} (${email})`);
    } 
    
    // ✅ LOG UNHANDLED EVENTS
    else {
      console.log(`ℹ️ Ignored webhook event: ${event}`);
    }

    return res.sendStatus(200);
  } catch (err: any) {
    console.error('❌ Webhook error:', err);
    return res.status(500).json({ message: 'Internal error' });
  }
});

// ✅ HANDLE VIRTUAL ACCOUNT CREDIT (AUTOMATIC WALLET TOP-UP)
async function handleVirtualAccountCredit(data: any) {
  try {
    const {
      amount,
      reference,
      customer,
      dedicated_account,
      session_id
    } = data;

    console.log(`💳 Virtual Account Credit: ₦${amount / 100} - Reference: ${reference}`);

    // Find user by customer code or virtual account number
    let user = await User.findOne({ 
      paystackCustomerCode: customer.customer_code 
    });

    if (!user && dedicated_account?.account_number) {
      user = await User.findOne({ 
        virtualAccountNumber: dedicated_account.account_number 
      });
    }

    if (!user) {
      console.error(`❌ User not found for virtual account credit. Customer: ${customer.customer_code}`);
      return;
    }

    // Check if transaction already exists (prevent duplicate credits)
    const existingTransaction = await WalletTransaction.findOne({ reference });
    if (existingTransaction) {
      console.log(`⚠️ Virtual account transaction already processed: ${reference}`);
      return;
    }

    // Convert from kobo to naira
    const creditAmount = amount / 100;

    // Credit user wallet
    const previousBalance = user.walletBalance || 0;
    user.walletBalance = previousBalance + creditAmount;
    await user.save();

    // Log the wallet transaction
    await WalletTransaction.create({
      user: user._id,
      reference,
      amount: creditAmount,
      status: 'success',
      type: 'fund',
      channel: 'virtual_account',
      currency: 'NGN',
      narration: `Virtual account credit from ${customer.first_name || 'Bank Transfer'}`,
      verified: true,
    });

    // Log in PaymentLog for consistency
    await PaymentLog.create({
      user: user._id,
      amount: creditAmount,
      reference,
      status: 'success',
      type: 'wallet_topup',
      method: 'virtual_account',
      gatewayResponse: `Virtual account credit - Session: ${session_id}`,
      paidAt: new Date(),
    });

    console.log(`✅ Virtual Account: Credited ₦${creditAmount} to ${user.email} (New Balance: ₦${user.walletBalance})`);

  } catch (error) {
    console.error('❌ Virtual Account Credit Error:', error);
    throw error;
  }
}

// ✅ HANDLE TRANSFER SUCCESS (WITHDRAWAL CONFIRMATION)
async function handleTransferSuccess(data: any) {
  try {
    const { reference, amount, recipient } = data;

    console.log(`✅ Transfer Success: ${reference} - ₦${amount / 100}`);

    // Find the withdrawal transaction
    const transaction = await WalletTransaction.findOne({ 
      reference,
      type: 'withdrawal'
    });

    if (!transaction) {
      console.error(`❌ Withdrawal transaction not found: ${reference}`);
      return;
    }

    // Update transaction status if it's still pending
    if (transaction.status === 'pending') {
      transaction.status = 'success';
      transaction.verified = true;
      transaction.narration += ` - Transfer completed to ${recipient.name}`;
      await transaction.save();
    }

    console.log(`✅ Withdrawal confirmed: ${reference} - ₦${transaction.amount}`);

  } catch (error) {
    console.error('❌ Transfer Success Error:', error);
    throw error;
  }
}

// ✅ HANDLE TRANSFER FAILURE (WITHDRAWAL FAILED - REFUND WALLET)
async function handleTransferFailed(data: any) {
  try {
    const { reference, amount, recipient } = data;

    console.log(`❌ Transfer Failed: ${reference} - ₦${amount / 100}`);

    // Find the withdrawal transaction
    const transaction = await WalletTransaction.findOne({ 
      reference,
      type: 'withdrawal'
    });

    if (!transaction) {
      console.error(`❌ Failed withdrawal transaction not found: ${reference}`);
      return;
    }

    // Find the user and refund their wallet if we haven't already
    const user = await User.findById(transaction.user);
    if (!user) {
      console.error(`❌ User not found for failed withdrawal: ${reference}`);
      return;
    }

    // Only refund if transaction is still pending (not already failed and refunded)
    if (transaction.status === 'pending') {
      // Refund the wallet
      const refundAmount = transaction.amount;
      user.walletBalance = (user.walletBalance || 0) + refundAmount;
      await user.save();

      // Update transaction status
      transaction.status = 'failed';
      transaction.narration += ` - Transfer failed, wallet refunded ₦${refundAmount}`;
      await transaction.save();

      // Create a refund transaction log
      await WalletTransaction.create({
        user: user._id,
        reference: `REFUND-${reference}`,
        amount: refundAmount,
        status: 'success',
        type: 'fund',
        channel: 'refund',
        currency: 'NGN',
        narration: `Refund for failed withdrawal - ${reference}`,
        verified: true,
      });

      console.log(`🔄 Withdrawal failed, refunded ₦${refundAmount} to ${user.email}`);
    } else {
      console.log(`⚠️ Transaction ${reference} already processed as ${transaction.status}`);
    }

  } catch (error) {
    console.error('❌ Transfer Failed Error:', error);
    throw error;
  }
}

// ✅ HANDLE ORDER PAYMENT COMPLETION
async function handleOrderPayment(data: any, user: any) {
  try {
    const reference = data.reference;
    const amount = data.amount / 100;

    // Find the order
    const order = await Order.findOne({ reference });
    if (order) {
      order.status = 'paid';
      order.paidAt = new Date();
      order.paystackPaid = amount;
      await order.save();

      console.log(`✅ Order payment completed: ${reference} - ₦${amount}`);
    }

    // Log payment
    await PaymentLog.create({
      user: user._id,
      amount,
      reference,
      status: 'success',
      type: 'order_payment',
      method: 'paystack',
      gatewayResponse: data.gateway_response,
      paidAt: new Date(data.paid_at),
    });

  } catch (error) {
    console.error('❌ Order Payment Error:', error);
    throw error;
  }
}

// ✅ HANDLE CART PAYMENT COMPLETION
async function handleCartPayment(data: any, user: any) {
  try {
    const reference = data.reference;
    const amount = data.amount / 100;

    // Find all orders with this reference (cart payment creates multiple orders)
    const orders = await Order.find({ reference }).populate('product', 'title price');
    
    if (orders.length > 0) {
      // Update all orders as paid
      await Order.updateMany(
        { reference },
        { 
          status: 'paid',
          paidAt: new Date(),
          paystackPaid: amount // This will be the same for all orders with same reference
        }
      );

      console.log(`✅ Cart payment completed: ${reference} - ₦${amount} for ${orders.length} items`);

      // Send email notification
      const itemsList = orders.map(order => 
        `<li>${order.product?.title || 'Unknown Item'} - ₦${(order.product?.price || 0).toLocaleString()}</li>`
      ).join('');

      await sendEmail(
        user.email,
        'Order Payment Successful! 🎉',
        `
          <p>Hi ${user.fullName || user.email},</p>
          <p>Your payment has been processed successfully!</p>
          <p><strong>Order Details:</strong></p>
          <ul>
            ${itemsList}
          </ul>
          <p><strong>Payment Summary:</strong></p>
          <ul>
            <li>Total Amount: ₦${amount.toLocaleString()}</li>
            <li>Payment Reference: ${reference}</li>
            <li>Items Count: ${orders.length}</li>
          </ul>
          <p>Your orders are now confirmed and will be processed shortly.</p>
          <p>Thank you for shopping with Swaap! 🛍️</p>
        `
      );

      // Send in-app notification
      await sendInAppNotification(user._id.toString(), {
        type: 'order_payment_success',
        message: `Payment successful for ${orders.length} item${orders.length > 1 ? 's' : ''} - ₦${amount.toLocaleString()}`,
        data: {
          reference,
          amount,
          itemCount: orders.length,
          orders: orders.map(o => ({ id: o._id, title: o.product?.title }))
        }
      });

    } else {
      console.warn(`⚠️ No orders found for cart payment reference: ${reference}`);
    }

    // Log payment
    await PaymentLog.create({
      user: user._id,
      amount,
      reference,
      status: 'success',
      type: 'cart_payment',
      method: 'paystack',
      gatewayResponse: data.gateway_response,
      paidAt: new Date(data.paid_at),
    });

  } catch (error) {
    console.error('❌ Cart Payment Error:', error);
    throw error;
  }
}

// ✅ HANDLE CART HYBRID PAYMENT COMPLETION
async function handleCartHybridPayment(data: any, user: any) {
  try {
    const reference = data.reference;
    const cardAmount = data.amount / 100;

    // Find all orders with this reference
    const orders = await Order.find({ reference });
    
    if (orders.length > 0) {
      // Calculate total order amount and wallet amount used
      const totalOrderAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0);
      const totalWalletPaid = orders.reduce((sum, order) => sum + (order.walletPaid || 0), 0);

      // Update all orders as paid
      await Order.updateMany(
        { reference },
        { 
          status: 'paid',
          paidAt: new Date(),
          paystackPaid: cardAmount / orders.length // Distribute card amount across orders
        }
      );

      console.log(`✅ Cart hybrid payment completed: ${reference} - Card: ₦${cardAmount}, Wallet: ₦${totalWalletPaid} for ${orders.length} items`);
    } else {
      console.warn(`⚠️ No orders found for cart hybrid payment reference: ${reference}`);
    }

    // Log payment
    await PaymentLog.create({
      user: user._id,
      amount: cardAmount,
      reference,
      status: 'success',
      type: 'cart_hybrid_payment',
      method: 'paystack',
      gatewayResponse: data.gateway_response,
      paidAt: new Date(data.paid_at),
    });

  } catch (error) {
    console.error('❌ Cart Hybrid Payment Error:', error);
    throw error;
  }
}

// ✅ HANDLE HYBRID PAYMENT COMPLETION
async function handleHybridPayment(data: any, user: any) {
  try {
    const reference = data.reference;
    const cardAmount = data.amount / 100;

    // Find the order
    const order = await Order.findOne({ reference });
    if (order) {
      order.status = 'paid';
      order.paidAt = new Date();
      order.paystackPaid = cardAmount;
      await order.save();

      console.log(`✅ Hybrid payment completed: ${reference} - Card: ₦${cardAmount}, Wallet: ₦${order.walletPaid}`);
    }

    // Log payment
    await PaymentLog.create({
      user: user._id,
      amount: cardAmount,
      reference,
      status: 'success',
      type: 'hybrid_payment',
      method: 'paystack',
      gatewayResponse: data.gateway_response,
      paidAt: new Date(data.paid_at),
    });

  } catch (error) {
    console.error('❌ Hybrid Payment Error:', error);
    throw error;
  }
}

// ✅ HANDLE SWAP PAYMENT COMPLETION
async function handleSwapPayment(data: any, user: any) {
  try {
    const reference = data.reference;
    const amount = data.amount / 100;

    // Extract swap ID from reference (format: SWAP-CARD-{swapId}-{timestamp})
    const swapIdMatch = reference.match(/SWAP-.*?-([a-f0-9]{24})-/);
    if (!swapIdMatch) {
      console.warn(`⚠️ Could not extract swap ID from reference: ${reference}`);
      return;
    }

    const swapId = swapIdMatch[1];
    
    // Find and update the swap
    const swap = await Swap.findById(swapId).populate(['fromUser', 'toUser', 'offeringProduct', 'requestedProduct']);
    if (!swap) {
      console.warn(`⚠️ Swap not found for payment reference: ${reference}`);
      return;
    }

    // Update swap payment status
    swap.paymentStatus = 'completed';
    swap.paymentReference = reference;
    await swap.save();

    console.log(`✅ Swap payment completed: ${reference} - ₦${amount}`);

    // Helper function to get display name
    const getDisplayName = (user: any) => user.fullName || user.email || 'User';

    // Determine payer and recipient
    const payer = user;
    const payerName = getDisplayName(payer);
    const recipient = swap.fromUser._id.toString() === payer._id.toString() ? swap.toUser : swap.fromUser;
    const recipientName = getDisplayName(recipient);

    // Send email to payment recipient
    await sendEmail(
      recipient.email,
      'Swap Payment Received! 💰',
      `
        <p>Hi ${recipientName},</p>
        <p>Great news! <strong>${payerName}</strong> has completed the payment of ₦${amount.toLocaleString()} for your swap!</p>
        <p><strong>Swap Details:</strong></p>
        <ul>
          <li>Your Item: ${swap.requestedProduct?.title || 'Unknown Item'}</li>
          <li>Their Item: ${swap.offeringProduct?.title || 'Unknown Item'}</li>
          <li>Payment Amount: ₦${amount.toLocaleString()}</li>
        </ul>
        <p><strong>Payment Reference:</strong> ${reference}</p>
        <p>Your swap is now fully completed. You can arrange to exchange your items!</p>
        <p>Happy Swaapping! 🔄</p>
      `
    );

    // Send email to payment sender
    await sendEmail(
      payer.email,
      'Swap Payment Successful! ✅',
      `
        <p>Hi ${payerName},</p>
        <p>Your swap payment has been processed successfully!</p>
        <p><strong>Swap Details:</strong></p>
        <ul>
          <li>Your Item: ${swap.offeringProduct?.title || 'Unknown Item'}</li>
          <li>Their Item: ${swap.requestedProduct?.title || 'Unknown Item'}</li>
          <li>Payment Amount: ₦${amount.toLocaleString()}</li>
          <li>Recipient: ${recipientName}</li>
        </ul>
        <p><strong>Payment Reference:</strong> ${reference}</p>
        <p>Your swap is now complete. You can proceed to exchange your items!</p>
        <p>Happy Swaapping! 🔄</p>
      `
    );

    // Send in-app notification to payment recipient
    await sendInAppNotification(recipient._id.toString(), {
      type: 'swap_payment_received',
      message: `${payerName} sent you ₦${amount.toLocaleString()} for your swap`,
      data: {
        swapId: swap._id,
        amount,
        payerName,
        reference,
        offeringProductTitle: swap.offeringProduct?.title,
        requestedProductTitle: swap.requestedProduct?.title
      }
    });

    // Send in-app notification to payment sender
    await sendInAppNotification(payer._id.toString(), {
      type: 'swap_payment_sent',
      message: `Payment of ₦${amount.toLocaleString()} sent to ${recipientName} for swap`,
      data: {
        swapId: swap._id,
        amount,
        recipientName,
        reference,
        offeringProductTitle: swap.offeringProduct?.title,
        requestedProductTitle: swap.requestedProduct?.title
      }
    });

    // Log payment
    await PaymentLog.create({
      user: payer._id,
      amount,
      reference,
      status: 'success',
      type: 'swap_payment',
      method: 'paystack',
      gatewayResponse: data.gateway_response,
      paidAt: new Date(data.paid_at),
    });

  } catch (error) {
    console.error('❌ Swap Payment Error:', error);
    throw error;
  }
}

// ✅ MOCK PAYMENT SUCCESS ENDPOINT (for development)
router.post('/mock-payment-success', async (req, res) => {
  try {
    console.log('🧪 Raw request body received:', req.body);
    
    // Parse the buffer since it comes as raw from the webhook middleware
    let parsedBody;
    if (Buffer.isBuffer(req.body)) {
      console.log('📦 Parsing buffer to JSON...');
      parsedBody = JSON.parse(req.body.toString());
    } else {
      parsedBody = req.body;
    }
    
    console.log('🔍 Parsed body:', parsedBody);
    const { reference, email, amount, metadata } = parsedBody;
    
    console.log(`🧪 Mock payment success triggered: ${reference}`);
    console.log(`📧 Email: ${email}, 💰 Amount: ${amount}`);
    console.log(`📋 Metadata:`, metadata);
    
    if (!reference) {
      console.error('❌ Mock payment: No reference provided');
      return res.status(400).json({ message: 'Reference is required' });
    }
    
    if (!email) {
      console.error('❌ Mock payment: No email provided');
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // Simulate the webhook payload that Paystack would send
    const mockWebhookData = {
      event: 'charge.success',
      data: {
        reference,
        customer: { email },
        amount: amount * 100, // Convert to kobo
        status: 'success',
        gateway_response: 'Mock payment successful',
        paid_at: new Date().toISOString(),
        metadata: metadata || {}
      }
    };

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Process based on payment purpose - map direct_payment to cart_payment
    let purpose = metadata?.purpose || 'wallet_topup';
    if (purpose === 'direct_payment') {
      purpose = 'cart_payment';
      console.log(`🔄 Mapped 'direct_payment' to 'cart_payment'`);
    }
    
    switch (purpose) {
      case 'cart_payment':
        // For mock payments, create orders first if they don't exist
        await handleMockCartPayment(mockWebhookData.data, user, metadata);
        break;
      case 'cart_hybrid_payment':
        await handleCartHybridPayment(mockWebhookData.data, user);
        break;
      case 'swap_payment':
        await handleSwapPayment(mockWebhookData.data, user);
        break;
      default:
        console.log(`⚠️ Mock payment: Unknown purpose '${purpose}'`);
        break;
    }

    // Don't create PaymentLog here - it's handled in the specific payment functions
    console.log(`✅ Mock payment processed: ${reference}`);
    
    res.status(200).json({
      message: 'Mock payment processed successfully',
      reference,
      purpose
    });

  } catch (error: any) {
    console.error('❌ Mock payment processing error:', error);
    res.status(500).json({ 
      message: 'Mock payment processing failed',
      error: error.message 
    });
  }
});

// ✅ HANDLE MOCK CART PAYMENT (create orders + send notifications)
async function handleMockCartPayment(data: any, user: any, metadata: any) {
  try {
    const reference = data.reference;
    const amount = data.amount / 100;
    
    console.log(`🛒 Processing mock cart payment: ${reference}`);
    
    // Check if PaymentLog already exists AND orders were created
    const existingLog = await PaymentLog.findOne({ reference });
    const existingOrders = await Order.find({ reference });
    
    if (existingLog && existingOrders.length > 0) {
      console.log(`⚠️ Payment already fully processed: ${reference} (${existingOrders.length} orders exist)`);
      return;
    } else if (existingLog && existingOrders.length === 0) {
      console.log(`🔄 Payment log exists but no orders found - reprocessing: ${reference}`);
      // Delete the incomplete PaymentLog so we can recreate it
      await PaymentLog.deleteOne({ reference });
    }
    
    // Extract cart items from frontend route params
    const cartItems = metadata.cartItems || [];
    console.log(`📦 Creating ${cartItems.length} orders for mock payment`);
    
    if (cartItems.length === 0) {
      console.warn(`⚠️ No cart items found in metadata`);
      return;
    }
    
    const orders = [];
    
    // Create orders from cart items
    for (const item of cartItems) {
      const productId = item._id || item.productId || item.id;
      if (!productId) continue;

      const order = await Order.create({
        user: user._id,
        product: productId,
        quantity: item.quantity || 1,
        totalAmount: item.price * (item.quantity || 1),
        paymentMethod: 'paystack',
        reference: reference,
        status: 'paid',
        paidAt: new Date(),
        
        buyer: user._id,
        seller: item.user?._id || item.sellerId,
        shippingMethod: item.shippingMethod || 'self-arranged',
        verificationLevel: item.verificationLevel || 'basic',
        serviceFee: item.serviceFeePerItem || 0,
        shippingFee: item.shippingFeePerItem || 0,
        
        // Add required packageDetails
        packageDetails: {
          weight: 1.0,
          length: 30,
          width: 20, 
          height: 15,
          value: item.price * (item.quantity || 1),
          description: item.title || 'Product Order'
        }
      });

      orders.push(order);
      console.log(`✅ Order created: ${order._id} for product ${productId}`);
    }

    // Send email notification
    const itemsList = orders.map((order, index) => 
      `<li>${cartItems[index]?.title || 'Unknown Item'} - ₦${order.totalAmount.toLocaleString()}</li>`
    ).join('');

    await sendEmail(
      user.email,
      'Order Payment Successful! 🎉',
      `
        <p>Hi ${user.fullName || user.email},</p>
        <p>Your payment has been processed successfully!</p>
        <p><strong>Order Details:</strong></p>
        <ul>
          ${itemsList}
        </ul>
        <p><strong>Payment Summary:</strong></p>
        <ul>
          <li>Total Amount: ₦${amount.toLocaleString()}</li>
          <li>Payment Reference: ${reference}</li>
          <li>Items Count: ${orders.length}</li>
        </ul>
        <p>Your orders are now confirmed and will be processed shortly.</p>
        <p>Thank you for shopping with Swaap! 🛍️</p>
      `
    );

    // Send in-app notification
    await sendInAppNotification(user._id.toString(), {
      type: 'order_payment_success',
      message: `Payment successful for ${orders.length} item${orders.length > 1 ? 's' : ''} - ₦${amount.toLocaleString()}`,
      data: {
        reference,
        amount,
        itemCount: orders.length,
        orders: orders.map((o, index) => ({ id: o._id, title: cartItems[index]?.title }))
      }
    });
    
    // Create payment log (only if orders were created successfully)
    await PaymentLog.create({
      user: user._id,
      amount: amount,
      reference: reference,
      status: 'success',
      type: 'cart_payment',
      method: 'paystack',
      gatewayResponse: 'Mock payment successful (development)',
      paidAt: new Date(),
    });
    
    console.log(`✅ Mock cart payment completed with notifications: ${reference}`);

  } catch (error) {
    console.error('❌ Mock Cart Payment Error:', error);
    throw error;
  }
}

// ✅ WEBHOOK HEALTH CHECK
router.get('/health', (req, res) => {
  res.status(200).json({ 
    message: 'Paystack webhook endpoint is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

export default router;