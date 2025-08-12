import express from 'express';
import Product from '@/models/Product';
import Swap from '@/models/Swap';
import User from '@/models/User';
import { verifyJwtToken } from '@/middlewares/verifyJwtToken';

const router = express.Router();

const PLAN_LIMITS: Record<string, { productLimit: number; swapLimit: number }> = {
  free: { productLimit: 5, swapLimit: 5 },
  premium: { productLimit: 50, swapLimit: 10 },
  pro: { productLimit: 999, swapLimit: 999 },
};

router.get('/', verifyJwtToken, async (req, res) => {
  try {
    const userId = req.user?._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [user, productsToday, swapsToday] = await Promise.all([
      User.findById(userId),
      Product.countDocuments({ user: userId, createdAt: { $gte: today } }),
      Swap.countDocuments({ fromUser: userId, createdAt: { $gte: today } }),
    ]);

    if (!user) return res.status(404).json({ message: 'User not found' });

    const plan = user.plan || 'free';
    const limits = PLAN_LIMITS[plan];

    res.status(200).json({
      plan,
      productsToday,
      swapsToday,
      productLimit: limits.productLimit,
      swapLimit: limits.swapLimit,
      remainingProducts: Math.max(limits.productLimit - productsToday, 0),
      remainingSwaps: Math.max(limits.swapLimit - swapsToday, 0),
    });
  } catch (err) {
    console.error('❌ Limit fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch usage limits' });
  }
});

export default router;
