// routes/wallet.ts
import express, { Request, Response } from 'express';
import User from '@/models/User';
import { verifyJwtToken } from '@/middlewares/verifyJwtToken';
import Order from '@/models/Order';
import { paystackApi } from '@/utils/paystack';
import PaymentLog from '@/models/PaymentLog';
import { WalletTransaction } from '@/models/WalletTransaction';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const router = express.Router();

// ✅ CREATE VIRTUAL ACCOUNT
router.post('/create-virtual-account', verifyJwtToken, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check if user already has a virtual account
    if (user.virtualAccountNumber && user.virtualBankName) {
      return res.status(200).json({
        message: 'Virtual account already exists',
        accountDetails: {
          accountNumber: user.virtualAccountNumber,
          bankName: user.virtualBankName,
          accountName: user.virtualAccountName || user.fullName,
        }
      });
    }

    // Create or retrieve Paystack customer
    let customerCode = user.paystackCustomerCode;
    
    if (!customerCode) {
      const customerRes = await axios.post('https://api.paystack.co/customer', {
        email: user.email,
        first_name: user.fullName?.split(' ')[0] || 'User',
        last_name: user.fullName?.split(' ').slice(1).join(' ') || '',
        phone: user.mobile || '',
      }, {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        }
      });

      customerCode = customerRes.data.data.customer_code;
    }

    // Create dedicated virtual account
    const virtualAccountRes = await axios.post('https://api.paystack.co/dedicated_account', {
      customer: customerCode,
      preferred_bank: 'wema-bank',
    }, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      }
    });

    const virtualAccountData = virtualAccountRes.data.data;

    // Update user with virtual account details
    user.paystackCustomerCode = customerCode;
    user.virtualAccountNumber = virtualAccountData.account_number;
    user.virtualAccountName = virtualAccountData.account_name;
    user.virtualBankName = virtualAccountData.bank.name;
    user.virtualAccountId = virtualAccountData.id;
    user.virtualAccountActive = true;
    await user.save();

    // Log the virtual account creation
    await WalletTransaction.create({
      user: user._id,
      reference: `VA-CREATED-${Date.now()}`,
      amount: 0,
      status: 'success',
      type: 'fund',
      channel: 'system',
      narration: 'Virtual account created',
      verified: true,
    });

    res.status(201).json({
      message: 'Virtual account created successfully',
      accountDetails: {
        accountNumber: virtualAccountData.account_number,
        bankName: virtualAccountData.bank.name,
        accountName: virtualAccountData.account_name,
      }
    });

  } catch (error: any) {
    console.error('[Create Virtual Account Error]', error?.response?.data || error.message);
    res.status(500).json({ 
      message: 'Failed to create virtual account',
      error: process.env.NODE_ENV === 'development' ? error?.response?.data : undefined
    });
  }
});

// ✅ GET VIRTUAL ACCOUNT DETAILS
router.get('/virtual-account', verifyJwtToken, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user._id).select('virtualAccountNumber virtualBankName virtualAccountName fullName walletBalance virtualAccountActive');
    
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.virtualAccountNumber) {
      return res.status(404).json({ 
        message: 'No virtual account found. Please create one first.',
        hasVirtualAccount: false
      });
    }

    res.status(200).json({
      hasVirtualAccount: true,
      isActive: user.virtualAccountActive,
      accountDetails: {
        accountNumber: user.virtualAccountNumber,
        bankName: user.virtualBankName,
        accountName: user.virtualAccountName || user.fullName,
      },
      walletBalance: user.walletBalance || 0,
      instructions: [
        'Transfer any amount to this account number',
        'Your wallet will be credited automatically',
        'Transfers usually reflect within 5-15 minutes'
      ]
    });

  } catch (error) {
    console.error('[Get Virtual Account Error]', error);
    res.status(500).json({ message: 'Failed to retrieve virtual account details' });
  }
});

