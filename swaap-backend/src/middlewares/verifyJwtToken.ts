import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '@/utils/jwt';

// ✅ Enhanced JwtPayload interface
interface JwtPayload {
  _id: string;
  email: string;
  role: 'user' | 'admin';
  iat?: number; // issued at
  exp?: number; // expires at
}

// ✅ Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: string;
        email: string;
        role: 'user' | 'admin';
      };
    }
  }
}

// ✅ Custom AuthenticatedRequest type for routes that require authentication
export interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    email: string;
    role: 'user' | 'admin';
  };
}

export const verifyJwtToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    
    // ✅ Check for authorization header
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ 
        success: false,
        message: 'Unauthorized: No token provided' 
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    
    // ✅ Check for token existence
    if (!token) {
      res.status(401).json({ 
        success: false,
        message: 'Unauthorized: Token not found' 
      });
      return;
    }
    
    // ✅ Check for JWT_SECRET
    if (!JWT_SECRET) {
      console.error('❌ JWT_SECRET is not defined in environment variables');
      res.status(500).json({ 
        success: false,
        message: 'Server configuration error' 
      });
      return;
    }
    
    // ✅ Verify and decode token
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    
    // ✅ Validate decoded payload
    if (!decoded._id || !decoded.email || !decoded.role) {
      res.status(401).json({ 
        success: false,
        message: 'Unauthorized: Invalid token payload' 
      });
      return;
    }

    // ✅ Set user on request object
    req.user = {
      _id: decoded._id,
      email: decoded.email,
      role: decoded.role,
    };

    console.log(`✅ JWT verified for user: ${decoded.email} (${decoded.role})`);
    next();
    
  } catch (error: any) {
    console.error('❌ JWT verification error:', error.message);
    
    // ✅ Handle specific JWT errors
    let message = 'Unauthorized: Invalid or expired token';
    
    if (error.name === 'TokenExpiredError') {
      message = 'Unauthorized: Token has expired';
    } else if (error.name === 'JsonWebTokenError') {
      message = 'Unauthorized: Invalid token format';
    } else if (error.name === 'NotBeforeError') {
      message = 'Unauthorized: Token not active yet';
    }
    
    res.status(401).json({ 
      success: false,
      message,
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

// ✅ Helper function to create a type-safe authenticated route handler
export const createAuthenticatedHandler = (
  handler: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<any> | any
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // At this point, verifyJwtToken middleware should have already run
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required' 
      });
    }
    
    try {
      // Type assertion is safe here because we've checked req.user exists
      await handler(req as AuthenticatedRequest, res, next);
    } catch (error: any) {
      console.error('Route handler error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Internal server error',
          ...(process.env.NODE_ENV === 'development' && { error: error.message })
        });
      }
    }
  };
};

// ✅ Alternative: Middleware that guarantees req.user exists
export const requireAuth = (
  req: Request, 
  res: Response, 
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ 
      success: false,
      message: 'Authentication required - user not found in request' 
    });
    return;
  }
  next();
};