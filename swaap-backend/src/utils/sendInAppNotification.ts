// src/utils/sendInAppNotification.ts
import Notification from '@/models/notification';

export const sendInAppNotification = async (
  userId: string,
  payload: {
    type: string;
    message: string;
    data?: any;
  }
) => {
  await Notification.create({
    user: userId,
    type: payload.type,
    message: payload.message,
    data: payload.data,
    read: false,
  });

  // Optional: Update badge count on user model if you want to track unread notifications count
};