// ✅ GET WALLET BALANCE
router.get('/balance', verifyJwtToken, async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findById(req.user._id).select('walletBalance fullName email virtualAccountNumber virtualBankName virtualAccountName');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get recent transactions
    const recentTransactions = await WalletTransaction.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('reference amount status type createdAt narration channel');

    return res.status(200).json({
      balance: user.walletBalance || 0,
      user: {
        name: user.fullName,
        email: user.email,
      },
      virtualAccount: user.virtualAccountNumber ? {
        accountNumber: user.virtualAccountNumber,
        bankName: user.virtualBankName,
        accountName: user.virtualAccountName || user.fullName,
      } : null,
      recentTransactions,
    });
  } catch (err) {
    console.error('Error fetching wallet balance:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ✅ CARD WALLET FUNDING
// routes/walletRoutes.ts - Updated fund endpoint
// Add this test endpoint to debug
router.post('/fund-test', verifyJwtToken, async (req: Request, res: Response) => {
  try {
    console.log('🧪 Test endpoint hit');
    console.log('Request body:', req.body);
    console.log('User:', req.user);
    
    // Test 1: Basic response
    if (!req.body.amount) {
      return res.json({ 
        status: 'error', 
        message: 'No amount provided',
        received: req.body 
      });
    }

    // Test 2: Environment check
    if (!process.env.PAYSTACK_SECRET_KEY) {
      return res.json({ 
        status: 'error', 
        message: 'PAYSTACK_SECRET_KEY not found in environment' 
      });
    }

    // Test 3: User lookup
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.json({ 
        status: 'error', 
        message: 'User not found',
        userId: req.user._id 
      });
    }

    // Test 4: Simple Paystack call
    const testData = {
      email: user.email,
      amount: 10000, // ₦100 in kobo
      reference: `TEST-${Date.now()}`,
    };

    console.log('Testing Paystack with:', testData);

    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      testData,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.json({
      status: 'success',
      message: 'All tests passed',
      user: { id: user._id, email: user.email },
      paystack: {
        status: response.status,
        hasUrl: !!response.data.data.authorization_url,
        reference: response.data.data.reference
      }
    });

  } catch (error: any) {
    console.error('Test endpoint error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
});

// ✅ SET WALLET PIN
router.post('/set-pin', verifyJwtToken, async (req: Request, res: Response) => {
  try {
    const { pin } = req.body;

    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({ message: 'PIN must be 4 digits' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.walletPin) {
      return res.status(409).json({ message: 'PIN already set. Use /update-pin to change it.' });
    }

    const hashed = await bcrypt.hash(pin, 10);
    user.walletPin = hashed;
    await user.save();

    res.status(200).json({ message: 'Wallet PIN set successfully' });
  } catch (err) {
    console.error('[Set PIN Error]', err);
    res.status(500).json({ message: 'Failed to set PIN' });
  }
});

// ✅ UPDATE WALLET PIN
router.post('/update-pin', verifyJwtToken, async (req: Request, res: Response) => {
  try {
    const { oldPin, newPin } = req.body;

    if (!/^\d{4}$/.test(newPin)) {
      return res.status(400).json({ message: 'New PIN must be 4 digits' });
    }

    const user = await User.findById(req.user._id).select('+walletPin');
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.walletPin) {
      return res.status(400).json({ message: 'No PIN set yet. Use /set-pin instead.' });
    }

    const isMatch = await bcrypt.compare(oldPin, user.walletPin);
    if (!isMatch) {
      return res.status(401).json({ message: 'Old PIN is incorrect' });
    }

    const hashed = await bcrypt.hash(newPin, 10);
    user.walletPin = hashed;
    await user.save();

    res.status(200).json({ message: 'PIN updated successfully' });
  } catch (err) {
    console.error('[Update PIN Error]', err);
    res.status(500).json({ message: 'Failed to update PIN' });
  }
});

// ✅ WITHDRAW FUNDS
router.post('/withdraw', verifyJwtToken, async (req: Request, res: Response) => {
  try {
    const { amount, pin, bankCode, accountNumber, accountName } = req.body;
    
    // Validation
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    if (!pin || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ message: 'Valid 4-digit PIN required' });
    }

    if (!bankCode || !accountNumber || !accountName) {
      return res.status(400).json({ message: 'Bank details are required for withdrawal' });
    }

    const user = await User.findById(req.user._id).select('+walletPin');
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    if (!user.walletPin) {
      return res.status(403).json({ message: 'Please set your wallet PIN first' });
    }

    // Verify PIN
    const isMatch = await bcrypt.compare(pin, user.walletPin);
    if (!isMatch) return res.status(401).json({ message: 'Incorrect PIN' });

    // Check balance
    const currentBalance = user.walletBalance || 0;
    if (currentBalance < amount) {
      return res.status(400).json({ 
        message: 'Insufficient balance',
        currentBalance,
        requestedAmount: amount
      });
    }

    // Check withdrawal limits
    const maxLimit = user.plan === 'pro' ? 500000 : 10000;
    const minLimit = 100;
    
    if (amount > maxLimit) {
      return res.status(403).json({ 
        message: `Limit exceeded. Max withdrawal: ₦${maxLimit.toLocaleString()}` 
      });
    }

    if (amount < minLimit) {
      return res.status(400).json({ 
        message: `Minimum withdrawal amount is ₦${minLimit}` 
      });
    }

    // Check last withdrawal time (12-hour limit)
    const lastWithdrawal = await WalletTransaction.findOne({
      user: user._id,
      type: 'withdrawal',
      status: 'success',
    }).sort({ createdAt: -1 });

    if (lastWithdrawal) {
      const hoursSinceLast = (Date.now() - new Date(lastWithdrawal.createdAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLast < 12) {
        return res.status(429).json({
          message: `You can withdraw once every 12 hours. Please wait ${Math.ceil(12 - hoursSinceLast)} more hour(s).`,
        });
      }
    }

    // Generate withdrawal reference
    const reference = `WD-${Date.now()}-${user._id.toString().slice(-4)}`;

    // Create pending withdrawal transaction
    const withdrawalTransaction = await WalletTransaction.create({
      user: user._id,
      reference,
      amount,
      status: 'pending',
      type: 'withdrawal',
      channel: 'bank_transfer',
      narration: `Withdrawal to ${accountName} - ${accountNumber}`,
      verified: false,
    });

    try {
      // Create transfer recipient
      const recipientRes = await axios.post('https://api.paystack.co/transferrecipient', {
        type: 'nuban',
        name: accountName,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: 'NGN',
      }, {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        }
      });

      const recipientCode = recipientRes.data.data.recipient_code;

      // Initiate transfer
      const transferRes = await axios.post('https://api.paystack.co/transfer', {
        source: 'balance',
        amount: amount * 100, // Convert to kobo
        recipient: recipientCode,
        reason: `Wallet withdrawal - ${reference}`,
        reference,
      }, {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        }
      });

      const transferData = transferRes.data.data;

      // If transfer initiated successfully, deduct from wallet
      if (transferData.status === 'pending' || transferData.status === 'success') {
        user.walletBalance = currentBalance - amount;
        await user.save();

        // Update transaction
        withdrawalTransaction.status = 'success';
        withdrawalTransaction.verified = true;
        withdrawalTransaction.narration += ` - Transfer ID: ${transferData.id}`;
        await withdrawalTransaction.save();

        res.status(200).json({
          message: 'Withdrawal initiated successfully',
          reference,
          amount,
          newBalance: user.walletBalance,
          transferId: transferData.id,
          estimatedArrival: '15-30 minutes',
        });
      } else {
        // Transfer failed
        withdrawalTransaction.status = 'failed';
        withdrawalTransaction.narration += ' - Transfer failed';
        await withdrawalTransaction.save();

        res.status(400).json({
          message: 'Transfer failed. Please try again.',
          error: transferData.message || 'Unknown error',
        });
      }

    } catch (transferError: any) {
      console.error('[Transfer Error]', transferError?.response?.data || transferError.message);
      
      // Update transaction as failed
      withdrawalTransaction.status = 'failed';
      withdrawalTransaction.narration += ` - Error: ${transferError?.response?.data?.message || 'Transfer failed'}`;
      await withdrawalTransaction.save();

      res.status(500).json({
        message: 'Withdrawal failed. Please try again.',
        error: process.env.NODE_ENV === 'development' ? transferError?.response?.data : undefined,
      });
    }

  } catch (err: any) {
    console.error('[Withdraw error]', err);
    res.status(500).json({ message: 'Withdrawal failed' });
  }
});

