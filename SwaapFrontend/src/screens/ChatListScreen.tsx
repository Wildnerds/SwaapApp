// screens/ChatListScreen.tsx - Chat list for user conversations
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@context/AuthContext';
import { apiClient } from '@config/index';
import COLORS from '@constants/colors';

interface ChatParticipant {
  _id: string;
  fullName: string;
  email: string;
}

interface LastMessage {
  content: string;
  senderName: string;
  createdAt: string;
  messageType: 'text' | 'image' | 'product_link' | 'system';
}

interface Chat {
  _id: string;
  chatType: 'direct' | 'group' | 'support';
  chatName: string;
  participants: ChatParticipant[];
  otherParticipants: ChatParticipant[];
  lastMessage: LastMessage | null;
  lastActivity: string;
  unreadCount: number;
  isMuted: boolean;
  status: string;
  createdAt: string;
  relatedProductId?: string; // For chats initiated from product pages
}

export default function ChatListScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Set up the header
  useEffect(() => {
    navigation.setOptions({
      title: 'Messages',
      headerStyle: {
        backgroundColor: '#121212',
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        color: '#fff',
      },
    });
  }, [navigation]);

  // Fetch chats when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchChats();
    }, [])
  );

  const fetchChats = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      console.log('🔍 Fetching chats...');
      const response = await apiClient.get('/api/chat');
      
      console.log('📊 Received chats response:', response);
      setChats(response.chats || []);
    } catch (error) {
      console.error('❌ Failed to fetch chats:', error);
      Alert.alert('Error', 'Failed to load conversations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchChats();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleChatPress = (chat: Chat) => {
    const otherUserId = chat.otherParticipants.length > 0 ? chat.otherParticipants[0]._id : undefined;
    
    navigation.navigate('ChatScreen', {
      chatId: chat._id,
      chatName: chat.chatName,
      otherUserId,
    });
  };

  const renderChatItem = ({ item }: { item: Chat }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => handleChatPress(item)}
    >
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.chatName.charAt(0).toUpperCase()}
          </Text>
        </View>
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {item.unreadCount > 99 ? '99+' : item.unreadCount}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <View style={styles.chatNameContainer}>
            <Text style={styles.chatName} numberOfLines={1}>
              {item.chatName}
            </Text>
            {item.relatedProductId && (
              <Ionicons name="cube" size={12} color="#9C27B0" style={{ marginLeft: 4 }} />
            )}
          </View>
          {item.lastMessage && (
            <Text style={styles.timeText}>
              {formatTime(item.lastMessage.createdAt)}
            </Text>
          )}
        </View>
        
        <View style={styles.lastMessageRow}>
          {item.lastMessage ? (
            <>
              <Text style={styles.lastMessage} numberOfLines={1}>
                {item.lastMessage.messageType === 'product_link' ? (
                  <Text>
                    <Ionicons name="cube-outline" size={12} /> Product shared
                  </Text>
                ) : item.lastMessage.messageType === 'image' ? (
                  <Text>
                    <Ionicons name="image-outline" size={12} /> Photo
                  </Text>
                ) : (
                  `${item.lastMessage.senderName}: ${item.lastMessage.content}`
                )}
              </Text>
              {item.isMuted && (
                <Ionicons name="volume-mute" size={12} color="#666" />
              )}
            </>
          ) : (
            <Text style={styles.noMessages}>No messages yet</Text>
          )}
        </View>
      </View>

      <View style={styles.chevron}>
        <Ionicons name="chevron-forward" size={16} color="#666" />
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={60} color="#666" />
      <Text style={styles.emptyTitle}>No conversations yet</Text>
      <Text style={styles.emptySubtitle}>
        Start chatting with other users to see your conversations here
      </Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.gold} />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={chats}
        keyExtractor={(item) => item._id}
        renderItem={renderChatItem}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.gold}
            colors={[COLORS.gold]}
          />
        }
        contentContainerStyle={chats.length === 0 ? styles.emptyList : undefined}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#E53935',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chatName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  timeText: {
    color: '#666',
    fontSize: 12,
  },
  lastMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lastMessage: {
    color: '#ccc',
    fontSize: 14,
    flex: 1,
  },
  noMessages: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
  },
  chevron: {
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
});