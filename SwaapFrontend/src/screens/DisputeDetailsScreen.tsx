import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Image,
  FlatList,
  Modal,
  Dimensions
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { apiClient } from '@config/index';
import COLORS from '@constants/colors';

const { width: screenWidth } = Dimensions.get('window');

interface RouteParams {
  disputeId: string;
}

interface DisputeMessage {
  _id: string;
  sender: {
    _id: string;
    fullName: string;
    profileImage?: string;
  };
  senderType: string;
  content: string;
  timestamp: string;
  attachments: Array<{
    url: string;
    type: string;
    description?: string;
  }>;
  readBy: Array<{
    user: string;
    readAt: string;
  }>;
}

interface ProposedSolution {
  _id: string;
  proposedBy: {
    _id: string;
    fullName: string;
  };
  proposerType: string;
  solution: string;
  solutionType: string;
  amount: number;
  acceptedBy: Array<{
    user: string;
    acceptedAt: string;
  }>;
  rejectedBy: Array<{
    user: string;
    rejectedAt: string;
    reason?: string;
  }>;
  proposedAt: string;
}

export default function DisputeDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { disputeId } = route.params as RouteParams;
  
  const [dispute, setDispute] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showSolutionModal, setShowSolutionModal] = useState(false);
  const [solutionText, setSolutionText] = useState('');
  const [solutionType, setSolutionType] = useState('partial_refund');
  const [solutionAmount, setSolutionAmount] = useState('');
  
  const scrollViewRef = useRef<ScrollView>(null);
  const flatListRef = useRef<FlatList>(null);

  // Fetch dispute details
  const fetchDisputeDetails = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/disputes/${disputeId}`);
      
      if (response.success) {
        setDispute(response.dispute);
        // Scroll to bottom of messages
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        throw new Error(response.error);
      }
    } catch (error: any) {
      console.error('Fetch dispute details error:', error);
      Alert.alert('Error', 'Failed to load dispute details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputeDetails();
    
    // Set up polling for real-time updates
    const interval = setInterval(fetchDisputeDetails, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [disputeId]);

  // Send message
  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    
    try {
      setSendingMessage(true);
      const response = await apiClient.post(`/api/disputes/${disputeId}/messages`, {
        content: messageText.trim()
      });
      
      if (response.success) {
        setMessageText('');
        await fetchDisputeDetails(); // Refresh to get new message
      } else {
        throw new Error(response.error);
      }
    } catch (error: any) {
      console.error('Send message error:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  // Upload evidence
  const handleUploadEvidence = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        Alert.prompt(
          'Add Description',
          'Describe this evidence (optional)',
          async (description) => {
            try {
              const formData = new FormData();
              formData.append('evidence', {
                uri: asset.uri,
                type: asset.type || 'image/jpeg',
                name: asset.fileName || 'evidence.jpg',
              } as any);
              
              if (description) {
                formData.append('description', description);
              }

              const response = await apiClient.post(
                `/api/disputes/${disputeId}/evidence`,
                formData,
                {
                  headers: {
                    'Content-Type': 'multipart/form-data',
                  },
                }
              );

              if (response.success) {
                Alert.alert('Success', 'Evidence uploaded successfully');
                await fetchDisputeDetails();
              } else {
                throw new Error(response.error);
              }
            } catch (error: any) {
              console.error('Upload evidence error:', error);
              Alert.alert('Error', 'Failed to upload evidence');
            }
          }
        );
      }
    } catch (error: any) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // Propose solution
  const handleProposeSolution = async () => {
    if (!solutionText.trim()) {
      Alert.alert('Error', 'Please enter a solution description');
      return;
    }

    try {
      const response = await apiClient.post(`/api/disputes/${disputeId}/propose-solution`, {
        solution: solutionText.trim(),
        solutionType,
        amount: solutionAmount ? parseFloat(solutionAmount) : 0
      });

      if (response.success) {
        setShowSolutionModal(false);
        setSolutionText('');
        setSolutionAmount('');
        Alert.alert('Success', 'Solution proposed successfully');
        await fetchDisputeDetails();
      } else {
        throw new Error(response.error);
      }
    } catch (error: any) {
      console.error('Propose solution error:', error);
      Alert.alert('Error', 'Failed to propose solution');
    }
  };

  // Accept/Reject solution
  const handleRespondToSolution = async (solutionId: string, action: 'accept' | 'reject') => {
    try {
      const response = await apiClient.patch(
        `/api/disputes/${disputeId}/solutions/${solutionId}/respond`,
        { action }
      );

      if (response.success) {
        Alert.alert('Success', `Solution ${action}ed successfully`);
        await fetchDisputeDetails();
      } else {
        throw new Error(response.error);
      }
    } catch (error: any) {
      console.error('Respond to solution error:', error);
      Alert.alert('Error', `Failed to ${action} solution`);
    }
  };

  // Escalate dispute
  const handleEscalate = async () => {
    Alert.prompt(
      'Escalate Dispute',
      'Please provide a reason for escalation:',
      async (reason) => {
        if (!reason?.trim()) return;
        
        try {
          const response = await apiClient.post(`/api/disputes/${disputeId}/escalate`, {
            reason: reason.trim()
          });

          if (response.success) {
            Alert.alert('Success', 'Dispute escalated to arbitrator');
            await fetchDisputeDetails();
          } else {
            throw new Error(response.error);
          }
        } catch (error: any) {
          console.error('Escalate dispute error:', error);
          Alert.alert('Error', 'Failed to escalate dispute');
        }
      }
    );
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Render message item
  const renderMessage = ({ item }: { item: DisputeMessage }) => {
    const isCurrentUser = item.senderType === 'complainant'; // Replace with actual user type check
    
    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
      ]}>
        <View style={styles.messageHeader}>
          <Text style={styles.senderName}>{item.sender.fullName}</Text>
          <Text style={styles.senderType}>({item.senderType})</Text>
          <Text style={styles.messageTime}>{formatDate(item.timestamp)}</Text>
        </View>
        
        <Text style={styles.messageContent}>{item.content}</Text>
        
        {item.attachments?.map((attachment, index) => (
          <TouchableOpacity 
            key={index}
            style={styles.attachment}
            onPress={() => setSelectedImage(attachment.url)}
          >
            {attachment.type.startsWith('image/') ? (
              <Image source={{ uri: attachment.url }} style={styles.attachmentImage} />
            ) : (
              <View style={styles.fileAttachment}>
                <Ionicons name="document-outline" size={24} color={COLORS.gold} />
                <Text style={styles.attachmentText}>Document</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Render proposed solution
  const renderSolution = ({ item }: { item: ProposedSolution }) => (
    <View style={styles.solutionCard}>
      <View style={styles.solutionHeader}>
        <Text style={styles.solutionProposer}>
          Proposed by {item.proposedBy.fullName} ({item.proposerType})
        </Text>
        <Text style={styles.solutionDate}>{formatDate(item.proposedAt)}</Text>
      </View>
      
      <View style={styles.solutionType}>
        <Text style={styles.solutionTypeText}>{item.solutionType.replace('_', ' ').toUpperCase()}</Text>
        {item.amount > 0 && (
          <Text style={styles.solutionAmount}>₦{item.amount.toLocaleString()}</Text>
        )}
      </View>
      
      <Text style={styles.solutionText}>{item.solution}</Text>
      
      <View style={styles.solutionActions}>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleRespondToSolution(item._id, 'accept')}
        >
          <Ionicons name="checkmark" size={16} color="#fff" />
          <Text style={styles.acceptButtonText}>Accept</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={() => handleRespondToSolution(item._id, 'reject')}
        >
          <Ionicons name="close" size={16} color="#fff" />
          <Text style={styles.rejectButtonText}>Reject</Text>
        </TouchableOpacity>
      </View>
      
      {/* Show acceptance/rejection status */}
      {item.acceptedBy.length > 0 && (
        <Text style={styles.acceptanceStatus}>
          ✅ Accepted by {item.acceptedBy.length} party(ies)
        </Text>
      )}
      {item.rejectedBy.length > 0 && (
        <Text style={styles.rejectionStatus}>
          ❌ Rejected by {item.rejectedBy.length} party(ies)
        </Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.gold} />
        <Text style={styles.loadingText}>Loading dispute details...</Text>
      </View>
    );
  }

  if (!dispute) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Dispute not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.gold} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dispute #{dispute.disputeId}</Text>
        <TouchableOpacity onPress={handleEscalate}>
          <Ionicons name="trending-up-outline" size={24} color={COLORS.gold} />
        </TouchableOpacity>
      </View>

      <ScrollView ref={scrollViewRef} style={styles.scrollView}>
        {/* Dispute Info */}
        <View style={styles.disputeInfo}>
          <Text style={styles.disputeSubject}>{dispute.subject}</Text>
          <Text style={styles.disputeCategory}>{dispute.category}</Text>
          <Text style={styles.disputeStatus}>Status: {dispute.status}</Text>
          <Text style={styles.disputeDescription}>{dispute.description}</Text>
        </View>

        {/* Evidence Section */}
        {dispute.evidence && dispute.evidence.length > 0 && (
          <View style={styles.evidenceSection}>
            <Text style={styles.sectionTitle}>Evidence</Text>
            {dispute.evidence.map((evidence: any, index: number) => (
              <TouchableOpacity 
                key={index}
                style={styles.evidenceItem}
                onPress={() => setSelectedImage(evidence.url)}
              >
                <Ionicons name="image-outline" size={20} color={COLORS.gold} />
                <Text style={styles.evidenceText}>{evidence.description || 'Evidence'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Proposed Solutions */}
        {dispute.proposedSolutions && dispute.proposedSolutions.length > 0 && (
          <View style={styles.solutionsSection}>
            <Text style={styles.sectionTitle}>Proposed Solutions</Text>
            <FlatList
              data={dispute.proposedSolutions}
              keyExtractor={(item) => item._id}
              renderItem={renderSolution}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Messages */}
        <View style={styles.messagesSection}>
          <Text style={styles.sectionTitle}>Discussion</Text>
          <FlatList
            ref={flatListRef}
            data={dispute.messages}
            keyExtractor={(item) => item._id}
            renderItem={renderMessage}
            scrollEnabled={false}
            style={styles.messagesList}
          />
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.evidenceButton} onPress={handleUploadEvidence}>
          <Ionicons name="camera-outline" size={16} color="#fff" />
          <Text style={styles.buttonText}>Evidence</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.solutionButton} onPress={() => setShowSolutionModal(true)}>
          <Ionicons name="bulb-outline" size={16} color="#fff" />
          <Text style={styles.buttonText}>Solution</Text>
        </TouchableOpacity>
      </View>

      {/* Message Input */}
      <View style={styles.messageInputContainer}>
        <TextInput
          style={styles.messageInput}
          placeholder="Type your message..."
          placeholderTextColor="#666"
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!messageText.trim() || sendingMessage}
        >
          {sendingMessage ? (
            <ActivityIndicator size="small" color="#121212" />
          ) : (
            <Ionicons name="send" size={20} color="#121212" />
          )}
        </TouchableOpacity>
      </View>

      {/* Solution Modal */}
      <Modal visible={showSolutionModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Propose Solution</Text>
            <TouchableOpacity onPress={() => setShowSolutionModal(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalLabel}>Solution Type</Text>
            {/* Add solution type picker here */}
            
            <Text style={styles.modalLabel}>Description</Text>
            <TextInput
              style={styles.modalTextInput}
              placeholder="Describe your proposed solution..."
              placeholderTextColor="#666"
              value={solutionText}
              onChangeText={setSolutionText}
              multiline
              numberOfLines={4}
            />
            
            <Text style={styles.modalLabel}>Amount (if applicable)</Text>
            <TextInput
              style={styles.modalAmountInput}
              placeholder="0"
              placeholderTextColor="#666"
              value={solutionAmount}
              onChangeText={setSolutionAmount}
              keyboardType="numeric"
            />
            
            <TouchableOpacity style={styles.proposeSolutionButton} onPress={handleProposeSolution}>
              <Text style={styles.proposeSolutionButtonText}>Propose Solution</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Image Modal */}
      <Modal visible={!!selectedImage} transparent>
        <View style={styles.imageModalContainer}>
          <TouchableOpacity 
            style={styles.imageModalOverlay}
            onPress={() => setSelectedImage(null)}
          >
            <Image source={{ uri: selectedImage || '' }} style={styles.fullScreenImage} />
          </TouchableOpacity>
        </View>
      </Modal>
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
    color: '#666',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  disputeInfo: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  disputeSubject: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  disputeCategory: {
    color: COLORS.gold,
    fontSize: 12,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  disputeStatus: {
    color: '#666',
    fontSize: 12,
    marginBottom: 12,
  },
  disputeDescription: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
  evidenceSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  evidenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  evidenceText: {
    color: '#fff',
    marginLeft: 8,
  },
  solutionsSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  solutionCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  solutionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  solutionProposer: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: '600',
  },
  solutionDate: {
    color: '#666',
    fontSize: 12,
  },
  solutionType: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  solutionTypeText: {
    color: '#4ECDC4',
    fontSize: 12,
    fontWeight: 'bold',
  },
  solutionAmount: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  solutionText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  solutionActions: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2ECC71',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E74C3C',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  acceptanceStatus: {
    color: '#2ECC71',
    fontSize: 12,
    marginTop: 8,
  },
  rejectionStatus: {
    color: '#E74C3C',
    fontSize: 12,
    marginTop: 8,
  },
  messagesSection: {
    padding: 16,
  },
  messagesList: {
    maxHeight: 300,
  },
  messageContainer: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
    backgroundColor: `${COLORS.gold}20`,
    borderColor: `${COLORS.gold}30`,
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  senderName: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: 'bold',
  },
  senderType: {
    color: '#666',
    fontSize: 10,
    marginLeft: 4,
  },
  messageTime: {
    color: '#666',
    fontSize: 10,
    marginLeft: 'auto',
  },
  messageContent: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 18,
  },
  attachment: {
    marginTop: 8,
  },
  attachmentImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#333',
    borderRadius: 6,
  },
  attachmentText: {
    color: '#fff',
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  evidenceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  solutionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9500',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
    gap: 12,
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: COLORS.gold,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  modalTextInput: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    textAlignVertical: 'top',
  },
  modalAmountInput: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
  },
  proposeSolutionButton: {
    backgroundColor: COLORS.gold,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  proposeSolutionButtonText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalOverlay: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: screenWidth * 0.9,
    height: screenWidth * 0.9,
    resizeMode: 'contain',
  },
});