// src/services/notificationService.ts
import User from '../models/User';

export const sendVerificationNotification = async (type: string, data: any) => {
  try {
    switch (type) {
      case 'new_verification':
        await notifyAdmins('New Identity Verification', `User ${data.userEmail} submitted ${data.documentType} for verification`);
        break;
        
      case 'verification_approved':
        await notifyUser(data.userId, 'Verification Approved! 🎉', 'Your identity verification has been approved. +25 trust score points added!');
        break;
        
      case 'verification_rejected':
        await notifyUser(data.userId, 'Verification Update', `Your identity verification needs attention. ${data.comments || 'Please resubmit with clearer documents.'}`);
        break;
    }
  } catch (error) {
    console.error('Notification error:', error);
  }
};

async function notifyAdmins(title: string, message: string) {
  const admins = await User.find({ role: 'admin' });
  // Send push notifications to admins
  // Implement with your chosen service (FCM, OneSignal, etc.)
  console.log(`📢 Admin notification: ${title} - ${message}`);
  
  // You can integrate with your existing notification system here
  // For example, if you have push notification setup:
  // await sendPushNotification(admins.map(admin => admin._id), title, message);
}

async function notifyUser(userId: string, title: string, message: string) {
  // Send push notification to specific user
  // Implement with your chosen service
  console.log(`📱 User ${userId} notification: ${title} - ${message}`);
  
  // You can integrate with your existing notification system here
  // For example:
  // await sendPushNotification([userId], title, message);
}