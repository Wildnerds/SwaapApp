import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  StyleSheet,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '@navigation/types';
import COLORS from '@constants/colors';
import { StarRating } from '@/components/rating/StarRating';
import { apiClient } from '@config/index';
import { useAuth } from '@context/AuthContext';

type UserReviewsRouteProp = RouteProp<RootStackParamList, 'UserReviews'>;

interface UserReview {
  _id: string;
  rating: number;
  comment: string;
  reviewType: 'seller' | 'buyer' | 'swapper';
  reviewerName: string;
  createdAt: string;
  helpful: number;
  userHelpfulVote: boolean;
  verified: boolean;
}

interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  reviewTypeBreakdown: {
    seller: number;
    buyer: number;
    swapper: number;
  };
}

export default function UserReviewsScreen() {
  const route = useRoute<UserReviewsRouteProp>();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { userId, userName } = route.params;

  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedType, setSelectedType] = useState<'all' | 'seller' | 'buyer' | 'swapper'>('all');
  
  // Write review modal state
  const [writeModalVisible, setWriteModalVisible] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [reviewType, setReviewType] = useState<'seller' | 'buyer' | 'swapper'>('seller');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: `${userName}'s Reviews`,
      headerStyle: { backgroundColor: '#121212' },
      headerTintColor: '#fff',
      headerTitleStyle: { color: '#fff' },
    });
  }, [navigation, userName]);

  useEffect(() => {
    fetchReviews();
    checkCanReview();
  }, [selectedType]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const typeParam = selectedType === 'all' ? '' : `&type=${selectedType}`;
      console.log(`🔍 Fetching reviews for user ${userId} with filter: ${selectedType}`);
      const response = await apiClient.get(`/api/users/${userId}/reviews?${typeParam}`);
      
      console.log(`📊 Received reviews response:`, {
        reviewsCount: response.reviews?.length || 0,
        reviews: response.reviews,
        summary: response.summary
      });
      
      setReviews(response.reviews || []);
      setSummary(response.summary || null);
    } catch (error) {
      console.error('Failed to fetch user reviews:', error);
      Alert.alert('Error', 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const checkCanReview = async () => {
    if (!user) return;
    
    try {
      const response = await apiClient.get(`/api/users/${userId}/can-review`);
      setCanReview(response.canReview || false);
    } catch (error) {
      console.error('Failed to check review eligibility:', error);
      setCanReview(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReviews();
    await checkCanReview();
    setRefreshing(false);
  };

  const handleHelpfulVote = async (reviewId: string) => {
    try {
      const response = await apiClient.post(`/api/user-reviews/${reviewId}/helpful`);
      
      // Update the review in the local state
      setReviews(prevReviews =>
        prevReviews.map(review =>
          review._id === reviewId
            ? {
                ...review,
                helpful: response.data.helpful,
                userHelpfulVote: response.data.userVoted
              }
            : review
        )
      );
    } catch (error) {
      console.error('Failed to vote helpful:', error);
      Alert.alert('Error', 'Failed to record vote');
    }
  };

  const submitReview = async () => {
    if (newRating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    if (newComment.trim().length < 10) {
      Alert.alert('Error', 'Comment must be at least 10 characters long');
      return;
    }

    try {
      setSubmitting(true);
      console.log('🔍 Submitting user review:', {
        userId,
        rating: newRating,
        comment: newComment.trim(),
        reviewType,
      });
      
      const response = await apiClient.post(`/api/users/${userId}/reviews`, {
        rating: newRating,
        comment: newComment.trim(),
        reviewType,
      });
      
      console.log('✅ User review submitted successfully:', response);
      Alert.alert('Success', 'Review submitted successfully');
      setWriteModalVisible(false);
      setNewRating(0);
      setNewComment('');
      setCanReview(false);
      await fetchReviews();
    } catch (error: any) {
      console.error('❌ Failed to submit review:', error);
      console.error('❌ Error response:', error.response?.data);
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'seller': return '#4CAF50';
      case 'buyer': return '#2196F3';
      case 'swapper': return '#FF9800';
      default: return '#666';
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.gold} />
        <Text style={styles.loadingText}>Loading reviews...</Text>
      </View>
    );
  }

  const renderHeader = () => (
    <View>
      {/* Summary Section */}
      {summary && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Overall Rating</Text>
            {canReview && (
              <TouchableOpacity
                style={styles.writeReviewButton}
                onPress={() => setWriteModalVisible(true)}
              >
                <Ionicons name="create" size={16} color="#fff" />
                <Text style={styles.writeReviewText}>Write Review</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.overallRating}>
            <Text style={styles.ratingNumber}>{summary.averageRating.toFixed(1)}</Text>
            <StarRating rating={summary.averageRating} size={20} />
            <Text style={styles.totalReviews}>
              Based on {summary.totalReviews} review{summary.totalReviews === 1 ? '' : 's'}
            </Text>
          </View>

          {/* Rating Breakdown */}
          <View style={styles.ratingBreakdown}>
            {[5, 4, 3, 2, 1].map((stars) => (
              <View key={stars} style={styles.ratingBreakdownRow}>
                <Text style={styles.starsLabel}>{stars}★</Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${summary.totalReviews > 0 
                          ? (summary.ratingBreakdown[stars as keyof typeof summary.ratingBreakdown] / summary.totalReviews) * 100 
                          : 0}%`
                      }
                    ]}
                  />
                </View>
                <Text style={styles.countLabel}>
                  {summary.ratingBreakdown[stars as keyof typeof summary.ratingBreakdown]}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Message User Button */}
      {user && userId !== user._id && userId !== user.id && (
        <TouchableOpacity
          style={styles.messageUserButton}
          onPress={async () => {
            try {
              const response = await apiClient.post(`/api/chat/direct/${userId}`);
              
              if (response.chat) {
                navigation.navigate('ChatScreen', {
                  chatId: response.chat._id,
                  chatName: userName,
                  otherUserId: userId
                });
              }
            } catch (error) {
              console.error('Failed to start chat:', error);
              Alert.alert('Error', 'Failed to start conversation. Please try again.');
            }
          }}
        >
          <Ionicons name="chatbubble" size={18} color="#fff" />
          <Text style={styles.messageUserText}>Message {userName}</Text>
        </TouchableOpacity>
      )}

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {['all', 'seller', 'buyer', 'swapper'].map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.filterTab,
              selectedType === type && styles.activeFilterTab
            ]}
            onPress={() => setSelectedType(type as typeof selectedType)}
          >
            <Text style={[
              styles.filterTabText,
              selectedType === type && styles.activeFilterTabText
            ]}>
              {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
              {summary && type !== 'all' && (
                <Text style={styles.filterCount}>
                  {' '}({summary.reviewTypeBreakdown[type as keyof typeof summary.reviewTypeBreakdown]})
                </Text>
              )}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderReview = ({ item: review }: { item: UserReview }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerInfo}>
          <Text style={styles.reviewerName}>{review.reviewerName}</Text>
          <View style={[styles.typeBadge, { backgroundColor: `${getTypeColor(review.reviewType)}20` }]}>
            <Text style={[styles.typeBadgeText, { color: getTypeColor(review.reviewType) }]}>
              {review.reviewType}
            </Text>
          </View>
          {review.verified && (
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
          )}
        </View>
        <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
      </View>

      <View style={styles.reviewRating}>
        <StarRating rating={review.rating} size={16} />
      </View>

      <Text style={styles.reviewComment}>{review.comment}</Text>

      <View style={styles.reviewActions}>
        <TouchableOpacity
          style={[styles.helpfulButton, review.userHelpfulVote && styles.helpfulButtonActive]}
          onPress={() => handleHelpfulVote(review._id)}
        >
          <Ionicons
            name={review.userHelpfulVote ? "thumbs-up" : "thumbs-up-outline"}
            size={16}
            color={review.userHelpfulVote ? COLORS.gold : "#666"}
          />
          <Text style={[styles.helpfulText, review.userHelpfulVote && styles.helpfulTextActive]}>
            Helpful ({review.helpful})
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubble-outline" size={48} color="#666" />
      <Text style={styles.emptyText}>No reviews yet</Text>
      <Text style={styles.emptySubtext}>
        {(() => {
          // Check if current user is viewing their own profile
          const isOwnProfile = user && userId && (user._id === userId || user.id === userId);
          
          if (isOwnProfile) {
            return selectedType === 'all' 
              ? 'You haven\'t received any reviews yet'
              : `You haven't received any ${selectedType} reviews yet`;
          } else {
            return selectedType === 'all' 
              ? 'This user hasn\'t received any reviews'
              : `No ${selectedType} reviews found`;
          }
        })()}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={reviews}
        keyExtractor={(item) => item._id}
        renderItem={renderReview}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={COLORS.gold}
            colors={[COLORS.gold]}
          />
        }
        contentContainerStyle={styles.flatListContent}
        showsVerticalScrollIndicator={false}
        getItemLayout={(data, index) => ({
          length: 200, // Approximate item height
          offset: 200 * index,
          index,
        })}
      />

      {/* Write Review Modal */}
      <Modal
        visible={writeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setWriteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContainer}>
            <KeyboardAvoidingView
              style={styles.keyboardAvoid}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Write a Review</Text>
                  <TouchableOpacity onPress={() => setWriteModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <ScrollView 
                  style={styles.scrollContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.scrollContainer}
                >
                  <Text style={styles.modalSubtitle}>Rate {userName}</Text>

                  {/* Rating Selection */}
                  <View style={styles.ratingSelection}>
                    <Text style={styles.ratingLabel}>Rating</Text>
                    <StarRating
                      rating={newRating}
                      size={32}
                      onRatingPress={setNewRating}
                      interactive
                    />
                  </View>

                  {/* Review Type Selection */}
                  <View style={styles.typeSelection}>
                    <Text style={styles.typeLabel}>Review Type</Text>
                    <View style={styles.typeOptions}>
                      {(['seller', 'buyer', 'swapper'] as const).map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.typeOption,
                            reviewType === type && styles.activeTypeOption
                          ]}
                          onPress={() => setReviewType(type)}
                        >
                          <Text style={[
                            styles.typeOptionText,
                            reviewType === type && styles.activeTypeOptionText
                          ]}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Comment Input */}
                  <View style={styles.commentSection}>
                    <Text style={styles.commentLabel}>Comment (minimum 10 characters)</Text>
                    <TextInput
                      style={styles.commentInput}
                      multiline
                      numberOfLines={4}
                      value={newComment}
                      onChangeText={setNewComment}
                      placeholder="Share your experience..."
                      placeholderTextColor="#666"
                      textAlignVertical="top"
                      maxLength={500}
                      autoCorrect={true}
                      spellCheck={true}
                      selectionColor={COLORS.gold}
                      underlineColorAndroid="transparent"
                      autoCapitalize="sentences"
                    />
                    <Text style={styles.characterCount}>
                      {newComment.length}/500 characters
                    </Text>
                  </View>
                </ScrollView>

                {/* Submit Button - Fixed at bottom */}
                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={[
                      styles.submitButton, 
                      (submitting || newRating === 0 || newComment.trim().length < 10) && styles.disabledButton
                    ]}
                    onPress={submitReview}
                    disabled={submitting || newRating === 0 || newComment.trim().length < 10}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={[
                        styles.submitButtonText,
                        (newRating === 0 || newComment.trim().length < 10) && styles.disabledButtonText
                      ]}>
                        Submit Review
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
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
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50, // Account for status bar
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 40, // Same width as back button to center title
  },
  flatListContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
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
  summaryContainer: {
    backgroundColor: '#1e1e1e',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  writeReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gold,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  writeReviewText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  overallRating: {
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingNumber: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  totalReviews: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 8,
  },
  ratingBreakdown: {
    gap: 8,
  },
  ratingBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  starsLabel: {
    color: '#fff',
    fontSize: 14,
    width: 20,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.gold,
  },
  countLabel: {
    color: '#ccc',
    fontSize: 12,
    width: 30,
    textAlign: 'right',
  },
  filterContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  activeFilterTab: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
  },
  filterTabText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '600',
  },
  activeFilterTabText: {
    color: '#fff',
  },
  filterCount: {
    fontSize: 12,
  },
  messageUserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  messageUserText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  reviewsList: {
    paddingHorizontal: 16,
    gap: 16,
  },
  reviewCard: {
    backgroundColor: '#1e1e1e',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reviewDate: {
    color: '#666',
    fontSize: 12,
  },
  reviewRating: {
    marginBottom: 12,
  },
  reviewComment: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  reviewActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  helpfulButtonActive: {
    backgroundColor: `${COLORS.gold}20`,
    borderRadius: 6,
  },
  helpfulText: {
    color: '#666',
    fontSize: 12,
  },
  helpfulTextActive: {
    color: COLORS.gold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  modalFooter: {
    padding: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    color: '#ccc',
    fontSize: 16,
    marginBottom: 20,
  },
  ratingSelection: {
    marginBottom: 24,
  },
  ratingLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  typeSelection: {
    marginBottom: 24,
  },
  typeLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  typeOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTypeOption: {
    backgroundColor: COLORS.gold,
  },
  typeOptionText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTypeOptionText: {
    color: '#fff',
  },
  commentSection: {
    marginBottom: 24,
  },
  commentLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  commentInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#333',
    fontWeight: '400',
    lineHeight: 22,
  },
  characterCount: {
    color: '#666',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: COLORS.gold,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButtonText: {
    color: '#666',
  },
});