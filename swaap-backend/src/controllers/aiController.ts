// controllers/aiController.ts - Enhanced with Smart Matching Agent
import { Request, Response } from 'express';
import OpenAI from 'openai';
import Product from '../models/Product';
import User from '../models/User';
import Swap from '../models/Swap';

// Extend Express Request to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    _id: string;
    email: string;
    role: string;
  };
}

// Smart Matching Types
interface TradeMatch {
  product: any;
  matchScore: number;
  reasons: string[];
  distance: number;
  userProfile: any;
  confidence: number;
  suggestedValue: number;
  cashDifference?: number;
  aiInsights: string;
}

interface UserPreference {
  categories: string[];
  priceRange: { min: number; max: number };
  location: { lat: number; lng: number; radius: number };
  tradingStyle: 'quick' | 'negotiator' | 'picky';
}

// Singleton pattern for OpenAI client
class AIService {
  private static instance: AIService;
  private openai: OpenAI | null = null;

  private constructor() {}

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  public getClient(): OpenAI {
    if (!this.openai) {
      const apiKey = process.env.OPENAI_API_KEY;
      
      if (!apiKey) {
        throw new Error('OpenAI API key not configured');
      }
      
      if (!apiKey.startsWith('sk-')) {
        throw new Error('Invalid OpenAI API key format');
      }

      this.openai = new OpenAI({ 
        apiKey,
        timeout: 30000,
      });

      console.log('✅ OpenAI client initialized');
    }

    return this.openai;
  }

  async generateResponse(message: string, systemPrompt?: string): Promise<string> {
    const client = this.getClient();

    const defaultSystemPrompt = `You are a helpful customer support assistant for Swaap, a product exchange platform. 
    Keep responses friendly, concise, and helpful. If users ask about specific account issues, 
    guide them to contact human support for personalized assistance.`;

    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt || defaultSystemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response content from OpenAI');
    }

