// Clean, simplified ProductDetailsScreen
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Alert,
  Modal,
  SafeAreaView,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { RouteProp, useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '@navigation/types';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '@constants/colors';
import { Product } from '@types';
import { useAppSelector, useAppDispatch } from '@/store/redux/hooks';
import { apiClient } from '@config/index';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@context/AuthContext';
import { RootState } from '@store';
import { setAuth } from '@/store/redux/slices/authSlice';
import { StarRating } from '@/components/rating/StarRating';
import { SmartRecommendationsCard, AIValueAssessment } from '@/components/ai';
import { logDebug, logInfo, logError } from '@/utils/logger';

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

type ProductDetailsRouteProp = RouteProp<RootStackParamList, 'ProductDetail'>;

// Trust Score Component (keep as is)
const TrustScoreDisplay = ({ trustScore, verificationLevel, successfulSwaps, successfulSales }) => {
  const getTrustScoreColor = (score) => {
    if (score >= 80) return '#4CAF50'; // Green
    if (score >= 60) return '#FF9800'; // Orange
    if (score >= 40) return '#FFC107'; // Yellow
    return '#f44336'; // Red
  };

  const getTierLevel = (swaps, sales) => {
    const totalTransactions = (swaps || 0) + (sales || 0);
    if (totalTransactions >= 50) return { name: 'Platinum', color: '#E5E4E2', icon: 'diamond' };
    if (totalTransactions >= 20) return { name: 'Gold', color: '#FFD700', icon: 'star' };
    if (totalTransactions >= 10) return { name: 'Silver', color: '#C0C0C0', icon: 'medal' };
    return { name: 'Bronze', color: '#CD7F32', icon: 'trophy' };
  };

  const getVerificationLevelDisplay = (level) => {
    switch (level) {
      case 'FULLY_VERIFIED': return { text: 'Fully Verified', color: '#4CAF50' };
      case 'ADVANCED': return { text: 'Advanced', color: '#2196F3' };
      case 'INTERMEDIATE': return { text: 'Intermediate', color: '#FF9800' };
      case 'BASIC': return { text: 'Basic', color: '#FFC107' };
      case 'UNVERIFIED': return { text: 'Unverified', color: '#f44336' };
      default: return { text: 'Unverified', color: '#f44336' };
    }
  };

  const verificationDisplay = getVerificationLevelDisplay(verificationLevel);
  const tierLevel = getTierLevel(successfulSwaps || 0, successfulSales || 0);
  const totalTransactions = (successfulSwaps || 0) + (successfulSales || 0);

  return (
    <View style={styles.trustScoreContainer}>
      <View style={styles.trustScoreHeader}>
        <Text style={styles.trustScoreTitle}>Trust Score</Text>
        <View style={styles.trustScoreValue}>
          <Text style={[styles.trustScoreNumber, { color: getTrustScoreColor(trustScore) }]}>
            {trustScore || 0}
          </Text>
          <Text style={styles.trustScoreMax}>/100</Text>
        </View>
      </View>
      
      {/* Tier Level Display */}
      <View style={styles.tierContainer}>
        <View style={[styles.tierBadge, { backgroundColor: `${tierLevel.color}20`, borderColor: tierLevel.color }]}>
          <Ionicons name={tierLevel.icon} size={16} color={tierLevel.color} />
          <Text style={[styles.tierText, { color: tierLevel.color }]}>
            {tierLevel.name} Tier
          </Text>
        </View>
        <View style={styles.transactionStats}>
          <Text style={styles.transactionText}>
            {totalTransactions} total transactions
          </Text>
          <View style={styles.transactionBreakdown}>
            <Text style={styles.swapsText}>
              {successfulSwaps || 0} swaps
            </Text>
            <Text style={styles.salesText}>
              {successfulSales || 0} sales
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.verificationLevel}>
        <Ionicons 
          name={verificationLevel === 'FULLY_VERIFIED' ? 'shield-checkmark' : 'shield-outline'} 
          size={16} 
          color={verificationDisplay.color} 
        />
        <Text style={[styles.verificationLevelText, { color: verificationDisplay.color }]}>
          {verificationDisplay.text}
        </Text>
      </View>

      {/* Trust Score Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${Math.min((trustScore || 0), 100)}%`,
                backgroundColor: getTrustScoreColor(trustScore)
              }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          Trust Level: {tierLevel.name}
        </Text>
      </View>
    </View>
  );
};

function ProductDetailsScreen() {
  const route = useRoute<ProductDetailsRouteProp>();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { productId } = route.params;

  // State
  const currentUser = useAppSelector((state: RootState) => state.auth.user);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [sellerName, setSellerName] = useState('');
  const [sellerTrustData, setSellerTrustData] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [zoomVisible, setZoomVisible] = useState(false);
  const [reviewSummary, setReviewSummary] = useState(null);
  const [sellerReviewSummary, setSellerReviewSummary] = useState(null);

  const { token, user: authUser } = useAuth();

  // ✅ Auth is now handled by useAuth() hook - removed redundant loading logic

  // ✅ Simple isOwner logic
  const isOwner = React.useMemo(() => {
    const user = currentUser || authUser;
    
    if (!product || !user) {
      return false;
    }

    const productUserId = typeof product.user === 'string' 
      ? product.user 
      : product.user._id;
    
    const currentUserId = user._id || user.id;
    
    return productUserId === currentUserId;
  }, [product, currentUser, authUser]);

  // Set header
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // Fetch product
  useEffect(() => {
    fetchProduct();
  }, []);

  // Track if this is the initial load to avoid refreshing on first focus
  const initialLoadRef = useRef(true);

  // Refresh product data when screen comes back into focus (e.g., after editing a review)
  useFocusEffect(
    React.useCallback(() => {
      // Skip refresh on initial load
      if (initialLoadRef.current) {
        initialLoadRef.current = false;
        return;
      }
      
      // Only refresh when coming back from another screen
      logDebug('ProductDetailsScreen: Refreshing product data on focus');
      fetchProduct();
    }, []) // Remove dependency on product to prevent infinite loop
  );

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get(`/api/products/${productId}`);
      setProduct(data);

      if (typeof data.user === 'string') {
        fetchSeller(data.user);
      } else {
        setSellerName(data.user?.fullName || 'Unknown Seller');
        if (data.user) {
          setSellerTrustData({
            trustScore: data.user.trustScore || 0,
            verificationLevel: data.user.verificationLevel || 'UNVERIFIED',
            successfulSwaps: data.user.successfulSwaps || 0,
            successfulSales: data.user.successfulSales || 0,
          });
        }
      }

      // Fetch review summary
      fetchReviewSummary();

      // Fetch seller review summary if we have seller info
      if (data.user?._id) {
        fetchSellerReviewSummary(data.user._id);
      } else if (typeof data.user === 'string') {
        fetchSellerReviewSummary(data.user);
      }
    } catch (err: any) {
      console.error('Product fetch error:', err);
      Alert.alert('Error', 'Failed to fetch product.', [
        { text: 'Go Back', onPress: () => navigation.goBack() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSeller = async (sellerId: string) => {
    try {
      const userData = await apiClient.get(`/api/users/${sellerId}/profile`);
      setSellerName(userData.fullName || 'Unknown Seller');
      setSellerTrustData({
        trustScore: userData.trustScore || 0,
        verificationLevel: userData.verificationLevel || 'NONE',
        successfulSwaps: userData.successfulSwaps || 0,
        successfulSales: userData.successfulSales || 0,
      });
    } catch (error) {
      console.error('Failed to fetch seller:', error);
      setSellerName('Unknown Seller');
      setSellerTrustData({
        trustScore: 0,
        verificationLevel: 'UNVERIFIED',
        successfulSwaps: 0,
        successfulSales: 0,
      });
    }
  };

  const fetchReviewSummary = async () => {
    try {
      const response = await apiClient.get(`/api/products/${productId}/reviews?limit=0`);
      logDebug('Product review response', { response });
      
      // Handle different response structures
      const data = response.data || response;
      const summary = data.summary || { 
        averageRating: data.averageRating || 0, 
        totalReviews: data.totalReviews || 0 
      };
      
      setReviewSummary(summary);
    } catch (error) {
      console.error('Failed to fetch review summary:', error);
      // Don't show error to user, just set default values
      setReviewSummary({ averageRating: 0, totalReviews: 0 });
    }
  };

  const fetchSellerReviewSummary = async (sellerId) => {
    try {
      const response = await apiClient.get(`/api/sellers/${sellerId}/reviews?limit=0`);
      logDebug('Seller review response', { response });
      
      // Handle different response structures
      const data = response.data || response;
      const summary = data.summary || { 
        averageRating: data.averageRating || 0, 
        totalReviews: data.totalReviews || 0 
      };
      
      setSellerReviewSummary(summary);
    } catch (error) {
      console.error('Failed to fetch seller review summary:', error);
      // Don't show error to user, just set default values
      setSellerReviewSummary({ averageRating: 0, totalReviews: 0 });
    }
  };

  // Action handlers
  const handleBuy = () => navigation.navigate('Buy', { product });
  const handleSwap = () => navigation.navigate('SwapOffer', {
    requestedProduct: product,
    requestedProductPrice: product?.price,
  });
  const handleChat = async () => {
    if (!product?.user) return;
    
    try {
      const otherUserId = typeof product.user === 'string' ? product.user : product.user._id;
      
      // Start or get direct chat with the product owner, include productId for reference
      const response = await apiClient.post(`/api/chat/direct/${otherUserId}`, {
        productId: product._id, // Include product reference
        context: 'product_inquiry' // Add context for better chat management
      });
      
      if (response.chat) {
        navigation.navigate('ChatScreen', {
          chatId: response.chat._id,
          chatName: sellerName || 'Seller',
          otherUserId: otherUserId
        });
      }
    } catch (error) {
      console.error('Failed to start chat:', error);
      Alert.alert('Error', 'Failed to start conversation. Please try again.');
    }
  };

  const handleDelete = async () => {
    Alert.alert('Delete Product', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeleteLoading(true);
            await apiClient.delete(`/api/products/${product?._id}`);
            Alert.alert('Success', 'Product deleted successfully', [
              { text: 'OK', onPress: () => navigation.goBack() }
            ]);
          } catch (error: any) {
            Alert.alert('Error', 'Could not delete product. Please try again.');
          } finally {
            setDeleteLoading(false);
          }
        },
      },
    ]);
  };

  const humanizeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Uploaded today';
    if (diffDays === 1) return 'Uploaded 1 day ago';
    return `Uploaded ${diffDays} days ago`;
  };

  if (loading || !product) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.gold} />
        <Text style={styles.loadingText}>Loading product details...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#121212' }} contentContainerStyle={{ paddingBottom: 80 }}>
      <View>
        {/* Image Carousel */}
        <View style={styles.imageContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            onScroll={e =>
              setCurrentImageIndex(Math.round(e.nativeEvent.contentOffset.x / screenWidth))
            }
            scrollEventThrottle={16}
            showsHorizontalScrollIndicator={false}
          >
            {product.images?.length > 0 ? product.images.map((img, i) => (
              <TouchableOpacity key={i} onPress={() => setZoomVisible(true)}>
                <Image source={{ uri: img }} style={styles.carouselImage} resizeMode="cover" />
              </TouchableOpacity>
            )) : (
              <View style={[styles.carouselImage, styles.noImageContainer]}>
                <Ionicons name="image-outline" size={60} color="#666" />
                <Text style={styles.noImageText}>No image available</Text>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.floatingBackButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          {product.images?.length > 1 && (
            <Text style={styles.imageIndex}>
              {currentImageIndex + 1} / {product.images.length}
            </Text>
          )}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.productTitle}>{product.title}</Text>
          <Text style={styles.productPrice}>
            <Text style={styles.boldText}>Price: </Text>
            ₦{Number(product.price || 0).toLocaleString()}
          </Text>
          <Text style={[styles.infoText, { fontStyle: 'italic', color: '#888' }]}>
            {humanizeDate(product.createdAt)}
          </Text>

          {!isOwner && !!sellerName && (
            <>
              <TouchableOpacity
                onPress={() => navigation.navigate('UserReviews', {
                  userId: product.user?._id || product.user || 'unknown',
                  userName: sellerName
                })}
              >
                <Text style={styles.infoText}>
                  Swaaper: <Text style={[styles.boldText, styles.clickableText]}>{sellerName}</Text>
                  <Text style={styles.viewProfileText}> (View Profile)</Text>
                </Text>
              </TouchableOpacity>
              
              {sellerTrustData && (
                <TrustScoreDisplay
                  trustScore={sellerTrustData.trustScore}
                  verificationLevel={sellerTrustData.verificationLevel}
                  successfulSwaps={sellerTrustData.successfulSwaps}
                  successfulSales={sellerTrustData.successfulSales}
                />
              )}

              {/* Seller Rating Section */}
              {sellerReviewSummary && sellerReviewSummary.totalReviews > 0 && (
                <TouchableOpacity
                  style={styles.sellerRatingSection}
                  onPress={() => navigation.navigate('SellerReviews', {
                    sellerId: product.user?._id || product.user || 'unknown',
                    sellerName: sellerName
                  })}
                >
                  <View style={styles.sellerRatingContent}>
                    <Text style={styles.sellerRatingLabel}>Seller Rating:</Text>
                    <View style={styles.sellerRatingInfo}>
                      <StarRating rating={sellerReviewSummary.averageRating} size={14} />
                      <Text style={styles.sellerRatingText}>
                        {sellerReviewSummary.averageRating.toFixed(1)} ({sellerReviewSummary.totalReviews} review{sellerReviewSummary.totalReviews === 1 ? '' : 's'})
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#666" />
                  </View>
                </TouchableOpacity>
              )}
            </>
          )}

          {!!product.description && (
            <Text style={styles.infoText}>Description: {product.description}</Text>
          )}

          {!!product.category && (
            <Text style={styles.infoText}>Category: {product.category}</Text>
          )}

          {!!product.condition && (
            <Text style={styles.infoText}>Condition: {product.condition}</Text>
          )}

          {!!product.type && (
            <Text style={styles.infoText}>
              Type: <Text style={[styles.boldText, { color: COLORS.gold }]}>
                {product.type.charAt(0).toUpperCase() + product.type.slice(1)}
              </Text>
            </Text>
          )}

          {/* ✅ REVIEWS SECTION */}
          <View style={styles.reviewsSection}>
            <TouchableOpacity
              style={styles.reviewsHeader}
              onPress={() => navigation.navigate('ProductReviews', {
                productId: product._id,
                productTitle: product.title,
                sellerId: product.user?._id || product.user || 'unknown',
                sellerName: product.user?.fullName || 'Seller'
              })}
            >
              <View style={styles.reviewsInfo}>
                <StarRating rating={reviewSummary?.averageRating || 0} size={16} />
                <Text style={styles.reviewsText}>
                  {reviewSummary?.averageRating?.toFixed(1) || '0.0'} • {reviewSummary?.totalReviews || 0} review{reviewSummary?.totalReviews === 1 ? '' : 's'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* 🤖 AI FEATURES SECTION */}
          {!isOwner && (
            <>
              {/* AI Value Assessment */}
              <AIValueAssessment 
                product={product}
                showInline={true}
              />
              
              {/* Smart Matching Agent - Show optimal matches */}
              <SmartRecommendationsCard 
                productId={product._id}
                maxItems={3}
                title="🤖 Smart Matches for You"
              />
            </>
          )}

          {/* ✅ SINGLE ACTION BUTTONS SECTION */}
          {isOwner ? (
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => navigation.navigate('EditProduct', { productId: product._id })}
              >
                <Ionicons name="create-outline" size={18} color="#fff" />
                <Text style={styles.actionButtonText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton, deleteLoading && styles.disabledButton]}
                onPress={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="trash" size={18} color="#fff" />
                )}
                <Text style={styles.actionButtonText}>
                  {deleteLoading ? 'Deleting...' : 'Delete'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.chatButton]}
                onPress={handleChat}
              >
                <Ionicons name="chatbubble" size={18} color="#fff" />
                <Text style={styles.actionButtonText}>Message</Text>
              </TouchableOpacity>

              {(product.type === 'sale' || product.type === 'both') && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.buyButton]}
                  onPress={handleBuy}
                >
                  <Ionicons name="card" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Buy</Text>
                </TouchableOpacity>
              )}

              {(product.type === 'swap' || product.type === 'both') && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.swapButton]}
                  onPress={handleSwap}
                >
                  <Ionicons name="swap-horizontal" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Swap</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Zoom Modal */}
      {product.images?.length > 0 && (
        <Modal visible={zoomVisible} transparent onRequestClose={() => setZoomVisible(false)}>
          <StatusBar hidden />
          <SafeAreaView style={styles.zoomModalContainer}>
            <TouchableOpacity
              onPress={() => setZoomVisible(false)}
              style={styles.zoomCloseButton}
            >
              <Ionicons name="close" size={30} color="#fff" />
            </TouchableOpacity>

            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {product.images.map((img, i) => (
                <Image
                  key={i}
                  source={{ uri: img }}
                  style={styles.zoomImage}
                  resizeMode="contain"
                />
              ))}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  loadingText: {
    color: COLORS.gold,
    marginTop: 10,
    fontSize: 16,
  },
  headerBackButton: {
    marginLeft: 15,
  },
  imageContainer: {
    position: 'relative',
    backgroundColor: '#000',
  },
  carouselImage: {
    width: screenWidth,
    height: 250,
  },
  noImageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#222',
  },
  noImageText: {
    color: '#666',
    marginTop: 8,
    fontSize: 16,
  },
  floatingBackButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 8,
    zIndex: 1,
  },
  imageIndex: {
    position: 'absolute',
    right: 16,
    top: 16,
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 6,
    borderRadius: 10,
  },
  infoSection: {
    padding: 16,
    backgroundColor: '#121212',
  },
  productTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 28,
    color: COLORS.gold,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  infoText: {
    marginBottom: 6,
    color: '#cccccc',
    fontSize: 16,
    lineHeight: 22,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#ffffff',
  },
  clickableText: {
    color: COLORS.gold,
    textDecorationLine: 'underline',
  },
  viewProfileText: {
    color: '#ccc',
    fontSize: 12,
    fontStyle: 'italic',
  },
  // Trust Score Styles
  trustScoreContainer: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  trustScoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  trustScoreTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  trustScoreValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  trustScoreNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  trustScoreMax: {
    color: '#666',
    fontSize: 16,
    marginLeft: 2,
  },
  verificationLevel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  verificationLevelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  verificationBadges: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  verificationBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a2a',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    gap: 4,
  },
  verifiedBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  badgeText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
  },
  verifiedBadgeText: {
    color: '#4CAF50',
  },
  // Tier Level Styles
  tierContainer: {
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  tierText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  transactionStats: {
    marginTop: 4,
  },
  transactionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  transactionBreakdown: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },
  swapsText: {
    color: '#4CAF50',
    fontSize: 12,
  },
  salesText: {
    color: '#2196F3',
    fontSize: 12,
  },
  // Progress Bar Styles
  progressContainer: {
    marginTop: 12,
  },
  progressBackground: {
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  actionButton: {
    padding: 14,
    borderRadius: 12,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  editButton: {
    backgroundColor: '#FF9800',
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
  disabledButton: {
    opacity: 0.6,
  },
  chatButton: {
    backgroundColor: '#2196F3',
  },
  buyButton: {
    backgroundColor: COLORS.gold,
  },
  swapButton: {
    backgroundColor: '#4CAF50',
  },
  zoomModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  zoomCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
  },
  zoomImage: {
    width: screenWidth,
    height: screenHeight,
  },
  // ✅ Reviews Section Styles
  reviewsSection: {
    marginVertical: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  reviewsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewsText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
  },
  // Seller Rating Section Styles
  sellerRatingSection: {
    marginTop: 12,
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  sellerRatingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sellerRatingLabel: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '500',
  },
  sellerRatingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  sellerRatingText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 6,
  },
});

export default ProductDetailsScreen;
