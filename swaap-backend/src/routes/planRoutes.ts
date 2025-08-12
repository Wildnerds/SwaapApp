import express from 'express';
import axios from 'axios';
import User from '@/models/User';
import { verifyJwtToken } from '@/middlewares/verifyJwtToken';

const router = express.Router();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET!;
const CALLBACK_URL = process.env.PAYSTACK_CALLBACK_URL || 'https://yourdomain.com/paystack/callback';

router.post('/upgrade', verifyJwtToken, async (req, res) => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const payload = {
      email: user.email,
      amount: 100000,
      callback_url: CALLBACK_URL,
      metadata: { userId: user._id.toString() },
    };

    const response = await axios.post('https://api.paystack.co/transaction/initialize', payload, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
    });

    res.status(200).json({
      authorization_url: response.data.data.authorization_url,
      reference: response.data.data.reference,
    });
  } catch (err) {
    console.error('🔴 Paystack init error:', err);
    res.status(500).json({ message: 'Payment initialization failed' });
  }
});

router.post('/webhook', express.json({ type: 'application/json' }), async (req, res) => {
  const event = req.body;

  if (event.event === 'charge.success') {
    const userId = event.data?.metadata?.userId;
    if (userId) {
      await User.findByIdAndUpdate(userId, {
        plan: 'pro',
        proSince: new Date(),
      });
      console.log(`✅ Paystack Upgrade: User ${userId} upgraded to Pro`);
    }
  }

  res.sendStatus(200);
});

export default router;
