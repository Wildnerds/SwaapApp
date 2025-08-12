import AdminLog from '@/models/AdminLog';
import mongoose from 'mongoose';

export const logAdminAction = async (
  adminId: string,
  action: string,
  targetUserId?: string
) => {
  await AdminLog.create({
    admin: new mongoose.Types.ObjectId(adminId),
    action,
    targetUser: targetUserId ? new mongoose.Types.ObjectId(targetUserId) : undefined,
  });
};
