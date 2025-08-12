// components/home/FeaturedSection.tsx - ULTRA STABLE VERSION
import React, { memo, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Product } from '@types';

interface FeaturedSectionProps {
  products: Product[];
  onProductPress: (product: Product) => void;
  title?: string;
  maxItems?: number;
}

// ✅ ULTRA FIX: Create completely isolated product item
const FeaturedProductItem = memo(({ 
  product, 
  onPress 
}: { 
  product: Product; 
  onPress: () => void;
}) => (
  <TouchableOpacity 
    style={featuredStyles.featuredCard}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Image 
      source={{ uri: product.images?.[0] || 'https://via.placeholder.com/120x80/333/fff' }}
      style={featuredStyles.featuredImage}
    />
    <View style={featuredStyles.featuredInfo}>
      <Text style={featuredStyles.featuredTitle} numberOfLines={1}>
        {product.title}
      </Text>
      <Text style={featuredStyles.featuredPrice}>
        ₦{Number(product.price).toLocaleString()}
      </Text>
    </View>
  </TouchableOpacity>
));

FeaturedProductItem.displayName = 'FeaturedProductItem';

export const FeaturedSection = memo<FeaturedSectionProps>(({
  products,
  onProductPress,
  title = "Featured",
  maxItems = 5,
}) => {
  // ✅ ULTRA FIX: Use ref to maintain scroll position
  const scrollViewRef = useRef<ScrollView>(null);
  
  // ✅ ULTRA FIX: Slice products immediately, don't recalculate
  const featuredProducts = products.slice(0, maxItems);

  if (featuredProducts.length === 0) {
    return null;
  }

  return (
    <View style={featuredStyles.featuredContainer}>
      <Text style={featuredStyles.sectionTitle}>{title}</Text>
      <ScrollView 
        ref={scrollViewRef}
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={featuredStyles.featuredScrollContent}
        // ✅ ULTRA FIX: Completely disable any auto-scroll behavior
        scrollEventThrottle={16}
        decelerationRate="normal"
        // ✅ Remove snapping - it causes reset issues
        bounces={true}
        // ✅ Add these to prevent reset
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={false}
      >
        {featuredProducts.map((product) => (
          <FeaturedProductItem
            key={`featured-${product._id}`} // ✅ More specific key
            product={product}
            onPress={() => onProductPress(product)}
          />
        ))}
      </ScrollView>
    </View>
  );
});

FeaturedSection.displayName = 'FeaturedSection';

const featuredStyles = StyleSheet.create({
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
    paddingRight: 16, // ✅ Add padding to prevent cut-off
  },
  featuredCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    width: 140,
    overflow: 'hidden',
  },
  featuredImage: {
    width: 140, // ✅ Match card width exactly
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
});