// Updated Support Chat Screen with USER-SPECIFIC conversations
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import axios from 'axios';
import moment from 'moment';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io, Socket } from 'socket.io-client';
import { getUniqueId } from 'react-native-device-info';

// ✅ Use centralized API config
import { API, SOCKET_URL, STORAGE_KEYS, CHAT_CONFIG, supportAPI } from '@/config/index';

type Message = {
  _id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
};

type ChatStatus = 'active' | 'waiting_for_agent' | 'with_agent' | 'resolved';

const API_BASE = API.support.base;
const USER_KEY = STORAGE_KEYS.USER_DATA;

let socket: Socket;

const SupportChatScreen = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [chatStatus, setChatStatus] = useState<ChatStatus>('active');
  const [agentName, setAgentName] = useState<string | null>(null);
  const [isEscalating, setIsEscalating] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    initChat();

    // Keyboard listeners
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
      scrollToBottom();
    });
    
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  // Setup socket when we have conversationId
  useEffect(() => {
    if (conversationId && userId) {
      setupSocket();
    }
  }, [conversationId, userId]);

  const setupSocket = () => {
    try {
      socket = io(SOCKET_URL, {
        timeout: CHAT_CONFIG.SOCKET_TIMEOUT,
        transports: ['websocket', 'polling']
      });

      socket.on('connect', () => {
        console.log('✅ Socket connected');
        if (conversationId) {
          socket.emit('join', conversationId);
          console.log('🔗 Joined conversation:', conversationId);
        }
      });

      socket.on('newMessage', (newMsg: Message) => {
        console.log('📩 New message received:', newMsg);
        // Only add message if it belongs to this conversation
        if (newMsg.conversationId === conversationId) {
          setMessages(prev => {
            const exists = prev.find(msg => msg._id === newMsg._id);
            if (exists) return prev;
            return [...prev, newMsg];
          });
          scrollToBottom();
        }
      });

      socket.on('agentJoined', (data: { agentName: string }) => {
        console.log('👨‍💼 Agent joined:', data.agentName);
        setAgentName(data.agentName);
        setChatStatus('with_agent');
        Alert.alert(
          '👨‍💼 Human Agent Joined',
          `${data.agentName} from our support team has joined the conversation and is ready to help you!`,
          [{ text: 'Great!', style: 'default' }]
        );
      });

      socket.on('chatStatusUpdate', (data: { status: ChatStatus }) => {
        setChatStatus(data.status);
      });

    } catch (error) {
      console.error('❌ Socket setup error:', error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const getUserInfo = async () => {
    try {
      console.log('🔍 Getting user info from AsyncStorage...');
      
      const userData = await AsyncStorage.getItem(USER_KEY);
      console.log('🔍 Raw user data from storage:', userData);
      
      if (userData && userData !== 'null') {
        try {
          const user = JSON.parse(userData) as { _id?: string; id?: string; fullName?: string; name?: string };
          console.log('🔍 Parsed user object:', user);
          
          const userIdFromStorage = user._id || user.id || 'anonymous';
          const userNameFromStorage = user.fullName || user.name || 'there';
          
          console.log('🔍 Extracted info:', { 
            userId: userIdFromStorage, 
            userName: userNameFromStorage,
          });
          
          setUserId(userIdFromStorage);
          setUserName(userNameFromStorage);
          
          console.log('✅ User state updated - ID:', userIdFromStorage, 'Name:', userNameFromStorage);
          return { userId: userIdFromStorage, userName: userNameFromStorage };
        } catch (parseError) {
          console.error('❌ JSON parse error:', parseError);
          setUserId('anonymous');
          setUserName('there');
          return { userId: 'anonymous', userName: 'there' };
        }
      } else {
        console.log('ℹ️ No user data found in storage');
        setUserId('anonymous');
        setUserName('there');
        return { userId: 'anonymous', userName: 'there' };
      }
    } catch (error) {
      console.error('❌ Error getting user info:', error);
      setUserId('anonymous');
      setUserName('there');
      return { userId: 'anonymous', userName: 'there' };
    }
  };

  const initChat = async () => {
    try {
      console.log('🔄 Initializing chat...');
      setLoading(true);
      
      const { userId: currentUserId, userName: currentUserName } = await getUserInfo();
      
      // ✅ CREATE USER-SPECIFIC CONVERSATION ID
      const userConversationId = `support_${currentUserId}`;
      setConversationId(userConversationId);
      
      console.log('🆔 Created conversation ID:', userConversationId);
      
      // Show welcome message immediately
      const welcomeMessage: Message = {
        _id: 'welcome-' + Date.now(),
        conversationId: userConversationId,
        senderId: 'support',
        text: `Hello ${currentUserName || 'there'}! 👋 Welcome to Swaap support. How can I help you today?`,
        createdAt: new Date().toISOString(),
      };
      
      setMessages([welcomeMessage]);
      console.log('✅ Welcome message displayed');
      
      // Try to load existing messages for THIS USER
      setTimeout(async () => {
        try {
          console.log('📥 Loading messages for conversation:', userConversationId);
          const response = await axios.get(`${API_BASE}/${userConversationId}`, { timeout: 5000 });
          
          if (response.data.success && response.data.messages && response.data.messages.length > 0) {
            console.log('📥 Loaded existing messages:', response.data.messages.length);
            setMessages(response.data.messages);
          } else {
            console.log('ℹ️ No existing messages found for this user');
          }
        } catch (error) {
          console.log('ℹ️ Could not load existing messages:', error.message);
        }
      }, 100);

    } catch (err: any) {
      console.error('❌ Init chat error:', err.message);
      
      const fallbackMessage: Message = {
        _id: 'welcome-fallback-' + Date.now(),
        conversationId: 'support_anonymous',
        senderId: 'support',
        text: `Hello! 👋 Welcome to Swaap support. How can I help you today?`,
        createdAt: new Date().toISOString(),
      };
      
      setMessages([fallbackMessage]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollToBottom(), 100);
    }
  };

  const escalateToHuman = async () => {
    if (!conversationId || !userId || isEscalating) return;

    Alert.alert(
      '👨‍💼 Connect to Human Agent',
      'Would you like to speak with a human support agent? They can provide personalized assistance with complex issues.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes, Connect Me', 
          style: 'default',
          onPress: async () => {
            setIsEscalating(true);
            try {
              console.log('🔄 Escalating to human agent...');
              
              const response = await supportAPI.escalateToHuman(conversationId, userId);

              if (response.data.success) {
                setChatStatus('waiting_for_agent');
                console.log('✅ Successfully escalated to human agent');
              }

            } catch (error) {
              console.error('❌ Escalation error:', error);
              Alert.alert('Error', 'Failed to connect to human agent. Please try again.');
            } finally {
              setIsEscalating(false);
            }
          }
        }
      ]
    );
  };

  const handleSend = async () => {
    if (!inputText.trim() || !conversationId || !userId) {
      console.log('❌ Cannot send: missing data', { inputText: !!inputText.trim(), conversationId, userId });
      return;
    }
    
    Keyboard.dismiss();
    inputRef.current?.blur();
    
    setSending(true);
    const messageText = inputText.trim();
    const tempId = 'temp-' + Date.now();
    
    const userMessage: Message = {
      _id: tempId,
      conversationId,
      senderId: userId,
      text: messageText,
      createdAt: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    scrollToBottom();

    try {
      console.log('📤 Sending message to conversation:', conversationId);
      
      const response = await supportAPI.sendMessage(userId, messageText);

      console.log('✅ Message sent:', response.data);

      if (response.data.success) {
        const realUserMessage = response.data.message;
        const aiResponse = response.data.aiResponse;
        
        setMessages(prev => {
          const filtered = prev.filter(msg => msg._id !== tempId);
          const newMessages = [...filtered];
          
          if (realUserMessage) {
            newMessages.push(realUserMessage);
          }
          
          if (aiResponse) {
            newMessages.push(aiResponse);
          }
          
          return newMessages;
        });
        
        // Update chat status if escalated
        if (response.data.needsHumanAgent) {
          setChatStatus('waiting_for_agent');
        }
        
        scrollToBottom();
      }

    } catch (err: any) {
      console.error('❌ Send error:', err.message);
      
      const errorMessage: Message = {
        _id: 'error-' + Date.now(),
        conversationId,
        senderId: 'support',
        text: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
        createdAt: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
      scrollToBottom();
      
    } finally {
      setSending(false);
    }
  };

  const handleSubmitEditing = () => {
    if (inputText.trim()) {
      handleSend();
    } else {
      Keyboard.dismiss();
    }
  };

  const onRefresh = async () => {
    if (!conversationId) return;
    setRefreshing(true);
    try {
      console.log('🔄 Refreshing messages for:', conversationId);
      const response = await supportAPI.getMessages(conversationId);
      if (response.success) {
        setMessages(response.messages as Message[] || []);
      }
    } catch (error) {
      console.error('❌ Refresh error:', error);
    }
    setRefreshing(false);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.senderId !== 'support' && item.senderId !== 'system';
    const isSystem = item.senderId === 'system';
    const isAgent = agentName && item.senderId !== 'support' && item.senderId !== userId && item.senderId !== 'system';
    
    let displayName = 'You';
    let avatarBg = '#007AFF';
    let avatarText = (userName || 'U').charAt(0).toUpperCase();

    if (isSystem) {
      displayName = 'System';
      avatarBg = '#FF9500';
      avatarText = '⚙️';
    } else if (isAgent) {
      displayName = agentName || 'Support Agent';
      avatarBg = '#FF3B30';
      avatarText = '👨‍💼';
    } else if (!isUser) {
      displayName = chatStatus === 'with_agent' ? (agentName || 'Support Agent') : 'Swaap AI';
      avatarBg = chatStatus === 'with_agent' ? '#FF3B30' : '#34C759';
      avatarText = chatStatus === 'with_agent' ? '👨‍💼' : '🤖';
    }

    const time = moment(item.createdAt).format('hh:mm A');

    return (
      <View style={[styles.messageRow, isUser ? styles.alignRight : styles.alignLeft]}>
        <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
          <Text style={styles.avatarText}>{avatarText}</Text>
        </View>
        <View style={[
          styles.messageBubble, 
          isUser ? styles.userBubble : isSystem ? styles.systemBubble : styles.supportBubble
        ]}>
          <Text style={styles.messageSender}>{displayName}</Text>
          <Text style={styles.messageText}>{item.text}</Text>
          <Text style={styles.timestamp}>{time}</Text>
        </View>
      </View>
    );
  };

  const getStatusText = () => {
    switch (chatStatus) {
      case 'waiting_for_agent':
        return '⏳ Connecting to human agent...';
      case 'with_agent':
        return `👨‍💼 Connected with ${agentName || 'Support Agent'}`;
      default:
        return '🤖 AI Assistant';
    }
  };

  const getStatusColor = () => {
    switch (chatStatus) {
      case 'waiting_for_agent':
        return '#FF9500';
      case 'with_agent':
        return '#FF3B30';
      default:
        return '#34C759';
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Support Chat</Text>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={styles.headerSubtitle}>{getStatusText()}</Text>
        </View>
        {/* Show user name */}
        {userName && (
          <Text style={[styles.headerSubtitle, { fontSize: 12, marginTop: 4, fontStyle: 'italic' }]}>
            Welcome, {userName}
          </Text>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Starting chat...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item._id}
          renderItem={renderMessage}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ 
            paddingBottom: keyboardVisible ? 20 : 100,
            flexGrow: 1 
          }}
          onContentSizeChange={scrollToBottom}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}

      <View style={styles.inputContainer}>
        {chatStatus === 'active' && (
          <TouchableOpacity 
            onPress={escalateToHuman}
            style={styles.escalateButton}
            disabled={isEscalating}
          >
            <Text style={styles.escalateButtonText}>
              {isEscalating ? '⏳' : '👨‍💼'}
            </Text>
          </TouchableOpacity>
        )}
        
        <TextInput
          ref={inputRef}
          placeholder="Type your message..."
          placeholderTextColor="#8e8e93"
          style={[styles.input, chatStatus === 'active' && styles.inputWithEscalate]}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={handleSubmitEditing}
          blurOnSubmit={false}
        />
        
        <TouchableOpacity 
          style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]} 
          onPress={handleSend} 
          disabled={sending || !inputText.trim()}
        >
          <Text style={styles.sendButtonText}>
            {sending ? '⏳' : '➤'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    backgroundColor: '#1e1e1e',
    padding: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#b0b0b0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#b0b0b0',
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 4,
    marginHorizontal: 12,
    alignItems: 'flex-start',
    gap: 8,
  },
  alignRight: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  alignLeft: {
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  messageBubble: {
    borderRadius: 12,
    padding: 12,
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  userBubble: {
    backgroundColor: '#007AFF',
  },
  supportBubble: {
    backgroundColor: '#2c2c2e',
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  systemBubble: {
    backgroundColor: '#FF9500',
    alignSelf: 'center',
  },
  messageSender: {
    fontWeight: '600',
    fontSize: 12,
    marginBottom: 4,
    color: '#ffffff',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    color: '#ffffff',
  },
  timestamp: {
    fontSize: 10,
    color: '#8e8e93',
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#1e1e1e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
    gap: 8,
  },
  escalateButton: {
    backgroundColor: '#FF3B30',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  escalateButtonText: {
    fontSize: 18,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#3a3a3c',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    backgroundColor: '#2c2c2e',
    color: '#ffffff',
  },
  inputWithEscalate: {
    marginLeft: 0,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#48484a',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 18,
  },
});

export default SupportChatScreen;