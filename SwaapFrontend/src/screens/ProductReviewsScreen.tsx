// screens/ProductReviewsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { ReviewCard } from '@/components/rating/ReviewCard';
import { WriteReviewModal } from '@/components/rating/WriteReviewModal';
import { EditReviewModal } from '@/components/rating/EditReviewModal';
import { StarRating } from '@/components/rating/StarRating';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@config/index';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductReviews'>;

interface Review {
  _id: string;
  rating: number;
  comment: string;
  reviewerName: string;
  createdAt: string;
  updatedAt?: string;
  helpful?: number;
  userHelpfulVote?: boolean;
  isOwner?: boolean;
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
}

export default function ProductReviewsScreen({ route, navigation }: Props) {
  const { productId, productTitle, sellerId, sellerName } = route.params;
  const { user } = useAuth();
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [writeReviewVisible, setWriteReviewVisible] = useState(false);
  const [editReviewVisible, setEditReviewVisible] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [userCanReview, setUserCanReview] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: 'Product Reviews',
      headerStyle: {
        backgroundColor: '#1a1a1a',
      },
      headerTintColor: '#fff',
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ 
            marginLeft: 16, 
            padding: 8, 
            flexDirection: 'row', 
            alignItems: 'center',
            backgroundColor: 'rgba(255, 193, 7, 0.1)',
            borderRadius: 8
          }}
        >
          <Ionicons name="chevron-back" size={28} color="#FFC107" />
          <Text style={{ color: '#FFC107', fontSize: 16, marginLeft: 4 }}>Back</Text>
        </TouchableOpacity>
      ),
    });
    
    fetchReviews();
    checkCanReview();
  }, []);

  const fetchReviews = async () => {
    try {
      const response = await apiClient.get(`/api/products/${productId}/reviews`);
      console.log('📊 Product reviews response structure:', response);
      
      // Handle different response structures
      const data = response.data || response;
      const reviews = data.reviews || [];
      const summary = data.summary || {
        averageRating: data.averageRating || 0,
        totalReviews: data.totalReviews || 0,
        ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      };
      
      setReviews(reviews);
      setSummary(summary);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      Alert.alert('Error', 'Failed to load reviews');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkCanReview = async () => {
    if (!user) return;
    
    try {
      // Check if user has purchased this product and hasn't reviewed yet
      const response = await apiClient.get(`/api/products/${productId}/can-review`);
      console.log('✅ Can review response structure:', response);
      
      // Handle different response structures
      const data = response.data || response;
      setUserCanReview(data.canReview || false);
    } catch (error) {
      console.error('Error checking review eligibility:', error);
    }
  };

  const submitReview = async (rating: number, comment: string) => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to submit a review.');
      return;
    }

    try {
      await apiClient.post(`/api/products/${productId}/reviews`, {
        rating,
        comment,
      });

      Alert.alert('Success', 'Your review has been submitted!');
      setUserCanReview(false);
      fetchReviews(); // Refresh reviews
    } catch (error: any) {
      console.error('Error submitting review:', error);
      const message = error?.response?.data?.message || 'Failed to submit review';
      throw new Error(message);
    }
  };

  const handleHelpful = async (reviewId: string) => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to vote on reviews.');
      return;
    }

    try {
      const response = await apiClient.post(`/api/reviews/${reviewId}/helpful`);
      console.log('✅ Helpful vote response:', response);
      
      // Update the specific review in the state instead of refetching all
      setReviews(prevReviews =>
        prevReviews.map(review =>
          review._id === reviewId
            ? {
                ...review,
                helpful: response.data?.helpful || response.helpful || review.helpful,
                userHelpfulVote: response.data?.userVoted !== undefined 
                  ? response.data.userVoted 
                  : response.userVoted !== undefined 
                  ? response.userVoted 
                  : !review.userHelpfulVote
              }
            : review
        )
      );
    } catch (error: any) {
      console.error('Error voting on review:', error);
      const message = error?.response?.data?.message || error?.message || 'Failed to record your vote';
      Alert.alert('Error', message);
    }
  };

  const handleEditReview = (reviewId: string) => {
    const review = reviews.find(r => r._id === reviewId);
    if (review) {
      setEditingReview(review);
      setEditReviewVisible(true);
    }
  };

  const handleUpdateReview = async (rating: number, comment: string) => {
    if (!editingReview) return;

    try {
      const response = await apiClient.put(`/api/reviews/${editingReview._id}`, {
        rating,
        comment,
      });

      // Update the review in the local state
      setReviews(prevReviews =>
        prevReviews.map(review =>
          review._id === editingReview._id
            ? { ...review, rating, comment, updatedAt: new Date().toISOString() }
            : review
        )
      );

      // Refresh to get updated summary
      fetchReviews();
      Alert.alert('Success', 'Your review has been updated!');
    } catch (error: any) {
      console.error('Error updating review:', error);
      const message = error?.response?.data?.message || 'Failed to update review';
      throw new Error(message);
    }
  };

  const handleDeleteReview = async () => {
    if (!editingReview) return;

    try {
      await apiClient.delete(`/api/reviews/${editingReview._id}`);

      // Remove the review from local state
      setReviews(prevReviews =>
        prevReviews.filter(review => review._id !== editingReview._id)
      );

      // Refresh to get updated summary
      fetchReviews();
      Alert.alert('Success', 'Your review has been deleted!');
    } catch (error: any) {
      console.error('Error deleting review:', error);
      const message = error?.response?.data?.message || 'Failed to delete review';
      throw new Error(message);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReviews();
    checkCanReview();
  };

  const renderRatingBar = (rating: number) => {
    const count = summary?.ratingBreakdown[rating as keyof typeof summary.ratingBreakdown] || 0;
    const percentage = summary?.totalReviews ? (count / summary.totalReviews) * 100 : 0;

    return (
      <View key={rating} style={styles.ratingBarRow}>
        <Text style={styles.ratingNumber}>{rating}</Text>
        <Ionicons name="star" size={16} color="#FFC107" />
        <View style={styles.ratingBarContainer}>
          <View style={[styles.ratingBar, { width: `${percentage}%` }]} />
        </View>
        <Text style={styles.ratingCount}>{count}</Text>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.summarySection}>
        <View style={styles.averageRating}>
          <Text style={styles.averageRatingNumber}>
            {summary?.averageRating?.toFixed(1) || '0.0'}
          </Text>
          <StarRating
            rating={summary?.averageRating || 0}
            size={20}
          />
          <Text style={styles.totalReviews}>
            {summary?.totalReviews || 0} review{(summary?.totalReviews || 0) !== 1 ? 's' : ''}
          </Text>
        </View>

        <View style={styles.ratingBreakdown}>
          {[5, 4, 3, 2, 1].map(rating => renderRatingBar(rating))}
        </View>
      </View>

      {userCanReview && (
        <TouchableOpacity
          style={styles.writeReviewButton}
          onPress={() => setWriteReviewVisible(true)}
        >
          <Ionicons name="create-outline" size={20} color="#000" />
          <Text style={styles.writeReviewText}>Write Review</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.reviewsTitle}>
        Reviews ({reviews.length})
      </Text>
    </View>
  );

  const renderReview = ({ item }: { item: Review }) => (
    <ReviewCard
      review={item}
      onHelpfulPress={handleHelpful}
      onEditPress={handleEditReview}
    />
  );

  const renderEmpty = () => {
    // Check if current user is the product owner/seller
    const isProductOwner = user && sellerId && (user._id === sellerId || user.id === sellerId);
    
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="chatbubble-outline" size={60} color="#666" />
        <Text style={styles.emptyTitle}>No Reviews Yet</Text>
        <Text style={styles.emptySubtitle}>
          {isProductOwner 
            ? "This product hasn't received any reviews yet."
            : "Be the first to review this product!"
          }
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={reviews}
        keyExtractor={(item) => item._id}
        renderItem={renderReview}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFC107"
            colors={['#FFC107']}
          />
        }
      />

      <WriteReviewModal
        visible={writeReviewVisible}
        onClose={() => setWriteReviewVisible(false)}
        onSubmit={submitReview}
        productTitle={productTitle}
        sellerName={sellerName}
      />

      {editingReview && (
        <EditReviewModal
          visible={editReviewVisible}
          onClose={() => {
            setEditReviewVisible(false);
            setEditingReview(null);
          }}
          onUpdate={handleUpdateReview}
          onDelete={handleDeleteReview}
          initialRating={editingReview.rating}
          initialComment={editingReview.comment}
          title={`Review for ${productTitle}`}
          showDelete={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  listContent: {
    paddingBottom: 20,
  },
  header: {
    padding: 16,
  },
  summarySection: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  averageRating: {
    alignItems: 'center',
    marginBottom: 16,
  },
  averageRatingNumber: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  totalReviews: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
  },
  ratingBreakdown: {
    gap: 8,
  },
  ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingNumber: {
    color: '#fff',
    fontSize: 14,
    width: 10,
  },
  ratingBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
  },
  ratingBar: {
    height: '100%',
    backgroundColor: '#FFC107',
    borderRadius: 4,
  },
  ratingCount: {
    color: '#666',
    fontSize: 12,
    width: 30,
    textAlign: 'right',
  },
  writeReviewButton: {
    backgroundColor: '#FFC107',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  writeReviewText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  reviewsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
});