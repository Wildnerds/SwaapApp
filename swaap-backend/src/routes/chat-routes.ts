// chat-routes.ts - Enhanced for user-to-user messaging
import express from 'express';
import mongoose from 'mongoose';
import Chat from '../models/Chat';
import Message from '../models/Message';
import User from '../models/User';
import Notification from '../models/notification';
import { verifyJwtToken } from '../middlewares/verifyJwtToken';
import { Server } from 'socket.io';

const router = express.Router();

// Test route to verify chat routes are working
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Chat routes are working!', 
    timestamp: new Date().toISOString(),
    endpoint: '/api/chat/test'
  });
});

// Debug route to test authentication
router.get('/debug', verifyJwtToken, (req, res) => {
  res.json({ 
    message: 'Authentication is working!', 
    user: {
      id: req.user._id,
      email: req.user.email,
      fullName: req.user.fullName
    },
    timestamp: new Date().toISOString(),
    endpoint: '/api/chat/debug'
  });
});

// ✅ Extend Express Request to include io
declare global {
  namespace Express {
    interface Request {
      io?: Server;
    }
  }
}

// Helper function to get display name
const getDisplayName = (user: any): string => {
  if (user.fullName && user.fullName.trim()) {
    return user.fullName.trim();
  }
  
  if (user.email) {
    const emailPrefix = user.email.split('@')[0];
    return emailPrefix
      .replace(/[._]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  return 'Anonymous User';
};

// Helper function to create or update grouped notifications
const createOrUpdateGroupedNotification = async (
  recipientId: string,
  senderId: string,
  senderName: string,
  chatId: string,
  messageId: string,
  messagePreview: string
) => {
  try {
    const groupKey = `chat_${chatId}`;
    
    console.log(`🔔 Creating/updating grouped notification for chat ${chatId}`);
    
    // Check if there's already an unread notification for this chat
    const existingNotification = await Notification.findOne({
      user: recipientId,
      type: 'new_message',
      groupKey: groupKey,
      read: false
    });
    
    if (existingNotification) {
      // Update existing notification
      existingNotification.messageCount = (existingNotification.messageCount || 1) + 1;
      existingNotification.message = existingNotification.messageCount === 2 
        ? `2 new messages from ${senderName}`
        : `${existingNotification.messageCount} new messages from ${senderName}`;
      existingNotification.data = {
        chatId,
        messageId, // Most recent message ID
        senderId,
        senderName,
        messagePreview // Most recent message preview
      };
      existingNotification.updatedAt = new Date();
      
      await existingNotification.save();
      
      console.log(`✅ Updated grouped notification, new count: ${existingNotification.messageCount}`);
      return existingNotification;
    } else {
      // Create new notification
      const newNotification = await Notification.create({
        user: recipientId,
        type: 'new_message',
        message: `New message from ${senderName}`,
        messageCount: 1,
        groupKey: groupKey,
        data: {
          chatId,
          messageId,
          senderId,
          senderName,
          messagePreview
        }
      });
      
      console.log(`✅ Created new grouped notification`);
      return newNotification;
    }
  } catch (error) {
    console.error('❌ Error creating/updating grouped notification:', error);
    throw error;
  }
};

// GET /api/chat - Get all chats for the current user
router.get('/', verifyJwtToken, async (req, res) => {
  try {
    const userId = req.user._id;
    console.log(`🔍 [CHAT API] GET / - Fetching chats for user: ${userId}`);
    console.log(`🔍 [CHAT API] Auth user:`, { id: req.user._id, email: req.user.email });

    const chats = await Chat.find({
      participants: userId,
      status: { $nin: ['archived', 'blocked'] },
      $or: [
        { 'archivedBy.userId': { $ne: userId } },
        { archivedBy: { $exists: false } },
        { archivedBy: [] }
      ]
    })
    .populate('participants', '_id fullName email')
    .populate('lastMessage.senderId', '_id fullName email')
    .sort({ lastActivity: -1 })
    .lean();

    console.log(`📊 Found ${chats.length} chats for user ${userId}`);

    // Format chats for response
    const formattedChats = chats.map(chat => {
      const otherParticipants = chat.participants.filter(
        (p: any) => p._id.toString() !== userId.toString()
      );
      
      // For direct chats, use the other participant's name as chat name
      let chatName = chat.chatName;
      if (chat.chatType === 'direct' && otherParticipants.length === 1) {
        chatName = getDisplayName(otherParticipants[0]);
      }

      // Calculate unread count (simplified - you might want to optimize this)
      const unreadCount = 0; // TODO: Calculate actual unread count

      return {
        _id: chat._id,
        chatType: chat.chatType,
        chatName,
        participants: chat.participants,
        otherParticipants,
        lastMessage: chat.lastMessage ? {
          content: chat.lastMessage.content,
          senderName: getDisplayName(chat.lastMessage.senderId),
          createdAt: chat.lastMessage.createdAt,
          messageType: chat.lastMessage.messageType
        } : null,
        lastActivity: chat.lastActivity,
        unreadCount,
        isMuted: chat.mutedBy?.includes(userId) || false,
        status: chat.status,
        createdAt: chat.createdAt,
        relatedProductId: chat.relatedProductId?.toString()
      };
    });

    return res.status(200).json({
      chats: formattedChats,
      total: chats.length
    });

  } catch (error) {
    console.error('Error fetching chats:', error);
    return res.status(500).json({
      type: 'error',
      message: 'Failed to fetch chats'
    });
  }
});

// POST /api/chats/direct/:userId - Start or get direct chat with another user
router.post('/direct/:userId', verifyJwtToken, async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const otherUserId = req.params.userId;
    const { productId, context } = req.body; // Get productId and context from request body

    console.log(`🔍 Starting/finding direct chat between ${currentUserId} and ${otherUserId}`, {
      productId,
      context
    });

    // Validate that the other user exists
    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      return res.status(404).json({
        type: 'error',
        message: 'User not found'
      });
    }

    // Can't chat with yourself
    if (currentUserId.toString() === otherUserId) {
      return res.status(400).json({
        type: 'error',
        message: 'Cannot start chat with yourself'
      });
    }

    // Use the static method to find or create direct chat
    const chat = await (Chat as any).findOrCreateDirectChat(
      new mongoose.Types.ObjectId(currentUserId),
      new mongoose.Types.ObjectId(otherUserId),
      productId ? new mongoose.Types.ObjectId(productId) : undefined
    );

    // Populate participants
    await chat.populate('participants', '_id fullName email');

    const formattedChat = {
      _id: chat._id,
      chatType: chat.chatType,
      chatName: getDisplayName(otherUser),
      participants: chat.participants,
      lastMessage: chat.lastMessage,
      lastActivity: chat.lastActivity,
      status: chat.status,
      createdAt: chat.createdAt
    };

    console.log(`✅ Chat ready: ${chat._id}`);

    return res.status(200).json({
      type: 'success',
      message: 'Chat ready',
      chat: formattedChat
    });

  } catch (error) {
    console.error('Error starting direct chat:', error);
    return res.status(500).json({
      type: 'error',
      message: 'Failed to start chat'
    });
  }
});

