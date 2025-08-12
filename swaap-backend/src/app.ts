// src/app.ts - PRODUCTION READY VERSION
import express from 'express';
import cors from 'cors';
import type { Server as IOServer } from 'socket.io';

// Security and optimization imports
import { applySecurityMiddleware, authLimiter, uploadLimiter } from './middleware/securityMiddleware.js';
import { initializeLogging, requestLoggingMiddleware, errorLoggingMiddleware } from './utils/logger.js';
import { initializePerformanceOptimization, performanceMiddleware } from './utils/performanceOptimizer.js';

// ✅ Import routes
import authRoutes from './routes/authRoutes';
import productRoutes from './routes/product-routes';
import swapRoutes from './routes/swapRoutes';
import adminRoutes from './routes/adminRoutes';
import limitRoutes from './routes/limitRoutes';
import planRoutes from './routes/planRoutes';
import userRoutes from './routes/userRoutes';
import paymentRoutes from './routes/paymentRoutes';
import adminMetricsRoutes from './routes/adminMetricsRoutes';
import notificationRoutes from './routes/notificationRoutes';
import ordersRouter from './routes/order';
import walletRouter from '@/routes/wallet';
import paystackWebhook from './routes/paystackWebhook';
import shipbubbleWebhook from './routes/shipbubbleWebhook';
import shippingRoutes from './routes/shippingRoutes';
import chatRoutes from './routes/chat-routes';
import messageRoutes from './routes/message-routes';
import testRoutes from './routes/testRoutes';
import favoriteRoutes from './routes/favoriteRoutes';
import advertisementRoutes from './routes/advertisement-routes';

// 🆕 NEW: Import complete verification routes
import verificationRoutes from './routes/verificationRoutes';
import reviewRoutes from './routes/reviewRoutes';
import userReviewRoutes from './routes/userReviewRoutes';
import aiRoutes from './routes/aiRoutes';