    return content;
  }

  // Smart Matching Agent - Find optimal trade matches
  async findOptimalMatches(userProduct: any, userId: string, limit: number = 10): Promise<TradeMatch[]> {
    try {
      console.log('🤖 Smart Matching Agent: Finding matches for:', userProduct.title);

      // Get user and their location
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      // Find potential matches
      const potentialMatches = await Product.find({
        user: { $ne: userId },
        type: { $in: ['swap', 'both'] },
        isActive: true
      }).populate('user');

      const matches: TradeMatch[] = [];

      for (const product of potentialMatches) {
        const matchScore = await this.calculateMatchScore(userProduct, product, user);
        
        if (matchScore > 0.3) {
          const distance = this.calculateDistance(
            user.location?.coordinates || [0, 0],
            product.user.location?.coordinates || [0, 0]
          );

          const suggestedValue = await this.estimateValue(product);
          const cashDifference = userProduct.price - suggestedValue;

          // Generate AI insights for this match
          const aiInsights = await this.generateMatchInsights(userProduct, product, matchScore);

          matches.push({
            product,
            matchScore,
            reasons: this.generateMatchReasons(userProduct, product, matchScore),
            distance,
            userProfile: product.user,
            confidence: this.calculateConfidence(matchScore, distance, product.user),
            suggestedValue,
            cashDifference: Math.abs(cashDifference) > 50 ? cashDifference : undefined,
            aiInsights
          });
        }
      }

      return matches
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limit);

    } catch (error) {
      console.error('❌ Smart Matching error:', error);
      return [];
    }
  }

  // Value Assessment Agent - Estimate fair market value
  async estimateValue(product: any): Promise<number> {
    try {
      let estimatedValue = product.price;

      // Category-based adjustments
      const categoryMultipliers: Record<string, number> = {
        'electronics': 0.7, 'books': 0.4, 'clothing': 0.3, 'tools': 0.8,
        'collectibles': 1.2, 'furniture': 0.6, 'automotive': 0.8, 'sports': 0.7
      };

      const multiplier = categoryMultipliers[product.category?.toLowerCase()] || 0.7;
      estimatedValue *= multiplier;

      // Condition adjustment
      const conditionMultipliers: Record<string, number> = {
        'new': 1.0, 'like new': 0.85, 'good': 0.7, 'fair': 0.5, 'poor': 0.3
      };

      const conditionMultiplier = conditionMultipliers[product.condition?.toLowerCase()] || 0.7;
      estimatedValue *= conditionMultiplier;

      // Age factor
      if (product.createdAt) {
        const ageInMonths = (Date.now() - new Date(product.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30);
        const ageMultiplier = Math.max(0.3, 1 - (ageInMonths * 0.05));
        estimatedValue *= ageMultiplier;
      }

      return Math.round(estimatedValue);

    } catch (error) {
      console.error('❌ Value estimation error:', error);
      return product.price * 0.7;
    }
  }

  // Personal Shopping Agent - Learn user preferences
  async learnUserPreferences(userId: string): Promise<UserPreference> {
    try {
      const user = await User.findById(userId);
      const userProducts = await Product.find({ user: userId });
      const userSwaps = await Swap.find({
        $or: [{ offeringUser: userId }, { requestedUser: userId }],
        status: 'completed'
      }).populate('offeringProduct requestedProduct');

      // Analyze categories
      const categories = userProducts.reduce((acc: Record<string, number>, product) => {
        acc[product.category] = (acc[product.category] || 0) + 1;
        return acc;
      }, {});

      // Price range
      const prices = userProducts.map(p => p.price);
      const priceRange = {
        min: Math.min(...prices) || 0,
        max: Math.max(...prices) || 10000
      };

      // Trading style analysis
      const avgNegotiationTime = userSwaps.reduce((sum, swap) => {
        return sum + (new Date(swap.updatedAt).getTime() - new Date(swap.createdAt).getTime());
      }, 0) / (userSwaps.length || 1);

      const tradingStyle = avgNegotiationTime < 86400000 ? 'quick' : 
                          avgNegotiationTime > 604800000 ? 'picky' : 'negotiator';

      return {
        categories: Object.keys(categories).sort((a, b) => categories[b] - categories[a]),
        priceRange,
        location: {
          lat: user.location?.coordinates?.[1] || 0,
          lng: user.location?.coordinates?.[0] || 0,
          radius: 25
        },
        tradingStyle: tradingStyle as 'quick' | 'negotiator' | 'picky'
      };

    } catch (error) {
      console.error('❌ User preference learning error:', error);
      return {
        categories: [], priceRange: { min: 0, max: 10000 },
        location: { lat: 0, lng: 0, radius: 50 }, tradingStyle: 'negotiator'
      };
    }
  }

  // Generate AI-powered insights for matches
  private async generateMatchInsights(productA: any, productB: any, matchScore: number): Promise<string> {
    try {
      const client = this.getClient();
      
      const prompt = `Analyze this trade match:
      Your Item: ${productA.title} (₦${productA.price}, ${productA.category})
      Their Item: ${productB.title} (₦${productB.price}, ${productB.category})
      Match Score: ${(matchScore * 100).toFixed(0)}%
      
      Provide ONE concise insight about why this is a good/bad match (max 25 words):`;

      const response = await client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 50,
        temperature: 0.3,
      });

      return response.choices[0]?.message?.content || 
             `${matchScore > 0.7 ? 'Excellent' : matchScore > 0.5 ? 'Good' : 'Fair'} compatibility based on category and value alignment`;

    } catch (error) {
      console.error('❌ AI insights error:', error);
      return `${matchScore > 0.7 ? 'High' : 'Moderate'} match potential`;
    }
  }

  // Helper methods
  private async calculateMatchScore(productA: any, productB: any, user: any): Promise<number> {
    let score = 0;

    // Category compatibility (40%)
    if (productA.category === productB.category) score += 0.4;
    else if (this.areCompatibleCategories(productA.category, productB.category)) score += 0.2;

    // Price range compatibility (30%)
    const priceDifference = Math.abs(productA.price - productB.price);
    const avgPrice = (productA.price + productB.price) / 2;
    const priceCompatibility = Math.max(0, 1 - (priceDifference / avgPrice));
    score += priceCompatibility * 0.3;

    // User rating (20%)
    const userRating = productB.user.averageRating || 3;
    score += (userRating / 5) * 0.2;

    // Recency (10%)
    const daysSincePosted = (Date.now() - new Date(productB.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 1 - (daysSincePosted / 30));
    score += recencyScore * 0.1;

    return Math.min(1, score);
  }

  private areCompatibleCategories(catA: string, catB: string): boolean {
    const compatibility: Record<string, string[]> = {
      'electronics': ['gadgets', 'gaming', 'computers'],
      'clothing': ['fashion', 'accessories'],
      'books': ['media', 'education'],
      'tools': ['hardware', 'automotive'],
      'sports': ['fitness', 'outdoor'],
      'collectibles': ['antiques', 'art']
    };
    return compatibility[catA]?.includes(catB) || compatibility[catB]?.includes(catA) || false;
  }

  private generateMatchReasons(productA: any, productB: any, score: number): string[] {
    const reasons = [];
    if (productA.category === productB.category) reasons.push(`Same category: ${productA.category}`);
    const priceDiff = Math.abs(productA.price - productB.price);
    if (priceDiff < productA.price * 0.2) reasons.push('Similar value range');
    if (score > 0.8) reasons.push('Excellent compatibility');
    else if (score > 0.6) reasons.push('Good match potential');
    else if (score > 0.4) reasons.push('Fair trade opportunity');
    return reasons;
  }

  private calculateDistance(coords1: number[], coords2: number[]): number {
    const [lng1, lat1] = coords1; const [lng2, lat2] = coords2;
    if (!lat1 || !lng1 || !lat2 || !lng2) return 999;
    
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
              Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return 6371 * c; // Earth radius in km
  }

  private deg2rad(deg: number): number { return deg * (Math.PI/180); }

  private calculateConfidence(matchScore: number, distance: number, userProfile: any): number {
    let confidence = matchScore;
    if (distance > 50) confidence *= 0.7; else if (distance > 20) confidence *= 0.85;
    if (userProfile.averageRating > 4) confidence *= 1.1;
    else if (userProfile.averageRating < 3) confidence *= 0.8;
    return Math.min(1, confidence);
  }
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
    // Custom greeting when chat first opens
    if (message.toLowerCase().trim() === 'start') {
      return res.json({ 
        success: true,
        reply: 'Hi there! 👋 Welcome to Swaap support. How can I help you today?' 
      });
    }

    console.log('🤖 Processing AI message:', message);

    const aiService = AIService.getInstance();
    const reply = await aiService.generateResponse(message);

    console.log('✅ AI response generated');

    res.json({ 
      success: true,
      reply,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ AI response error:', error);

    // Handle specific errors
    if (error.message?.includes('API key')) {
      return res.status(500).json({ 
        success: false,
        error: 'AI service configuration error' 
      });
    }

    if (error.message?.includes('Network')) {
      return res.status(503).json({ 
        success: false,
        error: 'AI service temporarily unavailable' 
      });
    }

    res.status(500).json({ 
      success: false,
      error: 'AI response failed. Please try again.' 
    });
  }
};

// NEW AI AGENT ENDPOINTS

// Smart Matching Agent endpoint
export const findSmartMatches = async (req: AuthenticatedRequest, res: Response) => {
  const { productId, limit = 5 } = req.query;
  const userId = req.user?.id;

  if (!productId || !userId) {
    return res.status(400).json({ 
      success: false,
      error: 'Product ID and user authentication required' 
    });
  }

  try {
    console.log('🤖 Smart Matching Agent request for product:', productId);

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ 
        success: false,
        error: 'Product not found' 
      });
    }

    const aiService = AIService.getInstance();
    const matches = await aiService.findOptimalMatches(product, userId, parseInt(limit as string));

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