// GET /api/chats/:chatId/messages - Get messages for a specific chat
router.get('/:chatId/messages', verifyJwtToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    console.log(`🔍 Fetching messages for chat ${chatId}, page ${page}`);

    // Verify user is participant in this chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        type: 'error',
        message: 'Chat not found'
      });
    }

    if (!chat.participants.includes(userId)) {
      return res.status(403).json({
        type: 'error',
        message: 'You are not a participant in this chat'
      });
    }

    // Get messages (excluding those deleted by current user)
    const messages = await Message.find({ 
      chatId,
      deleted: false,
      deletedFor: { $ne: userId }
    })
    .populate('senderId', '_id fullName email')
    .populate('replyTo', 'content senderId')
    .populate('productRef', 'title images price')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

    const totalMessages = await Message.countDocuments({ 
      chatId,
      deleted: false
    });

    // Format messages
    const formattedMessages = messages.map(message => ({
      _id: message._id,
      content: message.content,
      messageType: message.messageType,
      sender: {
        _id: message.senderId._id,
        name: getDisplayName(message.senderId)
      },
      isOwn: message.senderId._id.toString() === userId.toString(),
      createdAt: message.createdAt,
      edited: message.edited,
      editedAt: message.editedAt,
      replyTo: message.replyTo,
      productRef: message.productRef,
      readBy: message.readBy
    })).reverse(); // Reverse to get chronological order

    // Mark messages as read by current user
    await Message.updateMany(
      { 
        chatId,
        deleted: false,
        'readBy.userId': { $ne: userId }
      },
      {
        $push: {
          readBy: {
            userId,
            readAt: new Date()
          }
        }
      }
    );

    console.log(`📊 Returning ${formattedMessages.length} messages for chat ${chatId}`);

    return res.status(200).json({
      messages: formattedMessages,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalMessages / limit),
        totalMessages,
        hasMore: skip + messages.length < totalMessages
      }
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({
      type: 'error',
      message: 'Failed to fetch messages'
    });
  }
});