export function createApp(io: IOServer) {
  const app = express();

  // Initialize logging and performance monitoring
  initializeLogging();
  initializePerformanceOptimization();

  // Apply security middleware (includes CORS, helmet, rate limiting)
  applySecurityMiddleware(app);

  // Performance and request logging
  app.use(performanceMiddleware);
  app.use(requestLoggingMiddleware);

  // ✅ Raw body for webhooks
  app.use('/api/plan/paystack/webhook', express.raw({ type: 'application/json' }));
  app.use('/api/webhook/paystack', express.raw({ type: 'application/json' }), paystackWebhook);
  app.use('/api/webhook/shipbubble', express.raw({ type: 'application/json' }), shipbubbleWebhook);

  // ✅ JSON body parser
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ✅ Attach io to every request
  app.use((req, res, next) => {
    req.io = io;
    next();
  });

  // ✅ Health Check
  app.get('/', (_, res) => res.send('✅ Swaap API is up and running - Enhanced Verification System v2.1'));
  
  // ✅ Render Health Check
  app.get('/health', (_, res) => res.status(200).json({ status: 'OK' }));

  // 🆕 API status endpoint
  app.get('/api/status', (_, res) => {
    res.json({
      status: 'online',
      version: '2.1.0',
      features: {
        socialMediaVerification: true,
        identityVerification: true,
        enhancedAddressVerification: true,
        nominatimGeocoding: true,
        landmarkSupport: true,
        adminPanel: true,
        verificationSync: true
      },
      verificationSystem: {
        maxTrustScore: 150,
        coreVerificationPoints: 25,
        socialBonusPoints: 10,
        supportedSocialPlatforms: ['twitter', 'instagram', 'facebook', 'linkedin', 'tiktok'],
        coreVerificationSteps: ['email', 'phone', 'address', 'identity']
      },
      endpoints: {
        social: '/api/verification/social/*',
        status: '/api/verification/status',
        sync: '/api/verification/sync'
      },
      timestamp: new Date().toISOString()
    });
  });

  // ✅ Config Routes - Must come before other routes
  app.get('/api/config/server-info', (req, res) => {
    const networkInterfaces = require('os').networkInterfaces();
    const getLocalIP = (): string => {
      const results = [];
      for (const name of Object.keys(networkInterfaces)) {
        const net = networkInterfaces[name];
        if (!net) continue;
        for (const netInterface of net) {
          if (netInterface.family === 'IPv4' && !netInterface.internal) {
            results.push(netInterface.address);
          }
        }
      }
      return results[0] || 'localhost';
    };
    
    const LOCAL_IP = getLocalIP();
    const PORT = process.env.PORT || '5002';
    
    res.json({ 
      serverIP: LOCAL_IP,
      port: PORT,
      baseURL: `http://${LOCAL_IP}:${PORT}`,
      timestamp: new Date().toISOString()
    });
  });

  app.get('/api/config/paystack-key', (req, res) => {
    res.json({ paystackKey: process.env.PAYSTACK_PUBLIC_KEY });
  });

  // Apply rate limiting to specific routes
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api/auth/reset-password', authLimiter);
  app.use('/api/products/upload', uploadLimiter);
  app.use('/api/verification/upload', uploadLimiter);

  // ✅ Core Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/swaps', swapRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/limits', limitRoutes);
  app.use('/api/plan', planRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/pay', paymentRoutes);
  app.use('/api/admin/metrics', adminMetricsRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/orders', ordersRouter);
  app.use('/api/wallet', walletRouter);
  app.use('/api/shipping', shippingRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/test', testRoutes);
  app.use('/api/favorites', favoriteRoutes);
  app.use('/api/advertisements', advertisementRoutes);

  // 🆕 NEW: Complete verification system routes
  app.use('/api/verification', verificationRoutes);
  
  // 🆕 NEW: Review system routes
  app.use('/api', reviewRoutes);
  app.use('/api', userReviewRoutes);

  // 🤖 NEW: AI Agent routes
  app.use('/api/ai', aiRoutes);

  // 🆕 CONVENIENCE: Legacy/alternative social verification routes for backward compatibility
  app.use('/api/auth/social-verifications', (req, res, next) => {
    req.url = req.url.replace('/api/auth/social-verifications', '/social');
    verificationRoutes(req, res, next);
  });

  app.use('/api/auth/initiate-social-verification', (req, res, next) => {
    req.url = req.url.replace('/api/auth/initiate-social-verification', '/social/initiate');
    verificationRoutes(req, res, next);
  });

  app.use('/api/auth/complete-social-verification', (req, res, next) => {
    req.url = req.url.replace('/api/auth/complete-social-verification', '/social/complete');
    verificationRoutes(req, res, next);
  });

  app.use('/api/auth/sync-verifications', (req, res, next) => {
    req.url = req.url.replace('/api/auth/sync-verifications', '/sync');
    verificationRoutes(req, res, next);
  });

  // ✅ 404 Handler
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      message: `Route ${req.method} ${req.originalUrl} not found`,
      availableRoutes: {
        core: ['/api/auth', '/api/products', '/api/swaps', '/api/users'],
        verification: [
          '/api/verification/social/initiate',
          '/api/verification/social/complete', 
          '/api/verification/social',
          '/api/verification/status',
          '/api/verification/sync'
        ],
        legacy: [
          '/api/auth/initiate-social-verification',
          '/api/auth/complete-social-verification',
          '/api/auth/social-verifications'
        ],
        utils: ['/api/status', '/api/test']
      },
      hint: 'Check the route spelling and HTTP method. Use /api/verification/* for new verification features.'
    });
  });

  // Error logging middleware
  app.use(errorLoggingMiddleware);

  // ✅ Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {

    // Handle specific error types
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(err.errors).map((e: any) => e.message)
      });
    }

    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    if (err.name === 'MulterError') {
      return res.status(400).json({
        success: false,
        message: 'File upload error',
        details: err.message
      });
    }

    res.status(err.status || 500).json({
      success: false,
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: err.stack,
        url: req.url,
        method: req.method
      })
    });
  });

  return app;
}