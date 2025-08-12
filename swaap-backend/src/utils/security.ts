// src/utils/security.ts
import helmet from 'helmet';
import crypto from 'crypto';

export const securityMiddleware = [
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
      },
    },
  })
];

export const generateSecureToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

export const hashData = (data: string) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

export const sanitizeFileName = (filename: string) => {
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
};

export const isValidImageType = (mimetype: string) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  return allowedTypes.includes(mimetype);
};