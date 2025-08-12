// screens/HomeScreen.tsx - FIXED VERSION WITH RICH DESIGN
import React, {
  useEffect,
  useState,
  useLayoutEffect,
  useCallback,
  useMemo,
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
import debounce from 'lodash.debounce';
import { fetchSearchedProducts } from '@config/index';
import { Product } from '@types';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import {
  resetAndFetchProducts,
  setCategory,
  loadMoreProducts,
} from '@/store/redux/slices/productSlice';
import { toggleFavorite, toggleFavoriteSync, selectFavorites } from '@/store/redux/slices/favoriteSlice';
import { isUserOwnProduct, getOwnItemMessage } from '@/utils/ownershipHelpers';
import { useAuth } from '@/context/AuthContext';
import COLORS from '@constants/colors';
import NotificationBell from '@components/NotificationBell';
import { useAppDispatch, useAppSelector } from '@/store/redux/hooks';
import { RootState } from '@store';
import { request } from '@utils/request';
import { API } from '@config/index';
import colors from '@constants/colors';

const screenWidth = Dimensions.get('window').width;

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

// Static data - never changes
const discountBanners = [
  { 
    id: '1', 
    percentage: '55%', 
    title: 'Discount',
    subtitle: 'Weekend Special',
    color: '#4CAF50',
  },
  { 
    id: '2', 
    percentage: '40%', 
    title: 'Discount',
    subtitle: 'Flash Sale',
    color: '#FF5722',
  },
  { 
    id: '3', 
    percentage: '60%', 
    title: 'Discount',
    subtitle: 'Mega Deal',
    color: '#2196F3',
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

// Sample products fallback data
const sampleProducts: Product[] = [
  {
    _id: '1',
    title: 'iPhone 14 Pro Max',
    price: 950000,
    category: 'Electronics',
    type: 'sale',
    images: ['https://via.placeholder.com/200x150/1a1a1a/FFC107?text=iPhone+14+Pro'],
    description: 'Latest iPhone model with amazing features',
    user: { _id: '1', fullName: 'John Doe', level: 'Pro', isPro: true, isAdmin: false, id: '1' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    __v: 0,
  },
  {
    _id: '2',
    title: 'MacBook Pro 16" M2',
    price: 1200000,
    category: 'Electronics',
    type: 'swap',
    images: ['https://via.placeholder.com/200x150/1a1a1a/FFC107?text=MacBook+Pro'],
    description: 'High-performance laptop for professionals',
    user: { _id: '2', fullName: 'Jane Smith', level: 'Standard', isPro: false, isAdmin: false, id: '2' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    __v: 0,
  },
  {
    _id: '3',
    title: 'Nike Air Max 270',
    price: 45000,
    category: 'Fashion',
    type: 'sale',
    images: ['https://via.placeholder.com/200x150/1a1a1a/FFC107?text=Nike+Air+Max'],
    description: 'Comfortable running shoes',
    user: { _id: '3', fullName: 'Mike Johnson', level: 'Standard', isPro: false, isAdmin: false, id: '3' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    __v: 0,
  },
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
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  const dispatch = useAppDispatch();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth(); // ✅ Add auth hook for ownership checks
  
  // Safe Redux state access with fallbacks
  const productState = useAppSelector(state => state?.products || {});
  const favorites = useAppSelector(selectFavorites);
  
  // Create a memoized Set of favorite IDs for fast lookups and to ensure re-renders
  const favoriteIds = useMemo(() => {
    return new Set(favorites.map((fav: Product) => fav._id));
  }, [favorites]);
  
  const {
    products = [],
    loading = false,
    error = null,
    refreshing = false,
    hasMore = true,
    selectedCategory = 'All',
    page = 1,
  } = productState;
  

  // Use sample data if no real products
  const displayProducts = products.length > 0 ? products : sampleProducts;

  // Safe header setup
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
        headerRight: () => <NotificationBell />,
      });
    } catch (error) {
      console.warn('Header setup error:', error);
    }
  }, [navigation]);

  // Auto-rotate banners
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBannerIndex(prev => (prev + 1) % discountBanners.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Safe focus effect
  useFocusEffect(
    useCallback(() => {
      try {
        dispatch(resetAndFetchProducts());
      } catch (error) {
        console.warn('Focus effect error:', error);
      }
    }, [dispatch])
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Safe search function
  const handleSearch = useCallback(
    debounce(async (term: string) => {
      console.log('Search triggered with term:', term);
      
      if (!term || term.trim().length < 2) {
        setSearchResults([]);
        setSearching(false);
        setSearchError(null);
        return;
      }

      setSearching(true);
      setSearchError(null);
      
      try {
        let results: Product[] = [];
        
        // Try API search first, fallback to local search
        try {
          if (API?.products?.search && request) {
            results = await request<Product[]>({
              method: 'get',
              url: `${API.products.search}?q=${encodeURIComponent(term.trim())}`,
            });
            console.log('API search results:', results.length);
          } else {
            throw new Error('API not available');
          }
        } catch (apiError) {
          console.log('API search failed, trying local search:', apiError);
          
          // Local search fallback
          results = displayProducts.filter(product =>
            product.title?.toLowerCase().includes(term.toLowerCase()) ||
            product.category?.toLowerCase().includes(term.toLowerCase()) ||
            product.description?.toLowerCase().includes(term.toLowerCase())
          );
          console.log('Local search results:', results.length);
        }

        if (!Array.isArray(results)) {
          console.warn('Search results is not an array:', results);
          results = [];
        }

        setSearchResults(results);
        console.log(`Search completed: ${results.length} results for "${term}"`);
        
      } catch (err) {
        console.error('Search error:', err);
        setSearchError(err instanceof Error ? err.message : 'Search failed');
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400),
    [displayProducts]
  );

  useEffect(() => {
    handleSearch(searchTerm);
  }, [searchTerm, handleSearch]);

  const onRefresh = () => {
    try {
      dispatch(resetAndFetchProducts());
      if (searchTerm) {
        clearSearch();
      }
    } catch (error) {
      console.warn('Refresh error:', error);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore && searchTerm.length < 2) {
      try {
        dispatch(loadMoreProducts(page + 1));
      } catch (error) {
        console.warn('Load more error:', error);
      }
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setSearchError(null);
    setSearching(false);
  };

  const filteredItems = useMemo(() => {
    if (searchTerm.length > 1) {
      console.log(`Showing ${searchResults.length} search results for: "${searchTerm}"`);
      return searchResults;
    }
    
    if (selectedCategory === 'All') {
      console.log(`Showing all ${displayProducts.length} products`);
      return displayProducts;
    }
    
    const filtered = displayProducts.filter(product => {
      const productCategory = product.category?.toLowerCase().trim();
      const selectedCat = selectedCategory.toLowerCase().trim();
      
      return productCategory === selectedCat || 
             productCategory?.includes(selectedCat) ||
             selectedCat?.includes(productCategory);
    });
    
    console.log(`Filtered ${filtered.length} products for category: ${selectedCategory}`);
    return filtered;
  }, [displayProducts, searchTerm, searchResults, selectedCategory]);

  const handleProductPress = (product: Product) => {
    try {
      navigation.navigate('ProductDetail', { productId: product._id });
    } catch (error) {
      console.warn('Navigation error:', error);
    }
  };

  const handleCategorySelect = (category: string) => {
    console.log('Selected category:', category);
    try {
      dispatch(setCategory(category));
      if (searchTerm) {
        clearSearch();
      }
    } catch (error) {
      console.warn('Category select error:', error);
    }
  };

  // Safe image with fallback
  const SafeImage = ({ uri, style, ...props }: any) => (
    <Image 
      source={{ uri: uri || 'https://via.placeholder.com/150x120/333/fff?text=No+Image' }} 
      style={style}
      defaultSource={{ uri: 'https://via.placeholder.com/150x120/333/fff?text=Loading' }}
      onError={() => console.warn('Image load error:', uri)}
      {...props}
    />
  );

  // Simple Discount Carousel Component (replaced complex carousel)
  const renderDiscountCarousel = () => {
    const currentBanner = discountBanners[currentBannerIndex];
    return (
      <View style={styles.carouselContainer}>
        <TouchableOpacity style={[styles.discountBanner, { backgroundColor: currentBanner.color }]}>
          <View style={styles.discountContent}>
            <View style={styles.discountTextContainer}>
              <Text style={styles.discountPercentage}>{currentBanner.percentage}</Text>
              <Text style={styles.discountText}>{currentBanner.title}</Text>
              <Text style={styles.discountSubtext}>{currentBanner.subtitle}</Text>
            </View>
            <Ionicons name="gift-outline" size={60} color="#fff" style={styles.discountIcon} />
          </View>
        </TouchableOpacity>
        
        {/* Banner indicators */}
        <View style={styles.bannerIndicators}>
          {discountBanners.map((_, index) => (
            <View
              key={index}
              style={[
                styles.bannerIndicator,
                index === currentBannerIndex && styles.activeBannerIndicator,
              ]}
            />
          ))}
        </View>
      </View>
    );
  };

  // Flash Sale Countdown Banner Component
  const renderFlashSaleBanner = () => (
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
  );

  // Featured Section Component
  const renderFeaturedSection = () => (
    <View style={styles.featuredContainer}>
      <Text style={styles.sectionTitle}>🌟 Featured Products</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.featuredScrollContent}
      >
        {displayProducts.slice(0, 5).map((product) => (
          <TouchableOpacity 
            key={product._id} 
            style={styles.featuredCard}
            onPress={() => handleProductPress(product)}
          >
            <SafeImage 
              uri={product.images?.[0]}
              style={styles.featuredImage}
            />
            <View style={styles.featuredInfo}>
              <Text style={styles.featuredTitle} numberOfLines={1}>
                {product.title || 'Untitled Product'}
              </Text>
              <Text style={styles.featuredPrice}>
                ₦{Number(product.price || 0).toLocaleString()}
              </Text>
              <View style={[
                styles.featuredTypeBadge, 
                product.type === 'sale' ? styles.saleBadge : 
                product.type === 'swap' ? styles.swapBadge : styles.bothBadge
              ]}>
                <Text style={styles.featuredBadgeText}>
                  {(product.type || 'sale').toUpperCase()}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // Product Card Component
  const renderProduct = ({ item }: { item: Product }) => {
    const isFavorite = favoriteIds.has(item._id);

    return (
      <TouchableOpacity style={styles.productCard} onPress={() => handleProductPress(item)}>
        <SafeImage 
          uri={item.images?.[0]}
          style={styles.productImage} 
        />
        <View
          style={[
            styles.typeBadge,
            item.type === 'sale' && styles.saleBadge,
            item.type === 'swap' && styles.swapBadge,
            item.type === 'both' && styles.bothBadge,
          ]}
        >
          <Text style={styles.badgeText}>{(item.type || 'sale').toUpperCase()}</Text>
        </View>

        <TouchableOpacity
          style={styles.favoriteIcon}
          onPress={() => {
            try {
              // ✅ Prevent users from favoriting their own items
              if (isUserOwnProduct(item, user)) {
                Alert.alert(
                  'Cannot Add to Favorites', 
                  getOwnItemMessage('favorite'),
                  [{ text: 'OK' }]
                );
                return;
              }
              
              dispatch(toggleFavorite(item));
            } catch (error) {
              console.warn('Toggle favorite error:', error);
            }
          }}
        >
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={16}
            color="#FFC107"
          />
        </TouchableOpacity>
        
        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {item.title || 'Untitled Product'}
          </Text>
          <Text style={styles.productPrice}>
            ₦{Number(item.price || 0).toLocaleString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Search results header component
  const renderSearchHeader = () => {
    if (searchTerm.length < 2) return null;
    
    return (
      <View style={styles.searchHeader}>
        <View style={styles.searchHeaderContent}>
          <Text style={styles.searchResultsText}>
            {searching ? 'Searching...' : `${searchResults.length} results for "${searchTerm}"`}
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
  };

  return (
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
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="options-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={item => item._id || Math.random().toString()}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFC107"
          />
        }
        ListHeaderComponent={
          <>
            {/* Search Results Header */}
            {renderSearchHeader()}

            {/* Only show these sections when not searching */}
            {searchTerm.length < 2 && (
              <>
                {/* Flash Sale Countdown Banner */}
                {renderFlashSaleBanner()}

                {/* Discount Carousel */}
                {renderDiscountCarousel()}

                {/* Featured Section */}
                {renderFeaturedSection()}

                {/* Categories */}
                <View style={styles.categoriesContainer}>
                  <Text style={styles.sectionTitle}>🏷️ Categories</Text>
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
                        <Text style={styles.categoryIcon}>{category.icon}</Text>
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

                {/* Products Section Title */}
                <Text style={styles.productsTitle}>
                  {selectedCategory === 'All' 
                    ? '🛍️ All Products from Swaapers' 
                    : `${categoryData.find(c => c.key === selectedCategory)?.icon || ''} ${selectedCategory} Products`}
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
            console.warn('Navigation error:', error);
          }
        }}
      >
        <Ionicons name="add" size={28} color="#000" />
      </TouchableOpacity>
    </View>
  );
}

// All styles in one place
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
    paddingBottom: 100,
  },
  carouselContainer: {
    marginBottom: 20,
  },
  discountBanner: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
  },
  discountContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  discountTextContainer: {
    flex: 1,
  },
  discountPercentage: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  discountText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: -4,
  },
  discountSubtext: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginTop: 2,
  },
  discountIcon: {
    opacity: 0.3,
  },
  bannerIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#444',
    marginHorizontal: 4,
  },
  activeBannerIndicator: {
    backgroundColor: '#FFC107',
  },
  flashBanner: {
    backgroundColor: '#FF4444',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
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
    marginBottom: 6,
  },
  featuredTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  featuredBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  categoriesContainer: {
    marginBottom: 24,
  },
  categoriesScrollContent: {
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  categoryButton: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  selectedCategoryButton: {
    backgroundColor: '#FFC107',
  },
  categoryIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  categoryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
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
    bottom: 10,
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
});