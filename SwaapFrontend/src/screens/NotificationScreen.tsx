import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import COLORS from '@constants/colors';
import { apiClient } from '@config/index';
import { useAuth } from '@context/AuthContext';

interface Notification {
  _id: string;
  id?: string; // Backend might return 'id' instead of '_id'
  title?: string; // Backend doesn't seem to return title, only message
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  data?: any;
}

export default function NotificationScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const navigation = useNavigation();

  const fetchNotifications = async () => {
    try {
      console.log('🔔 Fetching notifications...');
      const response = await apiClient.get('/api/notifications');
      console.log('✅ Full API response:', response);
      console.log('✅ Response type:', typeof response, 'Array check:', Array.isArray(response));
      
      // Handle different response structures
      const notificationsData = Array.isArray(response) ? response : (response?.data || response?.notifications || []);
      console.log('✅ Notifications data:', notificationsData);
      console.log('✅ Notifications count:', notificationsData?.length || 0);
      
      // Normalize the data structure - ensure _id field exists
      const normalizedNotifications = (notificationsData || []).map(notification => ({
        ...notification,
        _id: notification._id || notification.id?.toString() || 'unknown',
        title: notification.title || notification.message?.substring(0, 30) || 'Notification'
      }));
      
      console.log('✅ Normalized notifications:', normalizedNotifications);
      setNotifications(normalizedNotifications);
    } catch (err: any) {
      console.error('❌ Error fetching notifications:', err);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      console.log('📖 Marking notification as read:', id);
      await apiClient.put(`/api/notifications/${id}/read`, {});
      
      // Update local state
      setNotifications(prev =>
        prev.map(notif =>
          notif._id === id ? { ...notif, read: true } : notif
        )
      );
    } catch (err: any) {
      console.error('❌ Error marking as read:', err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      console.log('🗑️ Deleting notification:', id);
      await apiClient.delete(`/api/notifications/${id}`);
      
      // Remove from local state
      setNotifications(prev => prev.filter(notif => notif._id !== id));
      
      Alert.alert('Success', 'Notification deleted');
    } catch (err: any) {
      console.error('❌ Error deleting notification:', err);
      Alert.alert('Error', 'Failed to delete notification');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleNotificationPress = (notification: Notification) => {
    console.log('🔔 Notification pressed:', notification);
    
    // Mark as read first
    if (!notification.read) {
      markAsRead(notification._id);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'new_message':
        // Navigate to chat screen - try to extract chat/user info from data or message
        if (notification.data?.chatId) {
          console.log('🔔 Navigating to specific chat:', notification.data.chatId);
          navigation.navigate('ChatScreen' as never, {
            chatId: notification.data.chatId,
            chatName: notification.data.senderName || 'Chat',
            otherUserId: notification.data.senderId
          } as never);
        } else {
          // Fallback for older notifications - try to extract sender from message
          console.log('🔔 No chat data, extracting from message:', notification.message);
          const senderMatch = notification.message.match(/New message from (.+)/);
          const senderName = senderMatch ? senderMatch[1] : 'Unknown';
          
          console.log('🔔 Extracted sender name:', senderName, '- navigating to chat list');
          // Navigate to chat list since we don't have specific chat ID
          navigation.navigate('ChatList' as never);
        }
        break;

      case 'swap_offer':
      case 'swap_accepted':
      case 'swap_rejected':
        // Navigate to swap details
        if (notification.data?.swapId) {
          navigation.navigate('SwapInbox' as never, { swapId: notification.data.swapId } as never);
        } else {
          // Fallback - go to swap inbox
          navigation.navigate('SwapInbox' as never);
        }
        break;

      case 'order_update':
      case 'payment_success':
      case 'payment_failed':
        // Navigate to orders or specific order
        if (notification.data?.orderId) {
          navigation.navigate('OrderTrackingScreen' as never, { orderId: notification.data.orderId } as never);
        } else {
          navigation.navigate('Orders' as never);
        }
        break;

      default:
        console.log('🔔 Unknown notification type:', notification.type);
        // For unknown types, just mark as read (already done above)
        break;
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'swap_accepted':
        return { name: 'checkmark-circle', color: '#4CAF50' };
      case 'swap_rejected':
        return { name: 'close-circle', color: '#f44336' };
      case 'swap_offer':
        return { name: 'swap-horizontal', color: '#2196F3' };
      default:
        return { name: 'notifications', color: COLORS.gold };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const icon = getNotificationIcon(item.type);
    
    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          !item.read && styles.unreadNotification
        ]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={styles.notificationContent}>
          <View style={styles.iconContainer}>
            <Ionicons
              name={icon.name as any}
              size={24}
              color={icon.color}
            />
            {!item.read && <View style={styles.unreadDot} />}
          </View>
          
          <View style={styles.textContent}>
            <Text style={styles.notificationTitle}>{item.title || item.message?.substring(0, 30) + '...' || 'Notification'}</Text>
            <Text style={styles.notificationMessage}>{item.message}</Text>
            <Text style={styles.notificationDate}>{formatDate(item.createdAt)}</Text>
          </View>
          
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => {
              Alert.alert(
                'Delete Notification',
                'Are you sure you want to delete this notification?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => deleteNotification(item._id) }
                ]
              );
            }}
          >
            <Ionicons name="trash-outline" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="notifications" size={64} color={COLORS.gold} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Text style={styles.headerSubtitle}>
          {notifications.length} total, {notifications.filter(n => !n.read).length} unread
        </Text>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
        renderItem={renderNotification}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No notifications yet</Text>
            <Text style={styles.emptySubtext}>
              You'll see swap updates and other important messages here
              {'\n'}Debug: {notifications.length} notifications in state
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    padding: 20,
    backgroundColor: '#1e1e1e',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.gold,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#cccccc',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#cccccc',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  notificationItem: {
    backgroundColor: '#1e1e1e',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.gold,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  iconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gold,
  },
  textContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationDate: {
    fontSize: 12,
    color: '#999',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
});