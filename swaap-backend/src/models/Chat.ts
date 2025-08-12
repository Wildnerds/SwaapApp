// models/Chat.ts - Enhanced for user-to-user chat
import mongoose, { Schema, Document, Types } from 'mongoose';

interface LastMessage {
  content: string;
  senderId: Types.ObjectId;
  createdAt: Date;
  messageType: 'text' | 'image' | 'product_link' | 'system';
}

export interface IChat extends Document {
  _id: Types.ObjectId;
  participants: Types.ObjectId[];
  chatType: 'direct' | 'group' | 'support';
  chatName?: string; // For group chats or support chats
  lastMessage?: LastMessage;
  lastActivity: Date;
  
  // Support Chat Fields (keep for backward compatibility)
  isSupportChat?: boolean;
  needsHumanAgent?: boolean;
  hasHumanAgent?: boolean;
  agentId?: string;
  agentName?: string;
  escalationReason?: string;
  escalatedAt?: Date;
  agentJoinedAt?: Date;
  
  // Chat Management
  status: 'active' | 'archived' | 'blocked' | 'waiting_for_agent' | 'with_agent' | 'resolved';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  
  // Product Reference (for chats initiated from product pages)
  relatedProductId?: Types.ObjectId;
  
  // User-specific settings
  mutedBy: Types.ObjectId[];
  archivedBy: {
    userId: Types.ObjectId;
    archivedAt: Date;
  }[];
  blockedBy: {
    userId: Types.ObjectId;
    blockedUserId: Types.ObjectId;
    blockedAt: Date;
  }[];
  
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LastMessageSchema = new Schema<LastMessage>(
  {
    content: { type: String, required: true },
    senderId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    createdAt: { type: Date, default: Date.now },
    messageType: {
      type: String,
      enum: ['text', 'image', 'product_link', 'system'],
      default: 'text'
    }
  },
  { _id: false }
);

const chatSchema = new Schema<IChat>(
  {
    participants: [{ 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    }],
    chatType: {
      type: String,
      enum: ['direct', 'group', 'support'],
      default: 'direct'
    },
    chatName: { type: String },
    lastMessage: {
      type: LastMessageSchema,
      required: false,
    },
    lastActivity: {
      type: Date,
      default: Date.now
    },
    
    // Support Chat Fields (backward compatibility)
    isSupportChat: { type: Boolean, default: false },
    needsHumanAgent: { type: Boolean, default: false },
    hasHumanAgent: { type: Boolean, default: false },
    agentId: { type: String },
    agentName: { type: String },
    escalationReason: { type: String },
    escalatedAt: { type: Date },
    agentJoinedAt: { type: Date },
    
    // Chat Management
    status: { 
      type: String, 
      enum: ['active', 'archived', 'blocked', 'waiting_for_agent', 'with_agent', 'resolved'],
      default: 'active'
    },
    priority: { 
      type: String, 
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal'
    },
    
    // Product Reference (for chats initiated from product pages)
    relatedProductId: {
      type: Schema.Types.ObjectId,
      ref: 'Product'
    },
    
    // User Settings
    mutedBy: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    archivedBy: [{
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      archivedAt: {
        type: Date,
        default: Date.now
      }
    }],
    blockedBy: [{
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      blockedUserId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      blockedAt: {
        type: Date,
        default: Date.now
      }
    }],
    
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

// Indexes for better performance
chatSchema.index({ participants: 1 });
chatSchema.index({ lastActivity: -1 });
chatSchema.index({ chatType: 1 });
chatSchema.index({ status: 1 });
chatSchema.index({ needsHumanAgent: 1, status: 1 }); // For support chats
chatSchema.index({ agentId: 1 }); // For support chats
chatSchema.index({ escalatedAt: 1 }); // For support chats

// Method to find or create a direct chat between two users
chatSchema.statics.findOrCreateDirectChat = async function(
  userId1: Types.ObjectId, 
  userId2: Types.ObjectId, 
  productId?: Types.ObjectId
) {
  // Look for existing direct chat between these users
  let chat = await this.findOne({
    chatType: 'direct',
    participants: { $all: [userId1, userId2], $size: 2 }
  });

  if (!chat) {
    // Create new chat with optional product reference
    const chatData: any = {
      participants: [userId1, userId2],
      chatType: 'direct',
      createdBy: userId1,
      status: 'active'
    };
    
    // Add product reference if provided
    if (productId) {
      chatData.relatedProductId = productId;
    }
    
    chat = await this.create(chatData);
  } else if (productId && !chat.relatedProductId) {
    // Update existing chat with product reference if not already set
    chat.relatedProductId = productId;
    await chat.save();
  }

  return chat;
};

export default mongoose.model<IChat>('Chat', chatSchema);