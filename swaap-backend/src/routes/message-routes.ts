import express from 'express';
import dotenv from 'dotenv';
import Message from '../models/Message';
import Chat from '../models/Chat';

dotenv.config();
const router = express.Router();

// Enhanced AI response with conversation history
const getAIResponse = async (message: string, conversationHistory: any[] = []): Promise<string> => {
  const useOpenAI = process.env.USE_OPENAI === 'true' && process.env.OPENAI_API_KEY;
  
  if (!useOpenAI) {
    return getEnhancedMockResponse(message, conversationHistory);
  }

  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 15000,
    });

    // Build conversation context
    const messages = [
      { 
        role: 'system', 
        content: `You are a helpful customer support assistant for Swaap, a product exchange platform. 
        Provide detailed, helpful responses. If users ask about complex account issues, billing, disputes, or need human assistance, 
        suggest they escalate to a human agent. You can provide comprehensive information about:
        - Platform features and navigation
        - Creating and managing product listings
        - The swap/exchange process
        - Basic account settings
        - General troubleshooting
        - Safety tips and best practices
        
        For sensitive issues like payments, disputes, account problems, or when users seem frustrated, 
        recommend human support. Be conversational and remember the context from previous messages.
        Use emojis appropriately to make responses engaging.`
      }
    ];

    // Add conversation history (last 6 messages for context)
    const recentHistory = conversationHistory.slice(-6);
    recentHistory.forEach(msg => {
      if (msg.senderId === 'support') {
        messages.push({ role: 'assistant', content: msg.text });
      } else if (msg.senderId !== 'system') {
        messages.push({ role: 'user', content: msg.text });
      }
    });

    // Add current message
    messages.push({ role: 'user', content: message });

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      max_tokens: 400,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    return content || getEnhancedMockResponse(message, conversationHistory);

  } catch (error: any) {
    console.error('❌ OpenAI error:', error.code || error.message);
    return getEnhancedMockResponse(message, conversationHistory);
  }
};

