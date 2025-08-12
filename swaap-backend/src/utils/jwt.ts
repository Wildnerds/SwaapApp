// src/utils/jwt.ts
import jwt from 'jsonwebtoken';

export interface JwtPayload {
  _id: string;
  email: string;
  role?: 'user' | 'admin';
}

// ✅ Ensure JWT_SECRET is loaded from environment and crash early if not set
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

// ✅ Export JWT_SECRET so other files can import it
export { JWT_SECRET };

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: '7d' });
};

export const verifyJwtTokenRaw = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET!);
    
    // ✅ Type guard to check if decoded is an object with our required properties
    if (
      typeof decoded === 'object' && 
      decoded !== null && 
      '_id' in decoded && 
      'email' in decoded
    ) {
      return {
        _id: (decoded as any)._id,
        email: (decoded as any).email,
        role: (decoded as any).role
      };
    }
    
    throw new Error('Invalid token payload structure');
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    throw error;
  }
};