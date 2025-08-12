// src/models/notification.ts
import { Schema, model, models, Document, Types } from 'mongoose';

export interface INotification extends Document {
  user: Types.ObjectId;          // who receives the notification
  type: string;                  // e.g. 'swap', 'message', etc.
  message: string;               // notification message text
  data?: any;                   // optional extra data (like swapId)
  read: boolean;
  messageCount?: number;         // for grouped notifications (e.g., "3 new messages")
  groupKey?: string;            // unique key for grouping (e.g., "chat_${chatId}" or "user_${senderId}")
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    message: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    read: { type: Boolean, default: false },
    messageCount: { type: Number, default: 1 },
    groupKey: { type: String },
  },
  { timestamps: true }
);

const Notification = models.Notification || model<INotification>('Notification', notificationSchema);
export default Notification;
