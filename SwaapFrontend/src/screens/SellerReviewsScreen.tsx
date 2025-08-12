import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '@navigation/types';
import COLORS from '@constants/colors';
import { StarRating } from '@/components/rating/StarRating';
import { apiClient } from '@config/index';

type SellerReviewsRouteProp = RouteProp<RootStackParamList, 'SellerReviews'>;

interface Review {
  _id: string;
  rating: number;
  comment: string;
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
}

export default function SellerReviewsScreen() {
  const route = useRoute<SellerReviewsRouteProp>();
  const navigation = useNavigation();
  const { sellerId, sellerName } = route.params;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: `${sellerName}'s Seller Reviews`,
      headerStyle: { backgroundColor: '#121212' },
      headerTintColor: '#fff',
      headerTitleStyle: { color: '#fff' },
    });
  }, [navigation, sellerName]);

  useEffect(() => {
    fetchReviews(1, true);
  }, []);

  const fetchReviews = async (pageNum: number = 1, reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
        setReviews([]);
      } else {
        setLoadingMore(true);
      }

      const response = await apiClient.get(`/api/sellers/${sellerId}/reviews?page=${pageNum}&limit=10`);
      
      const newReviews = response.reviews || [];
      const newSummary = response.summary || null;

      if (reset) {
        setReviews(newReviews);
        setSummary(newSummary);
        setPage(1);
      } else {
        setReviews(prev => [...prev, ...newReviews]);
      }

      setHasMore(newReviews.length === 10); // If we got 10 reviews, there might be more
    } catch (error) {
      console.error('Failed to fetch seller reviews:', error);
      Alert.alert('Error', 'Failed to load reviews');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReviews(1, true);
    setRefreshing(false);
  };

  const loadMoreReviews = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchReviews(nextPage, false);
    }
  };

  const handleHelpfulVote = async (reviewId: string) => {
    try {
      const response = await apiClient.post(`/api/reviews/${reviewId}/helpful`);
      
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.gold} />
        <Text style={styles.loadingText}>Loading seller reviews...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Custom Header with Back Button */}
      <View style={styles.customHeader}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Seller Reviews</Text>
        <View style={styles.headerSpacer} />
      </View>
      
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;
          if (isCloseToBottom && hasMore && !loadingMore) {
            loadMoreReviews();
          }
        }}
        scrollEventThrottle={400}
      >
        {/* Summary Section */}
        {summary && (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Seller Rating Summary</Text>
            
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

        {/* Reviews List */}
        {reviews.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-outline" size={48} color="#666" />
            <Text style={styles.emptyText}>No reviews yet</Text>
            <Text style={styles.emptySubtext}>
              This seller hasn't received any reviews yet
            </Text>
          </View>
        ) : (
          <View style={styles.reviewsList}>
            {reviews.map((review) => (
              <View key={review._id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewerInfo}>
                    <Text style={styles.reviewerName}>{review.reviewerName}</Text>
                    {review.verified && (
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                        <Text style={styles.verifiedText}>Verified Purchase</Text>
                      </View>
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
            ))}

            {/* Load More Indicator */}
            {loadingMore && (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color={COLORS.gold} />
                <Text style={styles.loadMoreText}>Loading more reviews...</Text>
              </View>
            )}

            {!hasMore && reviews.length > 0 && (
              <Text style={styles.endText}>No more reviews to show</Text>
            )}
          </View>
        )}
      </ScrollView>
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
  scrollContent: {
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
  summaryTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
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
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reviewerInfo: {
    flex: 1,
    gap: 4,
  },
  reviewerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '500',
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
  loadMoreContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadMoreText: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 8,
  },
  endText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginTop: 20,
    fontStyle: 'italic',
  },
});