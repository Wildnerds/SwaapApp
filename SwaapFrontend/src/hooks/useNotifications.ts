import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@config/index';

export interface Notification {
  _id: string;
  user: string;
  type: string;
  message: string;
  data?: any;
  read: boolean;
  messageCount?: number;
  groupKey?: string;
  createdAt: string;
  updatedAt: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Fetching notifications from API...');
      
      const response = await apiClient.get('/api/notifications');
      
      console.log('📥 Raw API response:', response);
      
      // Handle the response based on the backend format
      if (response?.type === 'success' && response?.data) {
        console.log(`✅ Fetched ${response.data.length} notifications from server`);
        setNotifications(response.data);
      } else if (Array.isArray(response)) {
        console.log(`✅ Fetched ${response.length} notifications as direct array`);
        setNotifications(response);
      } else {
        console.warn('⚠️ Unexpected API response format:', response);
        console.warn('Response type:', typeof response);
        console.warn('Response keys:', response ? Object.keys(response) : 'no keys');
        setNotifications([]);
      }
    } catch (err: any) {
      console.error('❌ Error fetching notifications:', {
        message: err?.message,
        status: err?.response?.status,
        statusText: err?.response?.statusText,
        data: err?.response?.data,
        stack: err?.stack
      });
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      console.log(`🔍 Marking notification ${notificationId} as read...`);
      
      await apiClient.put(`/api/notifications/${notificationId}/read`, {});
      
      // Update local state
      setNotifications(prev => {
        const updated = prev.map(notification => 
          notification._id === notificationId 
            ? { ...notification, read: true }
            : notification
        );
        const oldUnreadCount = prev.filter(n => !n.read).length;
        const newUnreadCount = updated.filter(n => !n.read).length;
        console.log(`📊 Unread count changed: ${oldUnreadCount} -> ${newUnreadCount}`);
        return updated;
      });
      
      console.log('✅ Notification marked as read');
    } catch (err: any) {
      console.error('❌ Error marking notification as read:', err);
      throw err;
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      console.log(`🔍 Deleting notification ${notificationId}...`);
      
      await apiClient.delete(`/api/notifications/${notificationId}`);
      
      // Update local state
      setNotifications(prev => 
        prev.filter(notification => notification._id !== notificationId)
      );
      
      console.log('✅ Notification deleted');
    } catch (err: any) {
      console.error('❌ Error deleting notification:', err);
      throw err;
    }
  }, []);

  const markChatNotificationsAsRead = useCallback(async (chatId: string) => {
    try {
      console.log(`🔍 Marking all chat notifications as read for chatId: ${chatId}`);
      
      const response = await apiClient.put(`/api/notifications/chat/${chatId}/read`, {});
      
      console.log('📥 Chat notifications mark as read response:', response);
      
      // Update local state - mark grouped notification for this chat as read
      setNotifications(prev => {
        const groupKey = `chat_${chatId}`;
        const updated = prev.map(notification => 
          notification.type === 'new_message' && 
          notification.groupKey === groupKey && 
          !notification.read
            ? { ...notification, read: true }
            : notification
        );
        
        const markedCount = prev.filter(n => 
          n.type === 'new_message' && 
          n.groupKey === groupKey && 
          !n.read
        ).length;
        
        console.log(`✅ Marked ${markedCount} grouped chat notifications as read locally`);
        return updated;
      });
      
      return response;
    } catch (err: any) {
      console.error('❌ Error marking chat notifications as read:', err);
      throw err;
    }
  }, []);

  const unreadCount = useMemo(() => {
    const unreadNotifications = notifications.filter(notification => !notification.read);
    const count = unreadNotifications.length;
    console.log(`📊 Unread count calculated: ${count}/${notifications.length} notifications`);
    console.log('🔍 Unread notifications:', unreadNotifications.map(n => ({ 
      id: n._id, 
      message: n.message.substring(0, 30), 
      read: n.read,
      type: n.type 
    })));
    return count;
  }, [notifications]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    loading,
    error,
    unreadCount,
    fetchNotifications,
    markAsRead,
    deleteNotification,
    markChatNotificationsAsRead,
    refreshNotifications: fetchNotifications
  };
};