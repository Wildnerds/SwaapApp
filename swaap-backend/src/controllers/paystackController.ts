// src/controllers/paystackController.ts
import axios from 'axios';
import { Request, Response } from 'express';
import User from '../models/User';
import crypto from 'crypto';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;
const CALLBACK_URL = process.env.CLIENT_DOMAIN + '/upgrade-success';

const headers = {
  Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
  'Content-Type': 'application/json',
};

// ✅ POST /api/paystack/initialize
export const initializePayment = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const data = {
      email: user.email,
      amount: 500 * 100, // ₦500 in kobo
      callback_url: CALLBACK_URL,
      metadata: {
        userId: user._id.toString(),
        name: user.fullName,
      },
    };

    const response = await axios.post('https://api.paystack.co/transaction/initialize', data, { headers });
    return res.status(200).json({ url: response.data.data.authorization_url });
  } catch (error: any) {
    console.error('❌ Paystack init error:', error.message);
    res.status(500).json({ message: 'Failed to initialize payment' });
  }
};

// ✅ POST /api/paystack/webhook
export const handlePaystackWebhook = async (req: Request, res: Response) => {
  try {
    // Validate Paystack signature
    const hash = crypto
      .createHmac('sha512', PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      console.warn('❌ Invalid Paystack signature');
      return res.status(401).json({ message: 'Invalid signature' });
    }

    const event = req.body;

    if (event.event === 'charge.success') {
      const metadata = event.data.metadata;
      const userId = metadata?.userId;

      if (userId) {
        await User.findByIdAndUpdate(userId, {
          plan: 'pro',
          proSince: new Date(),
        });

        console.log(`✅ Paystack upgrade: User ${userId} is now PRO`);
      } else {
        console.warn('⚠ No userId found in Paystack metadata');
      }
    }

    return res.sendStatus(200);
  } catch (error: any) {
    console.error('❌ Paystack webhook error:', error.message);
    res.sendStatus(500);
  }
};