// ✅ CART PAYMENT WITH WALLET ONLY
router.post('/cart-pay', verifyJwtToken, async (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    const userId = req.user?._id;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Cart items are required' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Calculate total amount from cart items
    const totalAmount = items.reduce((sum: number, item: any) => {
      return sum + (item.price * item.quantity);
    }, 0);

    if ((user.walletBalance || 0) < totalAmount) {
      return res.status(400).json({ 
        message: 'Insufficient wallet balance',
        required: totalAmount,
        available: user.walletBalance || 0,
        shortfall: totalAmount - (user.walletBalance || 0)
      });
    }

    // Deduct from wallet
    user.walletBalance -= totalAmount;
    await user.save();

    // Create orders for each item
    const orders = [];
    for (const item of items) {
      const order = await Order.create({
        user: userId,
        product: item._id,
        quantity: item.quantity,
        totalAmount: item.price * item.quantity,
        paymentMethod: 'wallet',
        walletPaid: item.price * item.quantity,
        paystackPaid: 0,
        status: 'paid',
        paidAt: new Date(),
      });
      orders.push(order);
    }

    // Log wallet transaction
    const reference = `CART-WALLET-${Date.now()}`;
    await WalletTransaction.create({
      user: userId,
      reference,
      amount: totalAmount,
      status: 'success',
      type: 'withdrawal',
      channel: 'system',
      narration: `Cart payment - ${items.length} items`,
      verified: true,
    });

    // Log payment
    await PaymentLog.create({
      user: userId,
      amount: totalAmount,
      reference,
      status: 'success',
      type: 'cart_payment',
      method: 'wallet',
      gatewayResponse: 'Wallet payment successful',
      paidAt: new Date(),
    });

    res.status(200).json({ 
      message: 'Cart payment successful',
      reference,
      orders: orders.map(o => o._id),
      totalAmount,
      newWalletBalance: user.walletBalance
    });

  } catch (err) {
    console.error('Cart wallet payment error:', err);
    res.status(500).json({ message: 'Cart payment failed' });
  }
});

