import { Request, Response, NextFunction } from 'express';
import User from '@/models/User';

export const ensureMongoUserExists = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    console.log('🔐 JWT decoded user:', req.user);

    const userId = req.user?._id; // works because of global express.d.ts

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - Missing user ID from JWT',
      });
    }

    const mongoUser = await User.findById(userId);

    if (!mongoUser) {
      return res.status(404).json({
        success: false,
        message: 'No corresponding user found in database.',
      });
    }

    req.mongoUser = mongoUser;

    next();
  } catch (error) {
    console.error('❌ ensureMongoUserExists failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during Mongo user check',
    });
  }
};
