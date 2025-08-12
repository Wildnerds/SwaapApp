import { Request, Response, NextFunction } from 'express';
import Product from '@/models/Product';
import User from '@/models/User';

export const limitProductUploads = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // ✅ Pro users get unlimited uploads
    if (user.isPro) return next();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCount = await Product.countDocuments({
      user: userId,
      createdAt: { $gte: today },
    });

    if (todayCount >= 5) {
      return res.status(429).json({
        message: 'You’ve reached your daily product listing limit. Upgrade to Swaap Pro for unlimited uploads.',
      });
    }

    next();
  } catch (error) {
    console.error('[UploadLimit Error]', error);
    res.status(500).json({ message: 'Server error' });
  }
};