// ✅ CART PAYMENT WITH HYBRID (WALLET + CARD)
router.post('/cart-pay-partial', verifyJwtToken, async (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Cart items are required' });
    }

    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Calculate total amount
    const totalAmount = items.reduce((sum: number, item: any) => {
      return sum + (item.price * item.quantity);
    }, 0);

    let walletBalance = user.walletBalance || 0;
    const walletPaid = Math.min(walletBalance, totalAmount);
    const amountLeft = totalAmount - walletPaid;

    // Deduct wallet portion
    user.walletBalance = walletBalance - walletPaid;
    await user.save();

    // Create orders for each item
    const orders = [];
    for (const item of items) {
      const itemTotal = item.price * item.quantity;
      const itemWalletPortion = (walletPaid / totalAmount) * itemTotal;
      const itemCardPortion = itemTotal - itemWalletPortion;

      const order = await Order.create({
        user: userId,
        product: item._id,
        quantity: item.quantity,
        totalAmount: itemTotal,
        paymentMethod: 'hybrid',
        walletPaid: itemWalletPortion,
        paystackPaid: 0, // Will be updated when card payment completes
        reference: '', // Will be set after Paystack init
        status: amountLeft <= 0 ? 'paid' : 'pending',
        paidAt: amountLeft <= 0 ? new Date() : undefined,
      });
      orders.push(order);
    }

    // Log wallet portion
    if (walletPaid > 0) {
      await WalletTransaction.create({
        user: userId,
        reference: `CART-HYBRID-WALLET-${Date.now()}`,
        amount: walletPaid,
        status: 'success',
        type: 'withdrawal',
        channel: 'system',
        narration: `Cart hybrid payment wallet portion - ${items.length} items`,
        verified: true,
      });
    }

    if (amountLeft <= 0) {
      // Fully paid with wallet
      const reference = `CART-WALLET-FULL-${Date.now()}`;
      
      await PaymentLog.create({
        user: userId,
        amount: totalAmount,
        reference,
        status: 'success',
        type: 'cart_payment',
        method: 'wallet',
        gatewayResponse: 'Full wallet payment for cart',
        paidAt: new Date(),
      });

      return res.status(200).json({ 
        message: 'Cart paid fully from wallet', 
        amountLeft: 0,
        walletPaid,
        reference,
        orders: orders.map(o => o._id)
      });
    }

    // Initialize Paystack for remaining amount
    const reference = `CART-HYBRID-${Date.now()}`;
    const payRes = await paystackApi.post('/transaction/initialize', {
      email: user.email,
      amount: amountLeft * 100, // Convert to kobo
      reference,
      metadata: {
        purpose: 'cart_hybrid_payment',
        user_id: userId.toString(),
        wallet_paid: walletPaid,
        total_amount: totalAmount,
        items_count: items.length,
      },
    });

    const data = payRes.data?.data;
    
    // Update orders with reference
    await Order.updateMany(
      { _id: { $in: orders.map(o => o._id) } },
      { reference: data.reference }
    );

    res.status(200).json({
      message: 'Partial wallet deducted. Continue with Paystack',
      amountLeft,
      walletPaid,
      authorization_url: data.authorization_url,
      reference: data.reference,
      orders: orders.map(o => o._id),
    });

  } catch (err) {
    console.error('Cart hybrid payment error', err);
    res.status(500).json({ message: 'Cart hybrid payment failed' });
  }
});

