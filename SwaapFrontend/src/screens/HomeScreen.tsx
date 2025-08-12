// screens/HomeScreen.tsx - FIXED VERSION WITH IMAGE CAROUSEL
import React, {
  useEffect,
  useState,
  useLayoutEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { debounce, throttle, PerformanceMonitor } from '@/utils/performanceUtils';
import MemoizedProductCard from '@/components/performance/MemoizedProductCard';
import FullWidthCarousel from '@/components/performance/FullWidthCarousel';
import { useLazyLoading, useImagePreloader } from '@/hooks/useIntersectionObserver';
import { fetchSearchedProducts, API_BASE_URL } from '@config/index';
import { Product } from '@types';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import {
  resetAndFetchProducts,
  setCategory,
  loadMoreProducts,
} from '@/store/redux/slices/productSlice';
import { toggleFavorite, toggleFavoriteSync, selectIsFavorite, selectFavorites } from '@/store/redux/slices/favoriteSlice';
import { isUserOwnProduct, getOwnItemMessage } from '@/utils/ownershipHelpers';
import { useAuth } from '@/context/AuthContext';
import COLORS from '@constants/colors';
import NotificationBell from '@components/NotificationBell';
import { SearchFiltersModal } from '@/components/search/SearchFiltersModal';
import { useAppDispatch, useAppSelector } from '@/store/redux/hooks';
import { RootState } from '@store';
import colors from '@constants/colors';
import { SmartRecommendationsCard } from '@/components/ai';
import { logDebug, logInfo, logError } from '@/utils/logger';

const screenWidth = Dimensions.get('window').width;

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

// Fallback banner data if no API advertisements
const fallbackBanners = [
  { 
    id: '1', 
    image: require('../assets/images/ad1.jpg'), // Update path if needed
    title: 'Special Offer',
    subtitle: 'Weekend Sale'
  },
  { 
    id: '2', 
    image: require('../assets/images/ad2.jpg'), // Update path if needed
    title: 'Flash Deal',
    subtitle: 'Limited Time'
  },
  { 
    id: '3', 
    image: require('../assets/images/ad3.jpg'), // Update path if needed
    title: 'Mega Sale',
    subtitle: 'Best Prices'
  },
];

const categoryData = [
  { key: 'All', name: 'ALL', icon: '🏷️' },
  { key: 'Automotive', name: 'AUTOMOTIVE', icon: '🚗' },
  { key: 'Electronics', name: 'ELECTRONICS', icon: '📱' },
  { key: 'Home', name: 'HOME & KITCHEN', icon: '🏠' },
  { key: 'Sports', name: 'SPORTS & OUTDOOR', icon: '⚽' },
  { key: 'Fashion', name: 'FASHION', icon: '👕' },
  { key: 'Books', name: 'BOOKS', icon: '📚' },
  { key: 'Beauty', name: 'BEAUTY', icon: '💄' },
  { key: 'Food', name: 'FOOD', icon: '🍔' },
  { key: 'Toys', name: 'TOYS & GAMES', icon: '🧸' },
  { key: 'Health', name: 'HEALTH & PERSONAL CARE', icon: '💊' },
  { key: 'Pets', name: 'PET SUPPLIES', icon: '🐾' },
  { key: 'Office', name: 'OFFICE PRODUCTS', icon: '🖇️' },
  { key: 'Tools', name: 'TOOLS & HOME IMPROVEMENT', icon: '🛠️' },
  { key: 'Baby', name: 'BABY PRODUCTS', icon: '🍼' },
  { key: 'Garden', name: 'GARDEN & OUTDOORS', icon: '🌻' },
  { key: 'Gaming', name: 'VIDEO GAMES', icon: '🎮' },
  { key: 'Music', name: 'MUSIC & AUDIO', icon: '🎧' },
  { key: 'Jewelry', name: 'JEWELRY', icon: '💍' },
  { key: 'Travel', name: 'TRAVEL & LUGGAGE', icon: '🧳' },
];

function formatCountdown(time: number): string[] {
  const hours = Math.floor(time / 3600);
  const minutes = Math.floor((time % 3600) / 60);
  const seconds = time % 60;
  return [hours, minutes, seconds].map(unit => unit.toString().padStart(2, '0'));
}



export default function HomeScreen() {
  const [countdown, setCountdown] = useState(36000);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [advertisements, setAdvertisements] = useState<any[]>([]);
  const [advertisementLoading, setAdvertisementLoading] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    categories: [],
    priceRange: { min: 0, max: 1000000 },
    condition: [],
    type: [],
    sortBy: null,
  });

  // Performance optimizations
  const performanceMonitor = PerformanceMonitor.getInstance();
  const { preloadImages, isImagePreloaded } = useImagePreloader();
  const { 
    loadedCount, 
    loadMoreItems, 
    markItemVisible, 
    shouldLoadMore 
  } = useLazyLoading(products || [], 10, 5);
  
  const carouselRef = useRef<ScrollView>(null);
  const carouselIntervalRef = useRef<NodeJS.Timeout>();

  const dispatch = useAppDispatch();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth(); // ✅ Add auth hook for ownership checks
  
  // Redux state with safe defaults
  const productState = useAppSelector(state => state?.products);
  const favorites = useAppSelector(selectFavorites);
  
  // Create a memoized Set of favorite IDs for fast lookups and to ensure re-renders
  const favoriteIds = useMemo(() => {
    const safeFavorites = favorites || [];
    const ids = new Set(safeFavorites.map((fav: Product) => fav._id));
    logDebug('Favorite IDs updated', { favoriteIds: Array.from(ids) });
    return ids;
  }, [favorites]);
  
  const {
    products = [],
    loading = false,
    error = null,
    refreshing = false,
    hasMore = true,
    selectedCategory = 'All',
    page = 1,
  } = productState || {};
  

  useLayoutEffect(() => {
    try {
      navigation.setOptions({
        headerShown: true,
        headerTitle: 'Swaap',
        headerTitleStyle: {
          color: colors?.gold || '#FFC107',
          fontSize: 24,
          fontWeight: 'bold',
        },
        headerStyle: {
          backgroundColor: '#1a1a1a',
        },
        headerShadowVisible: false,
        headerRight: () => (
          <View style={styles.headerRightContainer}>
            <TouchableOpacity 
              style={styles.nearbyUsersButton}
              onPress={() => navigation.navigate('NearbyUsers')}
            >
              <Ionicons name="location" size={20} color={COLORS.gold} />
            </TouchableOpacity>
            <NotificationBell />
          </View>
        ),
      });
    } catch (error) {
      console.error('Error setting navigation options:', error);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      try {
        dispatch(resetAndFetchProducts());
      } catch (error) {
        console.error('Error dispatching resetAndFetchProducts:', error);
      }
    }, [dispatch])
  );

  // Get banner data (API advertisements or fallback)
  const discountBanners = useMemo(() => {
    if (advertisements.length > 0) {
      return advertisements.map(ad => ({
        id: ad.id || ad._id,
        title: ad.title,
        subtitle: ad.subtitle,
        image: { uri: ad.image }, // Convert URL to image object
        externalUrl: ad.externalUrl,
        type: ad.type
      }));
    }
    return fallbackBanners;
  }, [advertisements]);

  // Auto-rotate carousel every 10 seconds
  useEffect(() => {
    const startCarouselInterval = () => {
      carouselIntervalRef.current = setInterval(() => {
        setCurrentCarouselIndex(prev => {
          const nextIndex = (prev + 1) % discountBanners.length;
          
          // Auto-scroll to next banner
          if (carouselRef.current) {
            carouselRef.current.scrollTo({
              x: nextIndex * (screenWidth - 32),
              animated: true,
            });
          }
          
          return nextIndex;
        });
      }, 10000);
    };

    startCarouselInterval();
    
    return () => {
      if (carouselIntervalRef.current) {
        clearInterval(carouselIntervalRef.current);
      }
    };
  }, [discountBanners.length]);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch advertisements from API
  const fetchAdvertisements = useCallback(async () => {
    if (advertisementLoading) return;
    
    setAdvertisementLoading(true);
    try {
      logDebug('Fetching advertisements from API');
      const response = await fetch(`${API_BASE_URL}/api/advertisements`);
      
      if (response.ok) {
        const data = await response.json();
        logInfo('Advertisements fetched successfully', { count: data.advertisements?.length || 0 });
        
        if (data.success && Array.isArray(data.advertisements)) {
          setAdvertisements(data.advertisements);
        } else {
          logInfo('No advertisements found, using fallback banners');
          setAdvertisements([]);
        }
      } else {
        console.error('❌ Failed to fetch advertisements:', response.status);
        setAdvertisements([]);
      }
    } catch (error) {
      console.error('❌ Error fetching advertisements:', error);
      setAdvertisements([]);
    } finally {
      setAdvertisementLoading(false);
    }
  }, []); // Remove advertisementLoading dependency to prevent infinite loop

  // Fetch advertisements on component mount
  useEffect(() => {
    fetchAdvertisements();
  }, []); // Remove fetchAdvertisements dependency

  // Optimized Search function with performance monitoring
  const handleSearch = useCallback(
    debounce(async (term: string) => {
      if (!term || term.trim().length < 2) {
        setSearchResults([]);
        setSearching(false);
        setSearchError(null);
        return;
      }

      performanceMonitor.startMeasure('search');
      setSearching(true);
      setSearchError(null);
      
      try {
        logDebug('Starting search', { searchTerm: term.trim() });
        
        const results = await performanceMonitor.measureAsync(
          'fetch-search-results',
          () => fetchSearchedProducts(term.trim())
        );
        
        logInfo('Search results received', { count: results?.length || 0 });
        
        if (!Array.isArray(results)) {
          setSearchResults([]);
        } else {
          setSearchResults(results || []);
          // Preload first few images for better UX
          const imagesToPreload = (results || [])
            .slice(0, 5)
            .map(product => product?.images?.[0])
            .filter(Boolean);
          preloadImages(imagesToPreload);
        }
      } catch (err) {
        console.error('❌ Search error:', err);
        setSearchError(err instanceof Error ? err.message : 'Search failed');
        setSearchResults([]);
      } finally {
        setSearching(false);
        performanceMonitor.endMeasure('search');
      }
    }, 300), // Reduced debounce for better responsiveness
    [performanceMonitor, preloadImages]
  );

  useEffect(() => {
    handleSearch(searchTerm);
  }, [searchTerm, handleSearch]);

  const onRefresh = useCallback(() => {
    try {
      dispatch(resetAndFetchProducts());
      if (searchTerm) {
        clearSearch();
      }
    } catch (error) {
      console.error('Error during refresh:', error);
    }
  }, [dispatch, searchTerm]);

  const handleLoadMore = useCallback(() => {
    try {
      if (!loading && hasMore && searchTerm.length < 2) {
        performanceMonitor.startMeasure('load-more');
        dispatch(loadMoreProducts(page + 1));
        
        // Also load more items in our lazy loader
        if (shouldLoadMore) {
          loadMoreItems();
        }
        
        performanceMonitor.endMeasure('load-more');
      }
    } catch (error) {
      console.error('Error loading more products:', error);
    }
  }, [loading, hasMore, searchTerm, page, dispatch, performanceMonitor, shouldLoadMore, loadMoreItems]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setSearchResults([]);
    setSearchError(null);
    setSearching(false);
  }, []);

  const handleFiltersApply = useCallback((filters: typeof activeFilters) => {
    setActiveFilters(filters);
    logDebug('Applied filters', { filters });
    
    // If we have search results, re-trigger search to apply filters server-side
    if (searchTerm.length > 1) {
      handleSearch(searchTerm);
    }
  }, [searchTerm, handleSearch]);

  const openFilters = useCallback(() => {
    setFiltersVisible(true);
  }, []);

  const closeFilters = useCallback(() => {
    setFiltersVisible(false);
  }, []);

  const filteredItems = useMemo(() => {
    try {
      performanceMonitor.startMeasure('filter-items');
      
      let items = [];
      if (searchTerm.length > 1) {
        items = searchResults || [];
      } else if (selectedCategory === 'All') {
        items = products || [];
      } else {
        items = (products || []).filter(product => {
          if (!product?.category) return false;
          
          const productCategory = product.category.toLowerCase().trim();
          const selectedCat = selectedCategory.toLowerCase().trim();
          
          return productCategory === selectedCat || 
                 productCategory.includes(selectedCat) ||
                 selectedCat.includes(productCategory);
        });
      }
      
      // Apply active filters (but not sorting yet)
      if (activeFilters && (
        activeFilters.categories.length > 0 || 
        activeFilters.condition.length > 0 || 
        activeFilters.type.length > 0 ||
        activeFilters.priceRange.min > 0 ||
        activeFilters.priceRange.max < 1000000
      )) {
        items = items.filter(product => {
          // Category filter
          if (activeFilters.categories.length > 0) {
            const productCategory = product.category?.toUpperCase() || '';
            if (!activeFilters.categories.some(cat => 
              productCategory.includes(cat) || cat.includes(productCategory)
            )) {
              return false;
            }
          }
          
          // Type filter (sale, swap, both)
          if (activeFilters.type.length > 0) {
            if (!activeFilters.type.includes(product.type)) {
              return false;
            }
          }
          
          // Price range filter
          const price = Number(product.price) || 0;
          if (price < activeFilters.priceRange.min || price > activeFilters.priceRange.max) {
            return false;
          }
          
          // Condition filter (if product has condition field)
          if (activeFilters.condition.length > 0 && product.condition) {
            if (!activeFilters.condition.includes(product.condition)) {
              return false;
            }
          }
          
          return true;
        });
      }
      
      // Apply sorting (moved outside the filter condition so it works independently)
      if (activeFilters?.sortBy) {
        logDebug('Applying sort', { sortBy: activeFilters.sortBy, itemCount: items.length });
        items = [...items].sort((a, b) => {
          switch (activeFilters.sortBy) {
            case 'newest':
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            case 'oldest':
              return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            case 'price-low':
              return (Number(a.price) || 0) - (Number(b.price) || 0);
            case 'price-high':
              return (Number(b.price) || 0) - (Number(a.price) || 0);
            case 'rating':
              const ratingA = Number(a.averageRating) || 0;
              const ratingB = Number(b.averageRating) || 0;
              logDebug('Sorting by rating', { itemA: a.title, ratingA, itemB: b.title, ratingB });
              return ratingB - ratingA;
            default:
              return 0;
          }
        });
        logDebug('Sort applied', { sortBy: activeFilters.sortBy });
      }
      
      // Apply lazy loading for non-search results
      if (searchTerm.length < 2) {
        items = items.slice(0, loadedCount);
      }
      
      performanceMonitor.endMeasure('filter-items');
      return items;
    } catch (error) {
      console.error('Error filtering items:', error);
      return [];
    }
  }, [products, searchTerm, searchResults, selectedCategory, loadedCount, performanceMonitor, activeFilters]);

  const handleProductPress = useCallback((product: Product) => {
    try {
      if (product?._id) {
        navigation.navigate('ProductDetail', { productId: product._id });
      }
    } catch (error) {
      console.error('Error navigating to product detail:', error);
    }
  }, [navigation]);

  const handleCategorySelect = useCallback((category: string) => {
    try {
      dispatch(setCategory(category));
      if (searchTerm) {
        clearSearch();
      }
    } catch (error) {
      console.error('Error selecting category:', error);
    }
  }, [dispatch, searchTerm, clearSearch]);

  // Handle advertisement click
  const handleAdClick = useCallback(async (ad: any) => {
    try {
      logInfo('Advertisement clicked', { adTitle: ad.title });
      
      // Record the click for analytics
      if (ad.id) {
        try {
          await fetch(`${API_BASE_URL}/api/advertisements/${ad.id}/click`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          logDebug('Ad click recorded');
        } catch (error) {
          console.error('❌ Failed to record ad click:', error);
        }
      }
      
      // Handle different ad types
      if (ad.type === 'external' && ad.externalUrl) {
        // Open external URL (you might want to use Linking.openURL)
        logInfo('Opening external URL', { url: ad.externalUrl });
      } else if (ad.type === 'user_product' && ad.product) {
        // Navigate to product detail
        navigation.navigate('ProductDetail', { productId: ad.product._id });
      }
    } catch (error) {
      console.error('❌ Error handling ad click:', error);
    }
  }, [navigation]);

  // Optimized Carousel Component
  const renderCarousel = useCallback(() => {
    const carouselData = discountBanners.map(banner => ({
      id: banner.id,
      image: banner.image,
      title: banner.title,
      subtitle: banner.subtitle,
    }));

    return (
      <FullWidthCarousel
        data={carouselData}
        autoRotate={true}
        autoRotateInterval={10000}
        height={120}
        onItemPress={(item, index) => {
          logDebug('Carousel item pressed', { itemTitle: item.title });
          const originalAd = discountBanners[index];
          if (originalAd) {
            handleAdClick(originalAd);
          }
        }}
      />
    );
  }, [discountBanners, handleAdClick]);

  // Flash Sale Banner
  const renderFlashSaleBanner = useCallback(() => (
    <View style={styles.flashBannerContainer}>
      <View style={styles.flashBanner}>
        <Text style={styles.flashTitle}>🔥 Flash Sale Ends In:</Text>
        <View style={styles.timeBoxes}>
          {formatCountdown(countdown).map((unit, i) => (
            <View key={i} style={styles.timeBox}>
              <Text style={styles.timeText}>{unit}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  ), [countdown]);

  // Featured Products Section
  const renderFeaturedSection = useCallback(() => {
    try {
      const safeProducts = products || [];
      const featuredProducts = safeProducts.slice(0, 5);
      
      if (featuredProducts.length === 0) {
        return null;
      }
      
      return (
        <View style={styles.featuredContainer}>
          <Text style={styles.sectionTitle}>Featured</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredScrollContent}
          >
            {featuredProducts.map((product) => (
              <TouchableOpacity 
                key={product._id} 
                style={styles.featuredCard}
                onPress={() => handleProductPress(product)}
              >
                <Image 
                  source={{ uri: product.images?.[0] || 'https://via.placeholder.com/120x80/333/fff?text=No+Image' }}
                  style={styles.featuredImage}
                  onError={() => logError('Featured image failed to load')}
                />
                <View style={styles.featuredInfo}>
                  <Text style={styles.featuredTitle} numberOfLines={1}>
                    {product.title || 'Untitled Product'}
                  </Text>
                  <Text style={styles.featuredPrice}>
                    ₦{Number(product.price || 0).toLocaleString()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      );
    } catch (error) {
      console.error('Error rendering featured section:', error);
      return null;
    }
  }, [products, handleProductPress]);

  // Optimized Product Rendering with MemoizedProductCard
  const renderProduct = useCallback(({ item, index }: { item: Product; index: number }) => {
    try {
      if (!item?._id) {
        return null;
      }

      const isFavorite = favoriteIds.has(item._id);

      // Only render items within loaded count for better performance
      if (searchTerm.length < 2 && index >= loadedCount) {
        return null;
      }

      return (
        <MemoizedProductCard
          product={item}
          isFavorite={isFavorite}
          onPress={handleProductPress}
        />
      );
    } catch (error) {
      console.error('Error rendering product:', error);
      return null;
    }
  }, [favoriteIds, handleProductPress, searchTerm, loadedCount]);

  // Search Header
  const renderSearchHeader = useCallback(() => {
    if (searchTerm.length < 2) return null;
    
    return (
      <View style={styles.searchHeader}>
        <View style={styles.searchHeaderContent}>
          <Text style={styles.searchResultsText}>
            {searching ? 'Searching...' : `${(searchResults || []).length} results for "${searchTerm}"`}
          </Text>
          <TouchableOpacity onPress={clearSearch} style={styles.clearSearchButton}>
            <Ionicons name="close" size={16} color="#666" />
          </TouchableOpacity>
        </View>
        {searchError && (
          <Text style={styles.searchErrorText}>{searchError}</Text>
        )}
      </View>
    );
  }, [searchTerm, searching, (searchResults || []).length, searchError, clearSearch]);

  return (
    <>
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor="#666"
            value={searchTerm}
            onChangeText={setSearchTerm}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searching && (
            <ActivityIndicator size="small" color="#FFC107" style={styles.searchLoader} />
          )}
          {searchTerm.length > 0 && !searching && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearSearchIcon}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={openFilters}>
          <Ionicons name="options-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Carousel and flash banner outside of padded container */}
      {searchTerm.length < 2 && (
        <>
          {renderFlashSaleBanner()}
          {renderCarousel()}
        </>
      )}

      <FlatList
        data={filteredItems}
        keyExtractor={item => item._id || Math.random().toString()}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={useCallback(() => {
              onRefresh();
              fetchAdvertisements();
            }, [onRefresh])}
            tintColor="#FFC107"
          />
        }
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={6}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={10}
        getItemLayout={(data, index) => ({
          length: 280,
          offset: 280 * Math.floor(index / 2),
          index,
        })}
        // Handle viewable items changed properly
        onViewableItemsChanged={useCallback(({ viewableItems }) => {
          viewableItems.forEach((viewableItem) => {
            if (viewableItem.item?._id) {
              markItemVisible(viewableItem.item._id);
            }
          });
        }, [markItemVisible])}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 50,
          minimumViewTime: 100,
        }}
        onScrollBeginDrag={() => {
          // Additional performance optimization
          performanceMonitor.startMeasure('scroll');
        }}
        onMomentumScrollEnd={() => {
          performanceMonitor.endMeasure('scroll');
        }}
        ListHeaderComponent={
          <>
            {renderSearchHeader()}

            {searchTerm.length < 2 && (
              <>
                {renderFeaturedSection()}

                {/* AI Personalized Recommendations */}
                <SmartRecommendationsCard 
                  showPersonalizedOnly={true}
                  maxItems={8}
                  title="🤖 Recommended for You"
                />

                {/* Categories */}
                <View style={styles.categoriesContainer}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoriesScrollContent}
                  >
                    {categoryData.map((category) => (
                      <TouchableOpacity
                        key={category.key}
                        style={[
                          styles.categoryButton,
                          selectedCategory === category.key && styles.selectedCategoryButton,
                        ]}
                        onPress={() => handleCategorySelect(category.key)}
                      >
                        <Text
                          style={[
                            styles.categoryText,
                            selectedCategory === category.key && styles.selectedCategoryText,
                          ]}
                        >
                          {category.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <Text style={styles.productsTitle}>
                  {selectedCategory === 'All' ? 'All Products from other Swaapers' : `${selectedCategory} Products`}
                </Text>
              </>
            )}
          </>
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        renderItem={renderProduct}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            {searching ? (
              <ActivityIndicator size="large" color="#FFC107" />
            ) : (
              <>
                <Text style={styles.emptyText}>
                  {searchTerm.length > 1 
                    ? `No results found for "${searchTerm}"` 
                    : selectedCategory === 'All' 
                      ? 'No products found' 
                      : `No ${selectedCategory} products found`
                  }
                </Text>
                <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
                  <Text style={styles.retryText}>Tap to refresh</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      />

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          try {
            navigation.navigate('PostItem');
          } catch (error) {
            console.error('Error navigating to PostItem:', error);
          }
        }}
      >
        <Ionicons name="add" size={28} color="#000" />
      </TouchableOpacity>
    </View>
    
    <SearchFiltersModal
      visible={filtersVisible}
      onClose={closeFilters}
      onApplyFilters={handleFiltersApply}
      initialFilters={activeFilters}
    />
  </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  searchLoader: {
    marginLeft: 8,
  },
  clearSearchIcon: {
    marginLeft: 8,
  },
  filterButton: {
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 25,
    marginLeft: 12,
  },
  searchHeader: {
    paddingHorizontal: 4,
    paddingBottom: 16,
  },
  searchHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchResultsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  clearSearchButton: {
    padding: 4,
  },
  searchErrorText: {
    color: '#FF4444',
    fontSize: 14,
    marginTop: 4,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100, // Space for tabs
  },
  flashBannerContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  flashBanner: {
    backgroundColor: '#FF4444',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 40,
  },
  flashTitle: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  timeBoxes: {
    flexDirection: 'row',
  },
  timeBox: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 20,
    alignItems: 'center',
    marginLeft: 4,
  },
  timeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Updated Carousel Styles for Images
  carouselContainer: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselScrollContent: {
    alignItems: 'center',
  },
  carouselBanner: {
    width: screenWidth - 32,
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 0,
    position: 'relative',
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  carouselOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 4,
  },
  carouselTextContent: {
    alignItems: 'flex-start',
  },
  carouselTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  carouselSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  carouselIndicators: {
    flexDirection: 'row',
    marginTop: 10,
  },
  carouselIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 4,
  },
  activeCarouselIndicator: {
    backgroundColor: '#FFC107',
  },
  featuredContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  featuredScrollContent: {
    flexDirection: 'row',
    gap: 12,
  },
  featuredCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    width: 140,
    overflow: 'hidden',
  },
  featuredImage: {
    width: '100%',
    height: 80,
  },
  featuredInfo: {
    padding: 12,
  },
  featuredTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  featuredPrice: {
    color: '#FFC107',
    fontSize: 16,
    fontWeight: 'bold',
  },
  categoriesContainer: {
    marginBottom: 20,
  },
  categoriesScrollContent: {
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  categoryButton: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  selectedCategoryButton: {
    backgroundColor: '#FFC107',
  },
  categoryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedCategoryText: {
    color: '#000',
  },
  productsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  productCard: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    margin: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: 120,
  },
  typeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  saleBadge: {
    backgroundColor: '#FF4444',
  },
  swapBadge: {
    backgroundColor: '#4CAF50',
  },
  bothBadge: {
    backgroundColor: '#9C27B0',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  favoriteIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 4,
  },
  productInfo: {
    padding: 12,
  },
  productTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  productPrice: {
    color: '#FFC107',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#FFC107',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    color: '#000',
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    bottom: 80, // Positioned above tab bar
    right: 20,
    backgroundColor: '#FFC107',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  // Header styles
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 16,
  },
  nearbyUsersButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
});