// Enhanced mock responses with conversation awareness
const getEnhancedMockResponse = (message: string, history: any[] = []): string => {
  const lowerMessage = message.toLowerCase();
  const isFirstMessage = history.filter(h => h.senderId !== 'system').length === 0;
  
  // Check if user is asking for human help
  if (lowerMessage.includes('human') || lowerMessage.includes('agent') || lowerMessage.includes('person') || lowerMessage.includes('escalate')) {
    return "I understand you'd like to speak with a human agent! 👤 Let me connect you with our support team right away. They'll be able to provide personalized assistance with your specific needs.\n\n🔄 Transferring your conversation to a human agent now...";
  }
  
  // Enhanced first-time greeting
  if (isFirstMessage || lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return `Hello! 👋 Welcome to Swaap support. I'm your AI assistant, and I'm here to help you with any questions about our product exchange platform.

**I can help you with:**
• 📱 Platform navigation and features
• 📦 Creating and managing your product listings  
• 🔄 Understanding the swap process
• ⚙️ Basic account settings and profile management
• 🛠️ Troubleshooting common issues
• 💡 Tips for successful swapping

**For more complex issues** like account problems, payments, disputes, or if you need personalized assistance, I can connect you with a human agent anytime.

What would you like help with today? Feel free to ask me anything! 😊`;
  }

  // Check for frustration or repeated issues
  if (lowerMessage.includes('still') || lowerMessage.includes('not working') || lowerMessage.includes('problem persists') || lowerMessage.includes('frustrated')) {
    return "I'm really sorry the issue is still occurring! 😔 I can see this is frustrating for you. Since we've tried the basic troubleshooting steps, let me connect you with one of our human support agents right away.\n\n👨‍💼 They have access to additional tools and your account details, so they can investigate this thoroughly and provide a complete solution.\n\nWould you like me to transfer you to a human agent now? Just say 'yes' or 'connect me to an agent'.";
  }

  // Detailed responses for common topics
  if (lowerMessage.includes('swap') || lowerMessage.includes('exchange') || lowerMessage.includes('trade')) {
    return `Great question about swapping! 🔄 Here's a comprehensive guide to the Swaap exchange process:

**🔍 Step 1: Browse & Discover**
• Use filters to find items you're interested in
• Check item condition and photos carefully
• Read the description and seller's swap preferences

**📩 Step 2: Initiate Contact**  
• Send a swap request or message the owner
• Be polite and specific about what you're offering
• Ask any questions about condition, pickup, etc.

**💬 Step 3: Negotiate Terms**
• Discuss the exchange details
• Agree on meetup location and time
• Confirm both items' condition and value

**🤝 Step 4: Safe Exchange**
• Meet in a public, well-lit location
• Inspect both items before swapping
• Complete the exchange and confirm in the app

**⭐ Step 5: Leave Feedback**
• Rate your experience
• Leave honest feedback for future swappers
• Build your reputation on the platform

**💡 Pro Tips:**
• Always meet in public places
• Trust your instincts about people and deals
• Take photos of items before listing
• Be responsive to messages

Need help with any specific step, or would you like me to connect you with an agent for personalized guidance?`;
  }

  if (lowerMessage.includes('list') || lowerMessage.includes('post') || lowerMessage.includes('sell') || lowerMessage.includes('upload')) {
    return `Perfect! Creating a great listing is key to successful swapping. 📦 Here's how to make your items shine:

**📸 Taking Great Photos:**
• Use natural lighting (near a window is best)
• Show multiple angles of your item
• Include close-ups of any wear or damage
• Clean the item first for best presentation

**✍️ Writing Your Description:**
• Be honest about condition (excellent, good, fair)
• Include brand, size, color, and age
• Mention any flaws or missing pieces
• Add why you're swapping it

**🎯 Setting Swap Preferences:**
• Specify what you're looking for in return
• Set a fair value range
• Choose your preferred swap locations
• Indicate if you're open to negotiations

**🚀 Boosting Visibility:**
• Use relevant tags and categories
• Post during peak hours (evenings/weekends)
• Update your listing if it's not getting interest
• Share in relevant swap groups

**⚠️ Safety Reminders:**
• Don't include personal information in listings
• Use the app's messaging system
• Meet in public places only

Want specific help with any part of this process? I'm here to guide you through it step by step!`;
  }

  if (lowerMessage.includes('account') || lowerMessage.includes('profile') || lowerMessage.includes('login') || lowerMessage.includes('password')) {
    return `I can help with basic account questions! 👤 Here are solutions for common account issues:

**🔐 Login Problems:**
• Double-check your email and password
• Try the "Forgot Password" link for a reset
• Clear your app cache or restart the app
• Make sure you're using the correct email address
• Check your spam folder for verification emails

**📝 Profile Management:**
• Go to Settings > Profile to update info
• Upload a clear, friendly profile photo
• Add a brief bio to build trust
• Verify your email and phone number
• Set your location for local swaps

**🔒 Privacy & Security:**
• Review who can see your listings
• Manage your message notifications
• Set location sharing preferences
• Control who can contact you directly
• Enable two-factor authentication if available

**⚠️ For Sensitive Issues:**
If you're experiencing persistent login problems, need to change your email/phone number, have security concerns, or suspect unauthorized access, I'd strongly recommend speaking with our human support team. They can securely access your account and make necessary changes.

Would you like me to connect you with a human agent for account-specific help?`;
  }

  if (lowerMessage.includes('payment') || lowerMessage.includes('money') || lowerMessage.includes('fee') || lowerMessage.includes('cost') || lowerMessage.includes('premium')) {
    return `For payment and billing questions, our human support team is the best resource! 💳 They can provide secure, detailed assistance with:

**💰 Pricing & Fees:**
• Platform usage costs
• Premium membership benefits
• Transaction fees (if any)
• How billing works

**💳 Payment Methods:**
• Adding or updating payment info
• Supported payment options
• International payment support
• Payment security measures

**🔄 Billing Issues:**
• Subscription management
• Refund requests and policies
• Billing disputes
• Invoice questions

**🛡️ Security & Fraud:**
• Suspicious charges
• Payment protection
• Dispute resolution
• Account security

Since payment information is sensitive and account-specific, I'll connect you with a human agent who can securely access your billing details and provide personalized assistance.

Would you like me to transfer you to a human agent now?`;
  }

  // Default helpful response
  const defaultResponses = [
    "Thanks for your question! 😊 I want to make sure you get the best help possible. Could you provide a bit more detail about what you're trying to do? If it's something complex, I can also connect you with a human agent for personalized assistance.",
    
    "I'm here to help! 🚀 Based on your question, I can provide some general guidance, but if you need detailed support or account-specific help, our human agents would be better equipped to assist you. What would you prefer?",
    
    "That's a great question! 💭 I can offer some basic guidance, but for the most accurate and detailed help, especially with account-specific issues, I'd recommend speaking with one of our human support agents. They can provide personalized assistance. Should I connect you with them?"
  ];
  
  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
};

