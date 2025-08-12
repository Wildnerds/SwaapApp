import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Image,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Product } from '@types';
import { request } from '@utils/request';
// import { API } from '@config/api';
import COLORS from '@constants/colors';
import { apiClient } from '@config/index'; // or wherever your apiClient is
import { navigationAuth } from '@/navigation/NavigationAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@context/AuthContext';
import { logDebug, logError } from '@/utils/logger';

const { width } = Dimensions.get('window');

export default function MyProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const { isAuthenticated } = useAuth();

  const fetchMyProducts = useCallback(async (showLoading = true) => {
    try {
      // Don't make API calls if user is not authenticated
      if (!isAuthenticated) {
        logDebug('MyProducts: User not authenticated, skipping fetch');
        setProducts([]);
        if (showLoading) setLoading(false);
        return;
      }

      if (showLoading) setLoading(true);

      logDebug('MyProducts: Starting fetch');

      const sort = 'newest';
      
      // ✅ FIXED: Use correct endpoint with /api prefix and let apiClient handle the token
      const response = await apiClient.get(`/api/products/my?sort=${sort}`);

      logDebug('MyProducts API success', { count: response?.length || 0 });
      setProducts(response || []); // apiClient returns data directly, not response.data
      
    } catch (err: any) {
      logError('My Products Fetch Error', err as Error);
      
      // Better error handling
      const errorMessage = err?.status === 404 
        ? 'Products endpoint not found. Please check your server configuration.'
        : err?.status === 401 
        ? 'Please log in again to view your products.'
        : err?.message || 'Failed to fetch your products.';
      
      Alert.alert('Error', errorMessage);
      
      // If unauthorized, don't interfere with AuthContext
      if (err?.status === 401) {
        logDebug('MyProducts: Got 401, letting AuthContext handle auth state');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchMyProducts();
  }, [fetchMyProducts]);

  useFocusEffect(
    useCallback(() => {
      // Throttle focus-based refreshes to prevent rate limiting
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTime;
      const minInterval = 30000; // 30 seconds minimum between automatic refreshes
      
      if (timeSinceLastFetch > minInterval) {
        logDebug('MyProductsScreen focused - refreshing data');
        fetchMyProducts(false);
        setLastFetchTime(now);
      } else {
        logDebug('MyProductsScreen focused - skipping refresh due to throttling', { 
          timeSinceLastFetch, 
          minInterval 
        });
      }
    }, [fetchMyProducts, lastFetchTime])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMyProducts(false);
    setRefreshing(false);
  }, [fetchMyProducts]);

  const renderItem = ({ item, index }: { item: Product; index: number }) => {
    const fallbackDate = new Date(item.createdAt).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    return (
      <TouchableOpacity
        style={[styles.card, { marginTop: index === 0 ? 8 : 0 }]}
        onPress={() => navigation.navigate('ProductDetail', { productId: item._id })}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']}
          style={styles.cardGradient}
        >
          <View style={styles.imageContainer}>
            <Image source={{ uri: item.images[0] }} style={styles.image} />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.6)']}
              style={styles.imageOverlay}
            />
            <View style={styles.typeChip}>
              <Text style={styles.typeText}>{item.type.toUpperCase()}</Text>
            </View>
          </View>
          
          <View style={styles.info}>
            <View style={styles.header}>
              <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
              <View style={styles.priceContainer}>
                <Text style={styles.currency}>₦</Text>
                <Text style={styles.price}>{Number(item.price).toLocaleString()}</Text>
              </View>
            </View>
            
            <View style={styles.footer}>
              <View style={styles.dateContainer}>
                <Ionicons name="time-outline" size={14} color="#888" />
                <Text style={styles.uploadDate}>
                  {item.uploadedAgo ? item.uploadedAgo : fallbackDate}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#0f0f0f', '#1a1a1a']}
        style={styles.loadingContainer}
      >
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={COLORS.gold} />
          <Text style={styles.loadingText}>Loading your products...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (!products.length) {
    return (
      <LinearGradient
        colors={['#0f0f0f', '#1a1a1a']}
        style={styles.emptyContainer}
      >
        <View style={styles.emptyContent}>
          <LinearGradient
            colors={['rgba(255, 215, 0, 0.1)', 'rgba(255, 215, 0, 0.05)']}
            style={styles.emptyIconContainer}
          >
            <Ionicons name="storefront-outline" size={60} color={COLORS.gold} />
          </LinearGradient>
          
          <Text style={styles.emptyTitle}>No Products Yet</Text>
          <Text style={styles.emptyText}>
            Start building your marketplace presence by adding your first product
          </Text>
          
          <TouchableOpacity 
            style={styles.refreshButton} 
            onPress={onRefresh}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.gold, '#DAA520']}
              style={styles.refreshButtonGradient}
            >
              <Ionicons name="refresh" size={18} color="#000" />
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#0f0f0f', '#1a1a1a']}
      style={styles.container}
    >
      <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.gold]}
            tintColor={COLORS.gold}
            progressBackgroundColor="#2a2a2a"
          />
        }
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContent: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  refreshButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  refreshButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  refreshButtonText: {
    color: '#000',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cardGradient: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    height: 200,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  typeChip: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  typeText: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  info: {
    padding: 16,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    lineHeight: 24,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currency: {
    fontSize: 16,
    color: COLORS.gold,
    fontWeight: '600',
  },
  price: {
    fontSize: 20,
    color: COLORS.gold,
    fontWeight: '700',
    marginLeft: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  uploadDate: {
    fontSize: 14,
    color: '#888',
    marginLeft: 6,
    fontWeight: '500',
  },
});