// routes/aiRoutes.ts - AI Agent Routes
import express from 'express';
import { verifyJwtToken } from '../middlewares/verifyJwtToken';
import { 
  sendMessageToAI,
  findSmartMatches,
  estimateProductValue,
  getPersonalizedRecommendations,
  getNegotiationAdvice
} from '../controllers/aiControllerSimple';

const router = express.Router();

// Existing AI chat endpoint
router.post('/chat', sendMessageToAI);

// Smart Matching Agent - Find optimal matches for a product (optional auth)
router.get('/matches', (req, res, next) => {
  // Try to get user info but don't fail if missing
  const authHeader = req.headers.authorization;
  if (authHeader) {
    verifyJwtToken(req, res, next);
  } else {
    next();
  }
}, findSmartMatches);

// Value Assessment Agent - Estimate product value
router.get('/value/:productId', estimateProductValue);

// Personal Shopping Agent - Get personalized recommendations (optional auth)
router.get('/recommendations', (req, res, next) => {
  // Try to get user info but don't fail if missing
  const authHeader = req.headers.authorization;
  if (authHeader) {
    verifyJwtToken(req, res, next);
  } else {
    next();
  }
}, getPersonalizedRecommendations);

// Negotiation Assistant - Get negotiation advice for a swap
router.get('/negotiation/:swapId', verifyJwtToken, getNegotiationAdvice);

// Test endpoint to verify AI service is working
router.get('/status', (req, res) => {
  res.json({
    success: true,
    message: 'AI Agent services are active',
    services: [
      'Smart Matching Agent',
      'Value Assessment Agent', 
      'Personal Shopping Agent',
      'Negotiation Assistant',
      'AI Chat Support'
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;