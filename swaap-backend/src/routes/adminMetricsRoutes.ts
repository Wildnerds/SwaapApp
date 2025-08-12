import express from 'express';
import User from '@/models/User';
import Product from '@/models/Product';
import Swap from '@/models/Swap';
import { verifyJwtToken } from '@/middlewares/verifyJwtToken';
import { isAdmin } from '@/middlewares/isAdmin';

const router = express.Router();

router.get('/metrics', verifyJwtToken, isAdmin, async (req, res) => {
  try {
    const [totalUsers, proUsers, totalProducts, totalSwaps] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ plan: 'pro' }),
      Product.countDocuments(),
      Swap.countDocuments(),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [dailySwaps, latestUsers, topSwappers] = await Promise.all([
      Swap.countDocuments({ createdAt: { $gte: today } }),
      User.find().sort({ createdAt: -1 }).limit(5).select('fullName email createdAt'),
      User.find().sort({ successfulSwaps: -1 }).limit(5).select('fullName email successfulSwaps'),
    ]);

    res.json({
      totalUsers,
      proUsers,
      totalProducts,
      totalSwaps,
      dailySwaps,
      latestUsers,
      topSwappers,
    });
  } catch (err) {
    console.error('Admin metrics error:', err);
    res.status(500).json({ message: 'Failed to fetch metrics' });
  }
});

export default router;