// ✅ WALLET-ONLY PAYMENT
router.post('/pay', verifyJwtToken, async (req: Request, res: Response) => {
  try {
    const { productId, quantity, amount } = req.body;
    const userId = req.user?._id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if ((user.walletBalance || 0) < amount) {
      return res.status(400).json({ message: 'Insufficient wallet balance' });
    }

    user.walletBalance -= amount;
    await user.save();

    const order = await Order.create({
      user: userId,
      product: productId,
      quantity,
      totalAmount: amount,
      paymentMethod: 'wallet',
      walletPaid: amount,
      paystackPaid: 0,
      status: 'paid',
      paidAt: new Date(),
    });

    // Log wallet transaction
    await WalletTransaction.create({
      user: userId,
      reference: `ORDER-${order._id}`,
      amount,
      status: 'success',
      type: 'withdrawal',
      channel: 'system',
      narration: `Order payment - ${productId}`,
      verified: true,
    });

    res.status(200).json({ message: 'Wallet payment successful', orderId: order._id });
  } catch (err) {
    console.error('Wallet pay error:', err);
    res.status(500).json({ message: 'Wallet payment failed' });
  }
});

// ✅ HYBRID PAYMENT (WALLET + CARD)
router.post('/pay-partial', verifyJwtToken, async (req: Request, res: Response) => {
  try {
    const { productId, quantity, amount } = req.body;
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    let walletBalance = user.walletBalance || 0;
    const walletPaid = Math.min(walletBalance, amount);
    const amountLeft = amount - walletPaid;

    // Deduct wallet portion
    user.walletBalance = walletBalance - walletPaid;
    await user.save();

    // Create order
    const order = await Order.create({
      user: userId,
      product: productId,
      quantity,
      totalAmount: amount,
      paymentMethod: 'hybrid',
      walletPaid,
      paystackPaid: 0,
      reference: '', // we'll set it after Paystack init
    });

    // Log wallet portion
    if (walletPaid > 0) {
      await WalletTransaction.create({
        user: userId,
        reference: `HYBRID-WALLET-${order._id}`,
        amount: walletPaid,
        status: 'success',
        type: 'withdrawal',
        channel: 'system',
        narration: `Hybrid payment wallet portion - ${productId}`,
        verified: true,
      });
    }

    if (amountLeft <= 0) {
      order.status = 'paid';
      order.paidAt = new Date();
      await order.save();
      return res.status(200).json({ message: 'Paid fully from wallet', amountLeft: 0, orderId: order._id });
    }

    // Initialize Paystack for remaining amount
    const payRes = await paystackApi.post('/transaction/initialize', {
      email: user.email,
      amount: amountLeft * 100,
      metadata: {
        purpose: 'hybrid_payment',
        order_id: order._id.toString(),
        wallet_paid: walletPaid,
      },
    });

    const data = payRes.data?.data;
    order.reference = data.reference;
    await order.save();

    res.status(200).json({
      message: 'Partial wallet deducted. Continue with Paystack',
      amountLeft,
      walletPaid,
      authorization_url: data.authorization_url,
      reference: data.reference,
      orderId: order._id,
    });
  } catch (err) {
    console.error('Hybrid payment error', err);
    res.status(500).json({ message: 'Hybrid payment failed' });
  }
});