// POST /api/chats/:chatId/messages - Send a message
router.post('/:chatId/messages', verifyJwtToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, messageType = 'text', replyTo, productRef } = req.body;
    const userId = req.user._id;

    console.log(`📤 Sending message to chat ${chatId} from user ${userId}`);

    // Validate input
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        type: 'error',
        message: 'Message content is required'
      });
    }

    if (content.length > 1000) {
      return res.status(400).json({
        type: 'error',
        message: 'Message too long (max 1000 characters)'
      });
    }

    // Verify chat exists and user is participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        type: 'error',
        message: 'Chat not found'
      });
    }

    if (!chat.participants.includes(userId)) {
      return res.status(403).json({
        type: 'error',
        message: 'You are not a participant in this chat'
      });
    }

    // Create message
    const message = await Message.create({
      chatId,
      senderId: userId,
      content: content.trim(),
      messageType,
      replyTo: replyTo || undefined,
      productRef: productRef || undefined,
      readBy: [{
        userId,
        readAt: new Date()
      }]
    });

    // Update chat's last message and activity
    chat.lastMessage = {
      content: message.content,
      senderId: userId,
      createdAt: message.createdAt,
      messageType: message.messageType
    };
    chat.lastActivity = new Date();
    await chat.save();

    // Populate message for response
    await message.populate('senderId', '_id fullName email');

    const formattedMessage = {
      _id: message._id,
      content: message.content,
      messageType: message.messageType,
      sender: {
        _id: message.senderId._id,
        name: getDisplayName(message.senderId)
      },
      isOwn: true,
      createdAt: message.createdAt,
      edited: message.edited,
      replyTo: message.replyTo,
      productRef: message.productRef,
      readBy: message.readBy
    };

    // Create or update grouped notifications for other participants
    const otherParticipants = chat.participants.filter(
      participantId => participantId.toString() !== userId.toString()
    );

    for (const participantId of otherParticipants) {
      try {
        const senderName = getDisplayName(message.senderId);
        const messagePreview = message.content.substring(0, 50) + (message.content.length > 50 ? '...' : '');
        
        await createOrUpdateGroupedNotification(
          participantId.toString(),
          userId.toString(),
          senderName,
          chatId,
          message._id.toString(),
          messagePreview
        );

        console.log(`📲 Grouped notification created/updated for user: ${participantId}`);
      } catch (error) {
        console.error(`Failed to create/update grouped notification for user ${participantId}:`, error);
      }
    }

    // Emit real-time message to other participants
    req.io?.to(chatId).emit('newMessage', {
      chatId,
      message: formattedMessage
    });

    console.log(`✅ Message sent: ${message._id}`);

    return res.status(201).json({
      type: 'success',
      message: 'Message sent successfully',
      data: formattedMessage
    });

  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({
      type: 'error',
      message: 'Failed to send message'
    });
  }
});

