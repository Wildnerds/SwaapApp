import { Request, Response, NextFunction } from 'express';
import Product from '@/models/Product';
import User from '@/models/User';

export const checkProLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: 'User not found' });

    // Skip limit check if user is Pro
    if (user.plan === 'pro') return next();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const uploadsToday = await Product.countDocuments({
      user: userId,
      createdAt: { $gte: today },
    });

    if (uploadsToday >= 5) {
      return res.status(429).json({ message: 'Free users can only upload 5 products per day. Upgrade to Pro to unlock more.' });
    }

    next();
  } catch (err) {
    console.error('checkProLimit error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
