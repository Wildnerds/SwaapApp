import { Request } from 'express';

export interface DecodedToken {
  _id: string; // 👈 use _id to match your database schema
  email: string;
  role: 'user' | 'admin';
}

export interface AuthenticatedRequest extends Request {
  user?: {
    _id: string;
    email: string;
    role: 'user' | 'admin'; // ✅ remove optional `?`
  };
}