// PUT /api/chats/:chatId/messages/:messageId - Edit a message
router.put('/:chatId/messages/:messageId', verifyJwtToken, async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    // Validate input
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        type: 'error',
        message: 'Message content is required'
      });
    }

    // Find message
    const message = await Message.findOne({
      _id: messageId,
      chatId,
      senderId: userId,
      deleted: false
    });

    if (!message) {
      return res.status(404).json({
        type: 'error',
        message: 'Message not found or you cannot edit this message'
      });
    }

    // Update message
    message.content = content.trim();
    message.edited = true;
    message.editedAt = new Date();
    await message.save();

    // Emit real-time update
    req.io?.to(chatId).emit('messageEdited', {
      chatId,
      messageId,
      newContent: message.content,
      editedAt: message.editedAt
    });

    return res.status(200).json({
      type: 'success',
      message: 'Message updated successfully'
    });

  } catch (error) {
    console.error('Error editing message:', error);
    return res.status(500).json({
      type: 'error',
      message: 'Failed to edit message'
    });
  }
});

// DELETE /api/chat/:chatId/messages - Clear chat history
router.delete('/:chatId/messages', verifyJwtToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    // Verify user is participant in this chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        type: 'error',
        message: 'Chat not found'
      });
    }

    if (!chat.participants.includes(userId)) {
      return res.status(403).json({
        type: 'error',
        message: 'You are not a participant in this chat'
      });
    }

    // Soft delete all messages in this chat for this user
    await Message.updateMany(
      { chatId },
      { 
        $addToSet: { deletedFor: userId }
      }
    );

    // Update chat's last message
    chat.lastMessage = undefined;
    chat.lastActivity = new Date();
    await chat.save();

    return res.status(200).json({
      type: 'success',
      message: 'Chat history cleared successfully'
    });

  } catch (error) {
    console.error('Error clearing chat history:', error);
    return res.status(500).json({
      type: 'error',
      message: 'Failed to clear chat history'
    });
  }
});

// POST /api/chat/:chatId/mute - Mute/unmute chat notifications
router.post('/:chatId/mute', verifyJwtToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    // Verify user is participant in this chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        type: 'error',
        message: 'Chat not found'
      });
    }

    if (!chat.participants.includes(userId)) {
      return res.status(403).json({
        type: 'error',
        message: 'You are not a participant in this chat'
      });
    }

    // Toggle mute status
    if (chat.mutedBy.includes(userId)) {
      chat.mutedBy = chat.mutedBy.filter(id => id.toString() !== userId.toString());
    } else {
      chat.mutedBy.push(userId);
    }

    await chat.save();

    return res.status(200).json({
      type: 'success',
      message: chat.mutedBy.includes(userId) ? 'Chat muted' : 'Chat unmuted',
      muted: chat.mutedBy.includes(userId)
    });

  } catch (error) {
    console.error('Error muting chat:', error);
    return res.status(500).json({
      type: 'error',
      message: 'Failed to mute chat'
    });
  }
});

// POST /api/chat/:chatId/block - Block user in this chat
router.post('/:chatId/block', verifyJwtToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId: userToBlock } = req.body;
    const currentUserId = req.user._id;

    // Verify user is participant in this chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        type: 'error',
        message: 'Chat not found'
      });
    }

    if (!chat.participants.includes(currentUserId)) {
      return res.status(403).json({
        type: 'error',
        message: 'You are not a participant in this chat'
      });
    }

    // Add to blocked list
    const existingBlock = chat.blockedBy.find(
      block => block.userId.toString() === currentUserId.toString() && 
               block.blockedUserId.toString() === userToBlock.toString()
    );

    if (!existingBlock) {
      chat.blockedBy.push({
        userId: currentUserId,
        blockedUserId: userToBlock,
        blockedAt: new Date()
      });
    }

    chat.status = 'blocked';
    await chat.save();

    return res.status(200).json({
      type: 'success',
      message: 'User blocked successfully'
    });

  } catch (error) {
    console.error('Error blocking user:', error);
    return res.status(500).json({
      type: 'error',
      message: 'Failed to block user'
    });
  }
});

