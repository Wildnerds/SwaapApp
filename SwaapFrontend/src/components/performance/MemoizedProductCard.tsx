import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '@types';
import { useAppDispatch } from '@/store/redux/hooks';
import { toggleFavoriteSync } from '@/store/redux/slices/favoriteSlice';
import { isUserOwnProduct, getOwnItemMessage } from '@/utils/ownershipHelpers';
import { useAuth } from '@/context/AuthContext';
import { logError } from '@/utils/logger';
import LazyImage from './LazyImage';

interface MemoizedProductCardProps {
  product: Product;
  isFavorite: boolean;
  onPress: (product: Product) => void;
  hasActiveChats?: boolean;
  chatCount?: number;
}

const MemoizedProductCard = memo<MemoizedProductCardProps>(({
  product,
  isFavorite,
  onPress,
  hasActiveChats = false,
  chatCount = 0,
}) => {
  const dispatch = useAppDispatch();
  const { user } = useAuth();

  const handlePress = useCallback(() => {
    onPress(product);
  }, [onPress, product]);

  const handleFavoritePress = useCallback(() => {
    try {
      // Prevent users from favoriting their own items
      if (isUserOwnProduct(product, user)) {
        Alert.alert(
          'Cannot Add to Favorites',
          getOwnItemMessage('favorite'),
          [{ text: 'OK' }]
        );
        return;
      }

      dispatch(toggleFavoriteSync(product));
    } catch (error) {
      logError('Error toggling favorite', error as Error, { productId: product._id });
    }
  }, [dispatch, product, user]);

  return (
    <TouchableOpacity style={styles.productCard} onPress={handlePress}>
      <LazyImage 
        source={{ uri: product.images?.[0] || 'https://via.placeholder.com/150x120/333/fff?text=No+Image' }}
        style={styles.productImage}
        showLoadingIndicator={true}
        showErrorIcon={true}
      />
      
      <View
        style={[
          styles.typeBadge,
          product.type === 'sale' && styles.saleBadge,
          product.type === 'swap' && styles.swapBadge,
          product.type === 'both' && styles.bothBadge,
        ]}
      >
        <Text style={styles.badgeText}>{product.type?.toUpperCase() || 'ITEM'}</Text>
      </View>

      <TouchableOpacity
        style={styles.favoriteIcon}
        onPress={handleFavoritePress}
      >
        <Ionicons
          name={isFavorite ? 'heart' : 'heart-outline'}
          size={16}
          color="#FFC107"
        />
      </TouchableOpacity>

      {/* Chat Indicator */}
      {hasActiveChats && (
        <View style={styles.chatIndicator}>
          <Ionicons name="chatbubble" size={12} color="#fff" />
          {chatCount > 1 && (
            <Text style={styles.chatCount}>{chatCount}</Text>
          )}
        </View>
      )}
      
      <View style={styles.productInfo}>
        <Text style={styles.productTitle} numberOfLines={2}>
          {product.title || 'Untitled Product'}
        </Text>
        {product.condition && (
          <Text style={styles.productCondition}>
            {product.condition}
          </Text>
        )}
        <Text style={styles.productPrice}>
          ₦{Number(product.price || 0).toLocaleString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  return (
    prevProps.product._id === nextProps.product._id &&
    prevProps.product.title === nextProps.product.title &&
    prevProps.product.price === nextProps.product.price &&
    prevProps.product.condition === nextProps.product.condition &&
    prevProps.product.images?.[0] === nextProps.product.images?.[0] &&
    prevProps.isFavorite === nextProps.isFavorite &&
    prevProps.hasActiveChats === nextProps.hasActiveChats &&
    prevProps.chatCount === nextProps.chatCount
  );
});

MemoizedProductCard.displayName = 'MemoizedProductCard';

const styles = StyleSheet.create({
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
  chatIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#9C27B0',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 24,
    height: 20,
  },
  chatCount: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
    marginLeft: 2,
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
  productCondition: {
    color: '#666',
    fontSize: 11,
    fontStyle: 'italic',
    marginBottom: 2,
  },
  productPrice: {
    color: '#FFC107',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MemoizedProductCard;