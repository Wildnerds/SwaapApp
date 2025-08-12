// src/middleware/authCompatible.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// ✅ Enhanced JwtPayload interface
interface JwtPayload {
  _id: string;
  email: string;
  role: 'user' | 'admin';
  iat?: number;
  exp?: number;
}

// ✅ AuthRequest interface that matches your existing structure
interface AuthRequest extends Request {
  user?: {
    _id: string;
    email: string;
    role: 'user' | 'admin';
  };
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ 
        success: false,
        message: 'Unauthorized: No token provided' 
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      res.status(401).json({ 
        success: false,
        message: 'Unauthorized: Token not found' 
      });
      return;
    }
    
    // ✅ Use environment variable directly
    const JWT_SECRET = process.env.JWT_SECRET;
    
    if (!JWT_SECRET) {
      console.error('❌ JWT_SECRET is not defined in environment variables');
      res.status(500).json({ 
        success: false,
        message: 'Server configuration error' 
      });
      return;
    }
    
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    
    if (!decoded._id || !decoded.email || !decoded.role) {
      res.status(401).json({ 
        success: false,
        message: 'Unauthorized: Invalid token payload' 
      });
      return;
    }

    // ✅ Set user on request object to match your structure
    req.user = {
      _id: decoded._id,
      email: decoded.email,
      role: decoded.role,
    };

    console.log(`✅ JWT verified for user: ${decoded.email} (${decoded.role})`);
    next();
    
  } catch (error: any) {
    console.error('❌ JWT verification error:', error.message);
    
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

export const authenticateAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  // This assumes authenticateToken has already run
  if (!req.user) {
    res.status(401).json({ 
      success: false,
      message: 'Authentication required' 
    });
    return;
  }
  
  if (req.user.role !== 'admin') {
    res.status(403).json({ 
      success: false,
      message: 'Admin access required' 
    });
    return;
  }
  
  next();
};