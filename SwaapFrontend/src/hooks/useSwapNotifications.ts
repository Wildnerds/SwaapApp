// src/hooks/useSwapNotifications.ts
import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@config/index';

interface Notification {
  _id: string;
  id?: string;
  message: string;
  title?: string;
  description?: string;
  type?: string;
  read: boolean;
  createdAt: string;
  updatedAt?: string;
  user?: string;
}

export const useSwapNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 useSwapNotifications: Fetching notifications...');
      
      // ✅ FIXED: Use correct endpoint with /api prefix
      const response = await apiClient.get('/api/notifications');
      
      console.log('✅ useSwapNotifications: Notifications fetched successfully');
      console.log('🔍 Raw response:', response);
      
      // ✅ FIXED: Better response handling with multiple fallbacks
      let notificationsData = [];
      
      if (Array.isArray(response)) {
        // Response is directly an array
        notificationsData = response;
      } else if (response && Array.isArray(response.notifications)) {
        // Response has notifications property
        notificationsData = response.notifications;
      } else if (response && response.data && Array.isArray(response.data.notifications)) {
        // Response has nested data.notifications
        notificationsData = response.data.notifications;
      } else if (response && Array.isArray(response.data)) {
        // Response has data as array
        notificationsData = response.data;
      } else {
        // Unknown response format, default to empty array
        console.log('⚠️ useSwapNotifications: Unknown response format, defaulting to empty array');
        notificationsData = [];
      }
      
      console.log('📊 useSwapNotifications: Parsed notifications data:', {
        type: typeof notificationsData,
        isArray: Array.isArray(notificationsData),
        length: notificationsData.length || 0
      });
      
      // ✅ Ensure we have an array before sorting
      if (!Array.isArray(notificationsData)) {
        console.log('⚠️ useSwapNotifications: Data is not an array, converting to empty array');
        notificationsData = [];
      }
      
      // Sort by newest first
      const sortedNotifications = notificationsData.sort((a: Notification, b: Notification) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      
      setNotifications(sortedNotifications);
      console.log('📱 useSwapNotifications: Loaded', sortedNotifications.length, 'notifications');
      
    } catch (err: any) {
      console.error('❌ useSwapNotifications: Failed to fetch notifications:', err);
      
      let errorMessage = 'Failed to load notifications';
      if (err?.status === 404) {
        console.log('📱 useSwapNotifications: No notifications endpoint found (404)');
        // Don't treat 404 as an error - just means no notifications service yet
        setNotifications([]);
        setError(null);
        return;
      } else if (err?.status === 401) {
        errorMessage = 'Please log in to view notifications';
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshNotifications = useCallback(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      console.log('🔍 useSwapNotifications: Marking notification as read:', notificationId);
      
      // ✅ FIXED: Use PUT instead of PATCH since apiClient doesn't have patch method
      await apiClient.put(`/api/notifications/${notificationId}/read`, {});
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification._id === notificationId 
            ? { ...notification, read: true }
            : notification
        )
      );
      
      console.log('✅ useSwapNotifications: Notification marked as read');
    } catch (error) {
      console.error('❌ useSwapNotifications: Failed to mark as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      console.log('🔍 useSwapNotifications: Marking all notifications as read');
      
      // ✅ FIXED: Use PUT instead of PATCH since apiClient doesn't have patch method
      await apiClient.put('/api/notifications/mark-all-read', {});
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
      
      console.log('✅ useSwapNotifications: All notifications marked as read');
    } catch (error) {
      console.error('❌ useSwapNotifications: Failed to mark all as read:', error);
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      console.log('🔍 useSwapNotifications: Deleting notification:', notificationId);
      
      // ✅ FIXED: Use correct endpoint with /api prefix
      await apiClient.delete(`/api/notifications/${notificationId}`);
      
      // Update local state
      setNotifications(prev => 
        prev.filter(notification => notification._id !== notificationId)
      );
      
      console.log('✅ useSwapNotifications: Notification deleted');
    } catch (error) {
      console.error('❌ useSwapNotifications: Failed to delete notification:', error);
      throw error; // Re-throw so component can handle the error
    }
  }, []);

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Get unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    loading,
    error,
    unreadCount,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    fetchNotifications,
  };
};