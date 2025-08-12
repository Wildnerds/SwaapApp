// Simple AI Controller - Minimal version to test exports
import { Request, Response } from 'express';
import Product from '../models/Product';

// Extend Express Request to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    _id: string;
    email: string;
    role: string;
  };
}

export const sendMessageToAI = async (req: Request, res: Response) => {
  const { message } = req.body;
  
  if (!message || message.trim() === '') {
    return res.status(400).json({ 
      success: false,
      error: 'Message is required' 
    });
  }

  try {
    // Simple response for testing
    const reply = message.toLowerCase().includes('hello') ? 
      'Hi there! How can I help you with Swaap today?' :
      'I understand your question. Our AI service is being enhanced. Please try again or contact human support.';

    res.json({ 
      success: true,
      reply,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ AI response error:', error);
    res.status(500).json({ 
      success: false,
      error: 'AI response failed. Please try again.' 
    });
  }
};

export const findSmartMatches = async (req: AuthenticatedRequest, res: Response) => {
  const { productId, limit = 5 } = req.query;
  const userId = req.user?.id || req.user?._id;

  console.log('🔍 Smart Matches Debug:', {
    hasUser: !!req.user,
    userId: userId,
    userKeys: req.user ? Object.keys(req.user) : 'no user',
    productId: productId
  });

  if (!productId) {
    return res.status(400).json({ 
      success: false,
      error: 'Product ID required'
    });
  }

  try {
    console.log('🤖 Smart Matching Agent request for product:', productId);

    // Find the target product to understand what we're matching against
    const targetProduct = await Product.findById(productId);
    if (!targetProduct) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Find similar products (less restrictive)
    const queryFilters: any = {
      _id: { $ne: productId }
    };
    
    // Only exclude user's own products if userId is available
    if (userId) {
      queryFilters.user = { $ne: userId };
    }
    
    const similarProducts = await Product.find(queryFilters)
    .populate('user')
    .limit(parseInt(limit as string));

    // Convert to match format
    const matches = similarProducts.map(product => ({
      product,
      matchScore: 0.75 + Math.random() * 0.2, // Random score between 0.75-0.95
      reasons: product.category === targetProduct.category ? 
        ['Same category', 'Similar value range'] : 
        ['Similar value range', 'Popular item'],
      distance: 2 + Math.random() * 10, // Random distance 2-12km
      confidence: 0.7 + Math.random() * 0.2,
      suggestedValue: Math.round(product.price * 0.9),
      aiInsights: product.category === targetProduct.category ? 
        'Good category match with fair pricing' : 
        'Alternative option with similar value'
    }));

    res.json({ 
      success: true,
      matches,
      totalFound: matches.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Smart matching error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Smart matching service failed. Please try again.' 
    });
  }
};

export const estimateProductValue = async (req: Request, res: Response) => {
  const { productId } = req.params;

  if (!productId) {
    return res.status(400).json({ 
      success: false,
      error: 'Product ID required' 
    });
  }

  try {
    console.log('💰 Value Assessment Agent request for product:', productId);

    // Mock value assessment
    const originalPrice = 10000;
    const estimatedValue = 7500;
    const difference = originalPrice - estimatedValue;
    const differencePercent = ((difference / originalPrice) * 100).toFixed(1);

    res.json({ 
      success: true,
      originalPrice,
      estimatedValue,
      difference,
      differencePercent,
      recommendation: 'Consider lowering price',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Value assessment error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Value assessment failed. Please try again.' 
    });
  }
};

export const getPersonalizedRecommendations = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || req.user?._id;
  const { limit = 10 } = req.query;

  // If no user is authenticated, provide generic recommendations from real products
  if (!userId) {
    console.log('🛍️ Providing generic recommendations (no user auth)');
    
    try {
      // Fetch some real products from different categories (less restrictive)
      const realProducts = await Product.find({})
      .populate('user')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string) || 10);

      const genericPreferences = {
        categories: ['Electronics', 'Clothing', 'Books'],
        priceRange: { min: 1000, max: 10000 },
        tradingStyle: 'negotiator' as const
      };

      return res.json({ 
        success: true,
        preferences: genericPreferences,
        recommendations: realProducts,
        totalFound: realProducts.length,
        insight: 'Popular items from various categories',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error fetching generic recommendations:', error);
      
      // Fallback to empty recommendations if database fails
      return res.json({ 
        success: true,
        preferences: {
          categories: ['Electronics', 'Clothing', 'Books'],
          priceRange: { min: 1000, max: 10000 },
          tradingStyle: 'negotiator' as const
        },
        recommendations: [],
        totalFound: 0,
        insight: 'No recommendations available at the moment',
        timestamp: new Date().toISOString()
      });
    }
  }

  try {
    console.log('🛍️ Personal Shopping Agent request for user:', userId);

    // For authenticated users, get personalized recommendations (less restrictive)
    const personalizedProducts = await Product.find({
      user: { $ne: userId }
    })
    .populate('user')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit as string) || 10);

    const preferences = {
      categories: ['Electronics', 'Books'],
      priceRange: { min: 1000, max: 15000 },
      tradingStyle: 'negotiator' as const
    };

    res.json({ 
      success: true,
      preferences,
      recommendations: personalizedProducts,
      totalFound: personalizedProducts.length,
      insight: `Based on your negotiator trading style and preference for Electronics, Books items`,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Personal shopping agent error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Personalized recommendations failed. Please try again.' 
    });
  }
};

export const getNegotiationAdvice = async (req: AuthenticatedRequest, res: Response) => {
  const { swapId } = req.params;
  const userId = req.user?.id || req.user?._id;

  if (!swapId || !userId) {
    return res.status(400).json({ 
      success: false,
      error: 'Swap ID and user authentication required' 
    });
  }

  try {
    console.log('🤝 Negotiation Assistant request for swap:', swapId);

    // Mock negotiation advice
    const advice = 'Consider the condition, urgency, and market demand when negotiating.';
    
    res.json({ 
      success: true,
      advice,
      currentOffer: {
        extraPayment: 0,
        offeringValue: 5000,
        requestedValue: 5200
      },
      suggestion: {
        fairExtraPayment: 200,
        reasoning: 'Consider increasing your offer'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Negotiation advice error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Negotiation advice failed. Please try again.' 
    });
  }
};