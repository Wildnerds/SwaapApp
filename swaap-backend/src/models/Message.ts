// models/Message.ts - Enhanced for user-to-user chat
import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMessage extends Document {
  _id: Types.ObjectId;
  chatId: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  messageType: 'text' | 'image' | 'product_link' | 'system';
  readBy: {
    userId: Types.ObjectId;
    readAt: Date;
  }[];
  edited: boolean;
  editedAt?: Date;
  deleted: boolean;
  deletedAt?: Date;
  deletedFor: Types.ObjectId[]; // Users who have deleted this message
  replyTo?: Types.ObjectId; // For replying to specific messages
  productRef?: Types.ObjectId; // For product link messages
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    chatId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Chat', 
      required: true 
    },
    senderId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    content: { 
      type: String, 
      required: true,
      maxLength: 1000
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'product_link', 'system'],
      default: 'text'
    },
    readBy: [{
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      readAt: {
        type: Date,
        default: Date.now
      }
    }],
    edited: {
      type: Boolean,
      default: false
    },
    editedAt: Date,
    deleted: {
      type: Boolean,
      default: false
    },
    deletedAt: Date,
    deletedFor: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: 'Message'
    },
    productRef: {
      type: Schema.Types.ObjectId,
      ref: 'Product'
    }
  },
  { timestamps: true }
);

// Indexes for better performance
messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });

export default mongoose.model<IMessage>('Message', messageSchema);
