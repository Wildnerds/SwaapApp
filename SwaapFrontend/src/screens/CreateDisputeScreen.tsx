import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@config/index';
import COLORS from '@constants/colors';

interface RouteParams {
  orderId: string;
  orderNumber: string;
  respondentId: string;
  respondentName: string;
}

const DISPUTE_CATEGORIES = [
  {
    id: 'item_not_received',
    title: 'Item Not Received',
    description: 'I paid but never received the item',
    icon: 'cube-outline'
  },
  {
    id: 'item_damaged',
    title: 'Item Damaged',
    description: 'Item arrived damaged or broken',
    icon: 'alert-circle-outline'
  },
  {
    id: 'item_not_as_described',
    title: 'Not As Described',
    description: 'Item doesn\'t match the description or photos',
    icon: 'eye-outline'
  },
  {
    id: 'payment_not_received',
    title: 'Payment Not Received',
    description: 'I sent the item but didn\'t receive payment',
    icon: 'card-outline'
  },
  {
    id: 'swap_item_mismatch',
    title: 'Swap Item Mismatch',
    description: 'Received wrong item in swap exchange',
    icon: 'swap-horizontal-outline'
  },
  {
    id: 'delivery_issues',
    title: 'Delivery Issues',
    description: 'Problems with shipping or delivery',
    icon: 'airplane-outline'
  },
  {
    id: 'communication_issues',
    title: 'Communication Issues',
    description: 'Seller/buyer not responding or being difficult',
    icon: 'chatbubble-outline'
  },
  {
    id: 'fraud_suspected',
    title: 'Fraud Suspected',
    description: 'I suspect fraudulent activity',
    icon: 'shield-outline'
  },
  {
    id: 'other',
    title: 'Other',
    description: 'Issue not covered by above categories',
    icon: 'help-circle-outline'
  }
];

export default function CreateDisputeScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { orderId, orderNumber, respondentId, respondentName } = route.params as RouteParams;

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    // Validation
    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a dispute category');
      return;
    }
    
    if (!subject.trim()) {
      Alert.alert('Error', 'Please enter a subject');
      return;
    }
    
    if (!description.trim()) {
      Alert.alert('Error', 'Please describe the issue');
      return;
    }
    
    if (description.trim().length < 50) {
      Alert.alert('Error', 'Please provide more details (at least 50 characters)');
      return;
    }

    try {
      setLoading(true);
      
      const response = await apiClient.post('/api/disputes/create', {
        orderId,
        category: selectedCategory,
        subject: subject.trim(),
        description: description.trim(),
        respondentId
      });

      if (response.success) {
        Alert.alert(
          'Dispute Created',
          `Your dispute has been submitted successfully. Dispute ID: ${response.dispute.disputeId}`,
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.navigate('DisputeDetails', {
                  disputeId: response.dispute.disputeId
                });
              }
            }
          ]
        );
      } else {
        throw new Error(response.error || 'Failed to create dispute');
      }
    } catch (error: any) {
      console.error('Create dispute error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to create dispute. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = DISPUTE_CATEGORIES.find(cat => cat.id === categoryId);
    return category?.icon || 'help-circle-outline';
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.gold} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Dispute</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Order Info */}
        <View style={styles.orderInfo}>
          <Ionicons name="document-text-outline" size={20} color={COLORS.gold} />
          <View style={styles.orderDetails}>
            <Text style={styles.orderLabel}>Order #{orderNumber}</Text>
            <Text style={styles.orderText}>Dispute with: {respondentName}</Text>
          </View>
        </View>

        {/* Category Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What's the issue?</Text>
          <Text style={styles.sectionSubtitle}>Select the category that best describes your problem</Text>
          
          <View style={styles.categoryGrid}>
            {DISPUTE_CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryCard,
                  selectedCategory === category.id && styles.selectedCategory
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Ionicons 
                  name={category.icon as any} 
                  size={24} 
                  color={selectedCategory === category.id ? COLORS.gold : '#666'} 
                />
                <Text style={[
                  styles.categoryTitle,
                  selectedCategory === category.id && styles.selectedCategoryText
                ]}>
                  {category.title}
                </Text>
                <Text style={styles.categoryDescription}>
                  {category.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Subject Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subject</Text>
          <Text style={styles.sectionSubtitle}>Brief summary of the issue</Text>
          <TextInput
            style={styles.subjectInput}
            placeholder="Enter dispute subject..."
            placeholderTextColor="#666"
            value={subject}
            onChangeText={setSubject}
            maxLength={200}
          />
          <Text style={styles.characterCount}>{subject.length}/200</Text>
        </View>

        {/* Description Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detailed Description</Text>
          <Text style={styles.sectionSubtitle}>
            Provide as much detail as possible to help us resolve your issue
          </Text>
          <TextInput
            style={styles.descriptionInput}
            placeholder="Describe what happened, when it happened, and what you expected..."
            placeholderTextColor="#666"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={2000}
          />
          <Text style={styles.characterCount}>{description.length}/2000</Text>
        </View>

        {/* Important Note */}
        <View style={styles.noteContainer}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.gold} />
          <View style={styles.noteContent}>
            <Text style={styles.noteTitle}>Important</Text>
            <Text style={styles.noteText}>
              • You'll be able to upload evidence after creating the dispute{'\n'}
              • Both parties will be notified and can respond{'\n'}
              • Our team will review and help resolve the issue{'\n'}
              • Response time: 24-72 hours
            </Text>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!selectedCategory || !subject.trim() || !description.trim() || loading) && 
            styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={!selectedCategory || !subject.trim() || !description.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#121212" />
          ) : (
            <>
              <Ionicons name="send-outline" size={18} color="#121212" />
              <Text style={styles.submitButtonText}>Submit Dispute</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollView: {
    flex: 1,
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  orderDetails: {
    marginLeft: 12,
    flex: 1,
  },
  orderLabel: {
    color: COLORS.gold,
    fontSize: 16,
    fontWeight: '600',
  },
  orderText: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 2,
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: '#666',
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 12,
    alignItems: 'center',
  },
  selectedCategory: {
    borderColor: COLORS.gold,
    backgroundColor: `${COLORS.gold}10`,
  },
  categoryTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  selectedCategoryText: {
    color: COLORS.gold,
  },
  categoryDescription: {
    color: '#666',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  subjectInput: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  descriptionInput: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    minHeight: 120,
  },
  characterCount: {
    color: '#666',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  noteContainer: {
    flexDirection: 'row',
    backgroundColor: `${COLORS.gold}10`,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${COLORS.gold}30`,
  },
  noteContent: {
    marginLeft: 12,
    flex: 1,
  },
  noteTitle: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  noteText: {
    color: '#ccc',
    fontSize: 12,
    lineHeight: 18,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gold,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: 'bold',
  },
});