// screens/ChatScreen.tsx - Individual chat conversation
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '@navigation/types';
import { useAuth } from '@context/AuthContext';
import { apiClient } from '@config/index';
import { useNotifications } from '@hooks/useNotifications';
import COLORS from '@constants/colors';

type ChatScreenRouteProp = RouteProp<RootStackParamList, 'ChatScreen'>;

interface Message {
  _id: string;
  content: string;
  messageType: 'text' | 'image' | 'product_link' | 'system';
  sender: {
    _id: string;
    name: string;
  };
  isOwn: boolean;
  createdAt: string;
  edited: boolean;
  editedAt?: string;
  readBy: {
    userId: string;
    readAt: string;
  }[];
}

export default function ChatScreen() {
  const navigation = useNavigation();
  const route = useRoute<ChatScreenRouteProp>();
  const { user } = useAuth();
  const { markChatNotificationsAsRead } = useNotifications();
  const { chatId, chatName, otherUserId } = route.params;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Set up navigation header
  useEffect(() => {
    navigation.setOptions({
      title: chatName,
      headerStyle: {
        backgroundColor: '#121212',
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        color: '#fff',
      },
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            showChatOptions();
          }}
          style={{ marginRight: 10 }}
        >
          <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, chatName]);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async (pageNum = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      console.log(`🔍 Fetching messages for chat ${chatId}, page ${pageNum}`);
      const response = await apiClient.get(`/api/chat/${chatId}/messages?page=${pageNum}&limit=50`);
      
      console.log(`📊 Received ${response.messages?.length || 0} messages`);
      
      if (pageNum === 1) {
        setMessages(response.messages || []);
        
        // Mark chat notifications as read when opening the chat
        try {
          console.log(`🔔 Marking notifications as read for chat: ${chatId}`);
          await markChatNotificationsAsRead(chatId);
        } catch (notifError) {
          console.error('❌ Failed to mark notifications as read:', notifError);
          // Don't show error to user, this is not critical
        }
      } else {
        setMessages(prev => [...(response.messages || []), ...prev]);
      }
      
      setHasMore(response.pagination?.hasMore || false);
      setPage(pageNum);
    } catch (error) {
      console.error('❌ Failed to fetch messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      console.log(`📤 Sending message to chat ${chatId}`);
      const response = await apiClient.post(`/api/chat/${chatId}/messages`, {
        content: messageContent,
        messageType: 'text'
      });

      console.log('✅ Message sent successfully');
      
      // Add the new message to the list
      setMessages(prev => [...prev, response.data]);
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch (error: any) {
      console.error('❌ Failed to send message:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to send message');
      // Restore the message text if sending failed
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };

  const loadMoreMessages = () => {
    if (!loadingMore && hasMore) {
      fetchMessages(page + 1);
    }
  };

  const showChatOptions = () => {
    Alert.alert(
      'Chat Options',
      'Choose an option',
      [
        {
          text: 'Clear Chat History',
          style: 'destructive',
          onPress: () => confirmClearChat()
        },
        {
          text: 'Delete Chat',
          style: 'destructive',
          onPress: () => confirmDeleteChat()
        },
        {
          text: 'Mute Notifications',
          onPress: () => toggleMuteChat()
        },
        {
          text: 'Block User',
          style: 'destructive',
          onPress: () => confirmBlockUser()
        },
        {
          text: 'Report Conversation',
          onPress: () => reportConversation()
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const confirmClearChat = () => {
    Alert.alert(
      'Clear Chat History',
      'Are you sure you want to clear all messages in this conversation? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearChatHistory }
      ]
    );
  };

  const clearChatHistory = async () => {
    try {
      await apiClient.delete(`/api/chat/${chatId}/messages`);
      setMessages([]);
      Alert.alert('Success', 'Chat history cleared successfully');
    } catch (error) {
      console.error('Failed to clear chat:', error);
      Alert.alert('Error', 'Failed to clear chat history. Please try again.');
    }
  };

  const confirmDeleteChat = () => {
    Alert.alert(
      'Delete Chat',
      'Are you sure you want to delete this conversation? This will remove the chat from your list and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: deleteChat }
      ]
    );
  };

  const deleteChat = async () => {
    try {
      await apiClient.delete(`/api/chat/${chatId}`);
      Alert.alert('Success', 'Chat deleted successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Failed to delete chat:', error);
      Alert.alert('Error', 'Failed to delete chat. Please try again.');
    }
  };

  const toggleMuteChat = async () => {
    try {
      await apiClient.post(`/api/chat/${chatId}/mute`);
      Alert.alert('Success', 'Notifications have been muted for this conversation');
    } catch (error) {
      console.error('Failed to mute chat:', error);
      Alert.alert('Error', 'Failed to mute notifications. Please try again.');
    }
  };

  const confirmBlockUser = () => {
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${chatName}? They will no longer be able to send you messages.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Block', style: 'destructive', onPress: blockUser }
      ]
    );
  };

  const blockUser = async () => {
    try {
      if (otherUserId) {
        await apiClient.post(`/api/chat/${chatId}/block`, { userId: otherUserId });
        Alert.alert('Success', `${chatName} has been blocked`, [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Failed to block user:', error);
      Alert.alert('Error', 'Failed to block user. Please try again.');
    }
  };

  const reportConversation = () => {
    Alert.alert(
      'Report Conversation',
      'What would you like to report this conversation for?',
      [
        {
          text: 'Spam',
          onPress: () => submitReport('spam')
        },
        {
          text: 'Harassment',
          onPress: () => submitReport('harassment')
        },
        {
          text: 'Inappropriate Content',
          onPress: () => submitReport('inappropriate')
        },
        {
          text: 'Scam/Fraud',
          onPress: () => submitReport('fraud')
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const submitReport = async (reason: string) => {
    try {
      await apiClient.post('/api/reports', {
        type: 'chat',
        chatId,
        otherUserId,
        reason,
        description: `Reported conversation with ${chatName} for ${reason}`
      });
      Alert.alert('Success', 'Report submitted successfully. We will review this conversation.');
    } catch (error) {
      console.error('Failed to submit report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    }
  };

  // Typing indicators
  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      // Send typing indicator to backend
      apiClient.post(`/api/chat/${chatId}/typing`, { isTyping: true })
        .catch(error => console.log('Failed to send typing indicator:', error));
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      apiClient.post(`/api/chat/${chatId}/typing`, { isTyping: false })
        .catch(error => console.log('Failed to send stop typing indicator:', error));
    }, 3000);
  };

  const handleStopTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isTyping) {
      setIsTyping(false);
      apiClient.post(`/api/chat/${chatId}/typing`, { isTyping: false })
        .catch(error => console.log('Failed to send stop typing indicator:', error));
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
    
    // Check if we need to show date separator
    const showDateSeparator = !prevMessage || 
      new Date(item.createdAt).toDateString() !== new Date(prevMessage.createdAt).toDateString();
    
    // Check if we need to show sender name (for group chats or when sender changes)
    const showSenderName = !item.isOwn && (!prevMessage || prevMessage.sender._id !== item.sender._id);
    
    // Check if this is the last message in a sequence from the same sender
    const isLastInSequence = !nextMessage || nextMessage.sender._id !== item.sender._id;

    return (
      <View>
        {showDateSeparator && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateSeparatorText}>
              {formatDate(item.createdAt)}
            </Text>
          </View>
        )}
        
        <View style={[
          styles.messageContainer,
          item.isOwn ? styles.ownMessage : styles.otherMessage
        ]}>
          {showSenderName && (
            <Text style={styles.senderName}>{item.sender.name}</Text>
          )}
          
          <View style={[
            styles.messageBubble,
            item.isOwn ? styles.ownBubble : styles.otherBubble,
            !isLastInSequence && styles.messageInSequence
          ]}>
            <Text style={[
              styles.messageText,
              item.isOwn ? styles.ownMessageText : styles.otherMessageText
            ]}>
              {item.content}
            </Text>
            
            <View style={styles.messageFooter}>
              <Text style={[
                styles.timeText,
                item.isOwn ? styles.ownTimeText : styles.otherTimeText
              ]}>
                {formatTime(item.createdAt)}
              </Text>
              
              {item.edited && (
                <Text style={styles.editedText}> • edited</Text>
              )}
              
              {item.isOwn && (
                <View style={styles.readStatus}>
                  <Ionicons 
                    name={item.readBy.length > 1 ? "checkmark-done" : "checkmark"} 
                    size={12} 
                    color={item.readBy.length > 1 ? COLORS.gold : "#666"} 
                  />
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubble-outline" size={60} color="#666" />
      <Text style={styles.emptyTitle}>Start the conversation</Text>
      <Text style={styles.emptySubtitle}>
        Send a message to {chatName}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.gold} />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item._id}
          renderItem={renderMessage}
          ListEmptyComponent={renderEmptyState}
          ListHeaderComponent={
            loadingMore ? (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color={COLORS.gold} />
              </View>
            ) : null
          }
          onEndReached={loadMoreMessages}
          onEndReachedThreshold={0.1}
          contentContainerStyle={messages.length === 0 ? styles.emptyList : styles.messagesList}
          showsVerticalScrollIndicator={false}
          inverted={false}
        />
        
        {/* Typing Indicator */}
        {otherUserTyping && (
          <View style={styles.typingIndicatorContainer}>
            <View style={styles.typingIndicator}>
              <Text style={styles.typingText}>{chatName} is typing</Text>
              <View style={styles.typingDots}>
                <View style={[styles.dot, styles.dot1]} />
                <View style={[styles.dot, styles.dot2]} />
                <View style={[styles.dot, styles.dot3]} />
              </View>
            </View>
          </View>
        )}
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor="#666"
            value={newMessage}
            onChangeText={(text) => {
              setNewMessage(text);
              if (text.trim().length > 0) {
                handleTyping();
              } else {
                handleStopTyping();
              }
            }}
            multiline
            maxLength={1000}
            returnKeyType="send"
            onSubmitEditing={() => {
              handleStopTyping();
              sendMessage();
            }}
            onBlur={handleStopTyping}
            editable={!sending}
          />
          
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newMessage.trim() || sending) && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Ionicons name="send" size={20} color="#000" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  messagesList: {
    padding: 16,
    paddingBottom: 0,
  },
  loadMoreContainer: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 20,
  },
  dateSeparatorText: {
    color: '#666',
    fontSize: 12,
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageContainer: {
    marginBottom: 8,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  senderName: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    marginHorizontal: 12,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  messageInSequence: {
    marginBottom: 2,
  },
  ownBubble: {
    backgroundColor: COLORS.gold,
    borderBottomRightRadius: 6,
  },
  otherBubble: {
    backgroundColor: '#2a2a2a',
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#000',
  },
  otherMessageText: {
    color: '#fff',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timeText: {
    fontSize: 10,
    opacity: 0.7,
  },
  ownTimeText: {
    color: '#000',
  },
  otherTimeText: {
    color: '#ccc',
  },
  editedText: {
    fontSize: 10,
    opacity: 0.5,
    color: '#666',
  },
  readStatus: {
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    color: '#fff',
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#333',
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
  typingIndicatorContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  typingText: {
    color: '#ccc',
    fontSize: 12,
    fontStyle: 'italic',
    marginRight: 8,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    backgroundColor: '#666',
    borderRadius: 2,
    marginHorizontal: 1,
  },
  dot1: {
    animationDelay: '0s',
  },
  dot2: {
    animationDelay: '0.2s',
  },
  dot3: {
    animationDelay: '0.4s',
  },
});
