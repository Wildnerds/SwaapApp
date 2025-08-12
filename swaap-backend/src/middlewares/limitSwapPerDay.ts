// src/middlewares/limitSwapPerDay.ts
import { Request, Response, NextFunction } from 'express';
import Swap from '@/models/Swap';

export const limitSwapPerDay = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const count = await Swap.countDocuments({
      fromUser: req.user?._id,
      createdAt: { $gte: today },
    });

    if (count >= 5) {
      return res.status(429).json({
        message: 'You have reached the daily limit of 5 swap offers.',
      });
    }

    next();
  } catch (error) {
    console.error('Swap limit check failed:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
