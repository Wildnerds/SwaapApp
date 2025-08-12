import { Request, Response, NextFunction } from 'express';

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;
  if (user?.role === 'admin') {
    return next();
  } else {
    return res.status(403).json({ message: 'Admin access required' });
  }
};
