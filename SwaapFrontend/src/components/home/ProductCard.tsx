// components/home/ProductCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '@types';

interface ProductCardProps {
  product: Product;
  isFavorite: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
  hasActiveChats?: boolean;
  chatCount?: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isFavorite,
  onPress,
  onToggleFavorite,
  hasActiveChats = false,
  chatCount = 0,
}) => {
  return (
    <TouchableOpacity style={styles.productCard} onPress={onPress}>
      <Image 
        source={{ uri: product.images?.[0] || 'https://via.placeholder.com/150x120/333/fff' }} 
        style={styles.productImage} 
      />
      <View
        style={[
          styles.typeBadge,
          product.type === 'sale' && styles.saleBadge,
          product.type === 'swap' && styles.swapBadge,
          product.type === 'both' && styles.bothBadge,
        ]}
      >
        <Text style={styles.badgeText}>{product.type?.toUpperCase()}</Text>
      </View>

      <TouchableOpacity
        style={styles.favoriteIcon}
        onPress={onToggleFavorite}
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
        <Text style={styles.productTitle} numberOfLines={2}>{product.title}</Text>
        <Text style={styles.productPrice}>₦{Number(product.price).toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );
};

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
    backgroundColor: '#d607ffff',
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
  productPrice: {
    color: '#FFC107',
    fontSize: 16,
    fontWeight: 'bold',
  },
});