// Check if conversation needs human agent
const shouldEscalateToHuman = (message: string, chatHistory: any[]): boolean => {
  const lowerMessage = message.toLowerCase();
  
  // Direct requests for human help
  if (lowerMessage.includes('human') || lowerMessage.includes('agent') || lowerMessage.includes('person')) {
    return true;
  }
  
  // Complex issues that need human intervention
  const complexKeywords = ['billing', 'charge', 'refund', 'dispute', 'ban', 'suspended', 'fraud', 'legal', 'urgent'];
  if (complexKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return true;
  }
  
  // Multiple messages without resolution
  if (chatHistory.length >= 6) {
    const recentUserMessages = chatHistory.filter(msg => msg.senderId !== 'support').slice(-3);
    const hasRepeatIssues = recentUserMessages.some(msg => 
      msg.text.toLowerCase().includes('still') || 
      msg.text.toLowerCase().includes('not working') ||
      msg.text.toLowerCase().includes('problem')
    );
    if (hasRepeatIssues) return true;
  }
  
  return false;
};

// 📩 Helper to generate a consistent conversationId for DMs
const getConversationId = (userId1: string, userId2: string) => {
  return [userId1, userId2].sort().join('_');
};

// 🔹 GET messages for a conversation (UPDATED WITH DEBUG)
router.get('/:conversationId', async (req, res) => {
  const { conversationId } = req.params;

  // 🔍 DEBUG LOGGING
  console.log('🔍 DEBUG - GET Request Details:');
  console.log('  - Requested conversationId:', conversationId);
  console.log('  - Request timestamp:', new Date().toISOString());

  try {
    const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });
    
    // 🔍 DEBUG THE RESULTS
    console.log('🔍 DEBUG - Database results:');
    console.log('  - Total messages found:', messages.length);
    console.log('  - Messages preview:', messages.map(m => ({
      _id: m._id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      textPreview: m.text.substring(0, 50) + '...',
      createdAt: m.createdAt
    })));

    // 🔍 CHECK FOR ALL CONVERSATIONS IN DB
    const allConversations = await Message.distinct('conversationId');
    console.log('🔍 DEBUG - All conversation IDs in database:', allConversations);

    res.status(200).json({
      success: true,
      messages,
      count: messages.length,
      debug: {
        requestedConversationId: conversationId,
        allConversations: allConversations,
        foundMessages: messages.length
      }
    });
  } catch (err) {
    console.error('[GET /:conversationId] ❌ Error fetching messages:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch messages' 
    });
  }
});