// POST /api/chat/:chatId/typing - Send typing indicator
router.post('/:chatId/typing', verifyJwtToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { isTyping } = req.body;
    const userId = req.user._id;

    // Verify user is participant in this chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        type: 'error',
        message: 'Chat not found'
      });
    }

    if (!chat.participants.includes(userId)) {
      return res.status(403).json({
        type: 'error',
        message: 'You are not a participant in this chat'
      });
    }

    // Emit typing indicator to other participants via Socket.IO
    req.io?.to(chatId).emit('typing', {
      chatId,
      userId,
      isTyping,
      userName: req.user.fullName || req.user.email
    });

    return res.status(200).json({
      type: 'success',
      message: 'Typing indicator sent'
    });

  } catch (error) {
    console.error('Error sending typing indicator:', error);
    return res.status(500).json({
      type: 'error',
      message: 'Failed to send typing indicator'
    });
  }
});

// DELETE /api/chat/:chatId - Delete chat for current user
router.delete('/:chatId', verifyJwtToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    console.log(`🗑️ User ${userId} attempting to delete chat ${chatId}`);

    // Verify user is participant in this chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        type: 'error',
        message: 'Chat not found'
      });
    }

    if (!chat.participants.includes(userId)) {
      return res.status(403).json({
        type: 'error',
        message: 'You are not a participant in this chat'
      });
    }

    // For direct chats, we'll soft delete by archiving for this user
    // For group chats, we might want different logic
    if (chat.chatType === 'direct') {
      // Add user to archivedBy list
      const existingArchive = chat.archivedBy.find(
        archive => archive.userId.toString() === userId.toString()
      );

      if (!existingArchive) {
        chat.archivedBy.push({
          userId,
          archivedAt: new Date()
        });
        await chat.save();
      }

      // Also mark all messages in this chat as deleted for this user
      await Message.updateMany(
        { chatId },
        { 
          $addToSet: { deletedFor: userId }
        }
      );

      console.log(`✅ Chat ${chatId} archived for user ${userId}`);

      return res.status(200).json({
        type: 'success',
        message: 'Chat deleted successfully'
      });
    } else {
      return res.status(400).json({
        type: 'error',
        message: 'Cannot delete group chats yet'
      });
    }

  } catch (error) {
    console.error('Error deleting chat:', error);
    return res.status(500).json({
      type: 'error',
      message: 'Failed to delete chat'
    });
  }
});

// POST /api/chat/products/status - Check chat status for multiple products (batch)
router.post('/products/status', verifyJwtToken, async (req, res) => {
  try {
    const { productIds } = req.body; // Array of product IDs
    const userId = req.user._id;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        type: 'error',
        message: 'productIds array is required'
      });
    }

    console.log(`🔍 Checking chat status for ${productIds.length} products, user: ${userId}`);

    // Find all chats where this user is a participant and the chat has a related product
    const chats = await Chat.find({
      participants: userId,
      status: { $nin: ['archived', 'blocked'] },
      relatedProductId: { $in: productIds.map(id => new mongoose.Types.ObjectId(id)) }
    }).populate('relatedProductId', '_id');

    // Create a map of productId -> chat info
    const productChatStatus = {};
    
    // Initialize all products with no chats
    productIds.forEach(productId => {
      productChatStatus[productId] = {
        hasActiveChats: false,
        chatCount: 0,
        lastActivity: null
      };
    });

    // Update with actual chat data
    chats.forEach(chat => {
      const productId = chat.relatedProductId?.toString();
      if (productId && productChatStatus[productId] !== undefined) {
        productChatStatus[productId] = {
          hasActiveChats: true,
          chatCount: (productChatStatus[productId].chatCount || 0) + 1,
          lastActivity: chat.lastActivity
        };
      }
    });

    console.log(`📊 Found chat data for ${Object.keys(productChatStatus).filter(id => productChatStatus[id].hasActiveChats).length} products`);

    return res.status(200).json({
      success: true,
      productChatStatus
    });

  } catch (error) {
    console.error('Error checking products chat status:', error);
    return res.status(500).json({
      type: 'error',
      message: 'Failed to check products chat status'
    });
  }
});

export default router;