// ✅ GET BANKS LIST
router.get('/banks', async (req: Request, res: Response) => {
  try {
    const response = await axios.get('https://api.paystack.co/bank', {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      }
    });

    const banks = response.data.data
      .filter((bank: any) => bank.active && bank.country === 'Nigeria')
      .map((bank: any) => ({
        name: bank.name,
        code: bank.code,
        longcode: bank.longcode,
      }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    res.status(200).json({
      banks,
      total: banks.length,
      message: 'Banks fetched successfully'
    });

  } catch (error: any) {
    console.error('[Get Banks Error]', error?.response?.data || error.message);
    res.status(500).json({ 
      message: 'Failed to fetch bank list',
      error: process.env.NODE_ENV === 'development' ? error?.response?.data : undefined
    });
  }
});

// ✅ VERIFY BANK ACCOUNT
router.post('/verify-account', verifyJwtToken, async (req: Request, res: Response) => {
  try {
    const { accountNumber, bankCode } = req.body;

    if (!accountNumber || !bankCode) {
      return res.status(400).json({ 
        message: 'Account number and bank code are required' 
      });
    }

    if (!/^\d{10}$/.test(accountNumber)) {
      return res.status(400).json({ 
        message: 'Account number must be 10 digits' 
      });
    }

    const response = await axios.get(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        }
      }
    );

    if (response.data.status) {
      res.status(200).json({
        success: true,
        accountName: response.data.data.account_name,
        accountNumber: response.data.data.account_number,
        message: 'Account verified successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Unable to verify account details'
      });
    }

  } catch (error: any) {
    console.error('[Verify Account Error]', error?.response?.data || error.message);
    res.status(500).json({ 
      success: false,
      message: 'Account verification failed',
      error: process.env.NODE_ENV === 'development' ? error?.response?.data : undefined
    });
  }
});

// ✅ GET WALLET TRANSACTIONS
router.get('/transactions', verifyJwtToken, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as 'fund' | 'withdrawal' | undefined;

    const query: any = { user: req.user._id };
    if (type) query.type = type;

    const transactions = await WalletTransaction.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('reference amount status type narration createdAt verified channel');

    const totalTransactions = await WalletTransaction.countDocuments(query);

    res.json({
      transactions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalTransactions / limit),
        totalTransactions,
        hasNextPage: page < Math.ceil(totalTransactions / limit),
        hasPrevPage: page > 1,
      }
    });
  } catch (error) {
    console.error('Transaction fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch transactions' });
  }
});

export default router;