// Value Assessment Agent endpoint
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

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ 
        success: false,
        error: 'Product not found' 
      });
    }

    const aiService = AIService.getInstance();
    const estimatedValue = await aiService.estimateValue(product);

    res.json({ 
      success: true,
      originalPrice: product.price,
      estimatedValue,
      difference: product.price - estimatedValue,
      differencePercent: ((product.price - estimatedValue) / product.price * 100).toFixed(1),
      recommendation: product.price > estimatedValue * 1.2 ? 'Consider lowering price' : 
                     product.price < estimatedValue * 0.8 ? 'Good value pricing' : 
                     'Fair market pricing',
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

// Personal Shopping Agent endpoint
export const getPersonalizedRecommendations = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { limit = 10 } = req.query;

  if (!userId) {
    return res.status(401).json({ 
      success: false,
      error: 'User authentication required' 
    });
  }

  try {
    console.log('🛍️ Personal Shopping Agent request for user:', userId);

    const aiService = AIService.getInstance();
    const preferences = await aiService.learnUserPreferences(userId);

    // Find products matching user preferences
    const query: any = {
      user: { $ne: userId },
      type: { $in: ['swap', 'both'] },
      isActive: true
    };

    // Add category filter if user has preferences
    if (preferences.categories.length > 0) {
      query.category = { $in: preferences.categories.slice(0, 3) }; // Top 3 categories
    }

    // Add price range filter
    if (preferences.priceRange.min > 0 || preferences.priceRange.max < 10000) {
      query.price = {
        $gte: preferences.priceRange.min * 0.5, // Expand range for more options
        $lte: preferences.priceRange.max * 1.5
      };
    }

    const products = await Product.find(query)
      .populate('user')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string));

    res.json({ 
      success: true,
      preferences,
      recommendations: products,
      totalFound: products.length,
      insight: `Based on your ${preferences.tradingStyle} trading style and preference for ${preferences.categories.join(', ')} items`,
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

// Negotiation Assistant endpoint
export const getNegotiationAdvice = async (req: AuthenticatedRequest, res: Response) => {
  const { swapId } = req.params;
  const userId = req.user?.id;

  if (!swapId || !userId) {
    return res.status(400).json({ 
      success: false,
      error: 'Swap ID and user authentication required' 
    });
  }

  try {
    console.log('🤝 Negotiation Assistant request for swap:', swapId);

    const swap = await Swap.findById(swapId)
      .populate('offeringProduct requestedProduct offeringUser requestedUser');

    if (!swap) {
      return res.status(404).json({ 
        success: false,
        error: 'Swap not found' 
      });
    }

    const aiService = AIService.getInstance();
    
    // Generate negotiation advice using OpenAI
    const client = aiService.getClient();
    const prompt = `As a trade negotiation expert, analyze this swap:
    Offering: ${swap.offeringProduct?.title} (₦${swap.offeringProduct?.price})
    Requested: ${swap.requestedProduct?.title} (₦${swap.requestedProduct?.price})
    Extra payment: ₦${swap.extraPayment || 0}
    
    Provide ONE practical negotiation tip (max 30 words):`;

    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 60,
      temperature: 0.4,
    });

    const advice = response.choices[0]?.message?.content || 
                  'Consider the condition, urgency, and market demand when negotiating.';

    // Calculate fair value suggestion
    const offeringValue = await aiService.estimateValue(swap.offeringProduct);
    const requestedValue = await aiService.estimateValue(swap.requestedProduct);
    const suggestedPayment = Math.max(0, requestedValue - offeringValue);

    res.json({ 
      success: true,
      advice,
      currentOffer: {
        extraPayment: swap.extraPayment || 0,
        offeringValue,
        requestedValue
      },
      suggestion: {
        fairExtraPayment: suggestedPayment,
        reasoning: suggestedPayment < (swap.extraPayment || 0) ? 
                   'Your offer seems generous' : 
                   suggestedPayment > (swap.extraPayment || 0) ? 
                   'Consider increasing your offer' : 
                   'Your offer is fair'
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