// 🔹 POST a new message (FIXED CHAT QUERY)
router.post('/', async (req, res) => {
  const { senderId, receiverId, text, escalateToHuman } = req.body;

  // 🔍 DEBUG LOGGING
  console.log('🔍 DEBUG - POST Request Details:');
  console.log('  - senderId:', senderId);
  console.log('  - receiverId:', receiverId);
  console.log('  - text length:', text?.length);
  console.log('  - Request timestamp:', new Date().toISOString());

  if (!senderId || !text) {
    return res.status(400).json({ 
      success: false,
      error: 'senderId and text are required' 
    });
  }

  if (!text.trim()) {
    return res.status(400).json({ 
      success: false,
      error: 'Message text cannot be empty' 
    });
  }

  let conversationId = `support_${senderId}`;
  let participants = [senderId];

  // 🔍 DEBUG CONVERSATION ID CREATION
  console.log('🔍 DEBUG - Conversation ID creation:');
  console.log('  - Generated conversationId:', conversationId);
  console.log('  - participants:', participants);

  if (receiverId && receiverId !== 'support') {
    conversationId = getConversationId(senderId, receiverId);
    participants.push(receiverId);
    console.log('🔍 DEBUG - Updated for P2P chat:');
    console.log('  - New conversationId:', conversationId);
    console.log('  - New participants:', participants);
  }

  try {
    console.log('💬 Processing message:', {
      senderId,
      receiverId,
      conversationId,
      textLength: text.length
    });

    // Create user message
    const userMessage = await Message.create({ conversationId, senderId, text });

    // 🔍 DEBUG MESSAGE CREATION
    console.log('🔍 DEBUG - Message created in database:');
    console.log('  - Message ID:', userMessage._id);
    console.log('  - Stored conversationId:', userMessage.conversationId);
    console.log('  - Stored senderId:', userMessage.senderId);
    console.log('  - Created at:', userMessage.createdAt);

    // Get conversation history for context
    const conversationHistory = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .limit(10);

    // 🔍 DEBUG CONVERSATION HISTORY
    console.log('🔍 DEBUG - Conversation history loaded:');
    console.log('  - History count:', conversationHistory.length);
    console.log('  - History conversation IDs:', [...new Set(conversationHistory.map(m => m.conversationId))]);

    // ✅ FIXED: Use proper chat query that prevents cross-contamination
    let chatQuery;
    if (receiverId === 'support') {
      // For support chats, use specific query to prevent matching other users' chats
      chatQuery = { 
        participants: [senderId], // Exact match for single user support chat
        isSupportChat: true 
      };
    } else {
      // For regular P2P chats
      chatQuery = { 
        participants: { $all: participants, $size: participants.length }
      };
    }

    console.log('🔍 DEBUG - Chat query:', chatQuery);

    // Update chat record with the FIXED query
    const chat = await Chat.findOneAndUpdate(
      chatQuery,
      {
        $setOnInsert: { 
          participants,
          isSupportChat: receiverId === 'support'
        },
        $set: {
          lastMessage: {
            text,
            senderId,
            createdAt: userMessage.createdAt,
          },
          needsHumanAgent: escalateToHuman || shouldEscalateToHuman(text, conversationHistory),
          status: escalateToHuman || shouldEscalateToHuman(text, conversationHistory) ? 'waiting_for_agent' : 'active',
          updatedAt: new Date()
        },
      },
      { upsert: true, new: true }
    );

    console.log('💾 DEBUG - Chat record updated:', {
      chatId: chat._id,
      participants: chat.participants,
      isSupportChat: chat.isSupportChat,
      needsHumanAgent: chat.needsHumanAgent
    });

    // Emit new message event
    req.io?.to(conversationId).emit('newMessage', userMessage);

    let aiMessage = null;

    if (conversationId.startsWith('support_') && !chat.needsHumanAgent) {
      // Generate AI response with conversation context
      try {
        console.log('🤖 Generating AI response...');
        const aiReply = await getAIResponse(text, conversationHistory);

        aiMessage = await Message.create({
          conversationId,
          senderId: 'support',
          text: aiReply,
        });

        console.log('🔍 DEBUG - AI message created:', {
          messageId: aiMessage._id,
          conversationId: aiMessage.conversationId,
          senderId: aiMessage.senderId
        });

        req.io?.to(conversationId).emit('newMessage', aiMessage);

        // Update chat's last message using the SAME fixed query
        await Chat.findOneAndUpdate(
          chatQuery,
          {
            $set: {
              lastMessage: {
                text: aiReply,
                senderId: 'support',
                createdAt: aiMessage.createdAt,
              },
            },
          }
        );

        console.log('✅ AI response sent successfully');

      } catch (error: any) {
        console.error('❌ AI response error:', error);
        
        // Emergency fallback
        const fallbackMessage = "Thank you for your message! 🙏 I'm currently experiencing some technical difficulties, but our human support team is standing by to help you. They'll respond to your query as soon as possible.";

        aiMessage = await Message.create({
          conversationId,
          senderId: 'support',
          text: fallbackMessage,
        });

        req.io?.to(conversationId).emit('newMessage', aiMessage);
      }
    } else if (chat.needsHumanAgent) {
      // Human agent needed - notify admin/agents
      const humanNotification = await Message.create({
        conversationId,
        senderId: 'system',
        text: '🔔 This conversation has been escalated to human support. An agent will join shortly.',
      });

      req.io?.to(conversationId).emit('newMessage', humanNotification);
      
      // Notify admin dashboard or agent interface
      req.io?.to('admin-room').emit('humanAgentRequired', {
        conversationId,
        userId: senderId,
        lastMessage: text,
        urgency: 'normal'
      });

      console.log('📞 Conversation escalated to human agent');
    }

    res.status(201).json({
      success: true,
      message: userMessage,
      aiResponse: aiMessage,
      conversationId,
      needsHumanAgent: chat.needsHumanAgent,
      debug: {
        conversationId,
        chatQuery,
        chatId: chat._id
      }
    });

  } catch (err: any) {
    console.error('[POST /] ❌ Error sending message:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to send message',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// 🔹 Escalate to human agent (FIXED)
router.post('/:conversationId/escalate', async (req, res) => {
  const { conversationId } = req.params;
  const { userId, reason } = req.body;

  try {
    console.log('🔄 Escalating conversation to human agent:', conversationId);

    // ✅ FIXED: Use specific query for support chats
    const chatQuery = {
      participants: [userId],
      isSupportChat: true
    };

    console.log('🔍 DEBUG - Escalation chat query:', chatQuery);

    const updatedChat = await Chat.findOneAndUpdate(
      chatQuery,
      { 
        $set: { 
          needsHumanAgent: true,
          status: 'waiting_for_agent',
          escalationReason: reason || 'User requested human assistance',
          escalatedAt: new Date()
        } 
      },
      { new: true }
    );

    if (!updatedChat) {
      console.log('❌ No chat found for escalation:', chatQuery);
      return res.status(404).json({
        success: false,
        error: 'Chat not found for escalation'
      });
    }

    console.log('✅ Chat escalated:', updatedChat._id);

    // Add escalation message
    const escalationMessage = await Message.create({
      conversationId,
      senderId: 'system',
      text: '👤 You\'ve been connected to our human support team. An agent will join this conversation shortly to provide personalized assistance.',
    });

    // Notify agents
    req.io?.to('admin-room').emit('humanAgentRequired', {
      conversationId,
      userId,
      reason,
      urgency: 'high'
    });

    req.io?.to(conversationId).emit('newMessage', escalationMessage);

    console.log('✅ Conversation successfully escalated');

    res.json({
      success: true,
      message: 'Conversation escalated to human agent',
      escalationMessage
    });

  } catch (error: any) {
    console.error('❌ Escalation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to escalate conversation'
    });
  }
});

// 🔹 Agent join conversation
router.post('/:conversationId/agent-join', async (req, res) => {
  const { conversationId } = req.params;
  const { agentId, agentName } = req.body;

  try {
    console.log('👨‍💼 Agent joining conversation:', { conversationId, agentId, agentName });

    // Mark conversation as having human agent
    await Chat.findOneAndUpdate(
      { _id: conversationId },
      { 
        $set: { 
          hasHumanAgent: true,
          needsHumanAgent: false,
          status: 'with_agent',
          agentId,
          agentName,
          agentJoinedAt: new Date()
        } 
      }
    );

    // Add agent introduction message
    const agentMessage = await Message.create({
      conversationId,
      senderId: agentId,
      text: `Hello! I'm ${agentName} from the Swaap support team. 👋 I've taken over this conversation and I'm here to help you with your questions. How can I assist you today?`,
    });

    req.io?.to(conversationId).emit('newMessage', agentMessage);
    req.io?.to(conversationId).emit('agentJoined', { agentName });

    console.log('✅ Agent successfully joined conversation');

    res.json({
      success: true,
      message: 'Agent successfully joined conversation',
      agentMessage
    });

  } catch (error: any) {
    console.error('❌ Agent join error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to join conversation'
    });
  }
});

// 🔹 Test AI connection endpoint
router.post('/test-ai', async (req, res) => {
  try {
    console.log('🧪 Testing AI system...');
    
    const testResponse = await getAIResponse('Hello, this is a test message');

    console.log('✅ AI test completed');

    res.json({
      success: true,
      message: 'AI system working correctly',
      response: testResponse,
      usingOpenAI: process.env.USE_OPENAI === 'true' && !!process.env.OPENAI_API_KEY
    });

  } catch (error: any) {
    console.error('❌ AI test failed:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      debug: 'AI system test failed'
    });
  }
});

router.get('/debug/conversations', async (req, res) => {
  try {
    console.log('🔍 DEBUG - Fetching all conversations...');
    
    // Get all messages grouped by conversation
    const allMessages = await Message.find({}).sort({ createdAt: 1 });
    
    // Group by conversation ID
    const conversationGroups = {};
    allMessages.forEach(msg => {
      if (!conversationGroups[msg.conversationId]) {
        conversationGroups[msg.conversationId] = [];
      }
      conversationGroups[msg.conversationId].push({
        _id: msg._id,
        senderId: msg.senderId,
        text: msg.text.substring(0, 100),
        createdAt: msg.createdAt
      });
    });
    
    // Get all chats
    const allChats = await Chat.find({});
    
    console.log('🔍 DEBUG - Database state:');
    console.log('  - Total messages:', allMessages.length);
    console.log('  - Total conversations:', Object.keys(conversationGroups).length);
    console.log('  - Conversation IDs:', Object.keys(conversationGroups));
    console.log('  - Total chats:', allChats.length);
    
    res.json({
      success: true,
      debug: {
        totalMessages: allMessages.length,
        totalConversations: Object.keys(conversationGroups).length,
        conversationIds: Object.keys(conversationGroups),
        conversationGroups: conversationGroups,
        allChats: allChats.map(chat => ({
          _id: chat._id,
          participants: chat.participants,
          isSupportChat: chat.isSupportChat,
          lastMessage: chat.lastMessage
        }))
      }
    });
  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ADD THIS TO YOUR BACKEND - Auto-cleanup system

// Add this function to your message routes file or create a separate cleanup service
const cleanupOldConversations = async () => {
  try {
    console.log('🧹 Starting cleanup of old conversations...');
    
    // Calculate date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    console.log('🧹 Cleaning conversations older than:', sevenDaysAgo.toISOString());
    
    // Find old messages (older than 7 days)
    const oldMessages = await Message.find({
      createdAt: { $lt: sevenDaysAgo }
    });
    
    if (oldMessages.length === 0) {
      console.log('✅ No old conversations to clean up');
      return { deletedMessages: 0, deletedChats: 0 };
    }
    
    // Get unique conversation IDs from old messages
    const oldConversationIds = [...new Set(oldMessages.map(msg => msg.conversationId))];
    
    console.log('🧹 Found old conversations to delete:', oldConversationIds.length);
    console.log('🧹 Conversation IDs:', oldConversationIds);
    
    // Delete old messages
    const deletedMessages = await Message.deleteMany({
      createdAt: { $lt: sevenDaysAgo }
    });
    
    // Delete corresponding chats
    const deletedChats = await Chat.deleteMany({
      updatedAt: { $lt: sevenDaysAgo }
    });
    
    console.log('✅ Cleanup completed:');
    console.log(`  - Deleted ${deletedMessages.deletedCount} messages`);
    console.log(`  - Deleted ${deletedChats.deletedCount} chats`);
    console.log(`  - From ${oldConversationIds.length} conversations`);
    
    return {
      deletedMessages: deletedMessages.deletedCount,
      deletedChats: deletedChats.deletedCount,
      conversationsAffected: oldConversationIds.length
    };
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
};

// Add cleanup endpoint for manual testing
router.post('/cleanup', async (req, res) => {
  try {
    console.log('🧹 Manual cleanup requested');
    
    const result = await cleanupOldConversations();
    
    res.json({
      success: true,
      message: 'Cleanup completed successfully',
      result
    });
    
  } catch (error: any) {
    console.error('❌ Manual cleanup failed:', error);
    res.status(500).json({
      success: false,
      error: 'Cleanup failed',
      details: error.message
    });
  }
});

// Add this to run cleanup automatically every day
const startAutoCleanup = () => {
  console.log('🕐 Starting auto-cleanup scheduler...');
  
  // Run cleanup every 24 hours (86400000 ms)
  setInterval(async () => {
    try {
      console.log('🕐 Running scheduled cleanup...');
      await cleanupOldConversations();
    } catch (error) {
      console.error('❌ Scheduled cleanup failed:', error);
    }
  }, 24 * 60 * 60 * 1000); // 24 hours
  
  // Also run cleanup on server start
  setTimeout(async () => {
    try {
      console.log('🕐 Running initial cleanup on server start...');
      await cleanupOldConversations();
    } catch (error) {
      console.error('❌ Initial cleanup failed:', error);
    }
  }, 5000); // Wait 5 seconds after server start
  
  console.log('✅ Auto-cleanup scheduler started');
};

// Add debug endpoint to see conversation ages
router.get('/debug/conversation-ages', async (req, res) => {
  try {
    console.log('🔍 Checking conversation ages...');
    
    // Get all conversations with their age info
    const conversationAges = await Message.aggregate([
      {
        $group: {
          _id: '$conversationId',
          firstMessage: { $min: '$createdAt' },
          lastMessage: { $max: '$createdAt' },
          messageCount: { $sum: 1 }
        }
      },
      {
        $addFields: {
          ageInDays: {
            $divide: [
              { $subtract: [new Date(), '$lastMessage'] },
              1000 * 60 * 60 * 24 // Convert to days
            ]
          }
        }
      },
      {
        $sort: { lastMessage: -1 }
      }
    ]);
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const activeConversations = conversationAges.filter(conv => conv.ageInDays < 7);
    const expiredConversations = conversationAges.filter(conv => conv.ageInDays >= 7);
    
    console.log('🔍 Conversation age analysis:');
    console.log(`  - Active conversations (< 7 days): ${activeConversations.length}`);
    console.log(`  - Expired conversations (>= 7 days): ${expiredConversations.length}`);
    
    res.json({
      success: true,
      summary: {
        totalConversations: conversationAges.length,
        activeConversations: activeConversations.length,
        expiredConversations: expiredConversations.length,
        cleanupThreshold: sevenDaysAgo.toISOString()
      },
      conversations: conversationAges.map(conv => ({
        conversationId: conv._id,
        ageInDays: Math.round(conv.ageInDays * 100) / 100,
        messageCount: conv.messageCount,
        firstMessage: conv.firstMessage,
        lastMessage: conv.lastMessage,
        expired: conv.ageInDays >= 7
      }))
    });
    
  } catch (error: any) {
    console.error('❌ Error checking conversation ages:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Call this in your server startup file (app.js or server.js)
// startAutoCleanup();

export { cleanupOldConversations, startAutoCleanup };
export default router;