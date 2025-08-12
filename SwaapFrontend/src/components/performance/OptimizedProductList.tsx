import React, { memo, useCallback, useMemo } from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  ListRenderItemInfo,
  ViewToken,
} from 'react-native';
import { Product } from '@types';
import MemoizedProductCard from './MemoizedProductCard';
import { useAppSelector } from '@/store/redux/hooks';
import { selectFavorites } from '@/store/redux/slices/favoriteSlice';

interface OptimizedProductListProps {
  data: Product[];
  onEndReached?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  loading?: boolean;
  onProductPress: (product: Product) => void;
  ListHeaderComponent?: React.ReactElement | null;
  ListEmptyComponent?: React.ReactElement | null;
  numColumns?: number;
  searchTerm?: string;
  selectedCategory?: string;
  onViewableItemsChanged?: (info: { viewableItems: ViewToken[] }) => void;
}

const OptimizedProductList = memo<OptimizedProductListProps>(({
  data,
  onEndReached,
  onRefresh,
  refreshing = false,
  loading = false,
  onProductPress,
  ListHeaderComponent,
  ListEmptyComponent,
  numColumns = 2,
  searchTerm = '',
  selectedCategory = 'All',
  onViewableItemsChanged,
}) => {
  const favorites = useAppSelector(selectFavorites);

  // Memoized favorite IDs set for O(1) lookups
  const favoriteIds = useMemo(() => {
    return new Set(favorites.map((fav: Product) => fav._id));
  }, [favorites]);

  // Memoized key extractor
  const keyExtractor = useCallback(
    (item: Product, index: number) => item._id || `product-${index}`,
    []
  );

  // Optimized item layout calculation
  const getItemLayout = useCallback(
    (data: Product[] | null | undefined, index: number) => {
      const ITEM_HEIGHT = 280;
      const row = Math.floor(index / numColumns);
      return {
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * row,
        index,
      };
    },
    [numColumns]
  );

  // Memoized render item
  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Product>) => {
      if (!item?._id) return null;

      const isFavorite = favoriteIds.has(item._id);

      return (
        <MemoizedProductCard
          product={item}
          isFavorite={isFavorite}
          onPress={onProductPress}
        />
      );
    },
    [favoriteIds, onProductPress]
  );

  // Memoized empty component
  const renderEmptyComponent = useCallback(() => {
    if (ListEmptyComponent) return ListEmptyComponent;

    return (
      <View style={styles.emptyContainer}>
        {loading ? (
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
            {onRefresh && (
              <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
                <Text style={styles.retryText}>Tap to refresh</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    );
  }, [ListEmptyComponent, loading, searchTerm, selectedCategory, onRefresh]);

  // Memoized footer component
  const renderFooterComponent = useCallback(() => {
    if (!loading) return null;
    
    return (
      <View style={styles.footerContainer}>
        <ActivityIndicator size="small" color="#FFC107" />
        <Text style={styles.loadingText}>Loading more...</Text>
      </View>
    );
  }, [loading]);

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={numColumns}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
      
      // Performance optimizations
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={8}
      windowSize={10}
      getItemLayout={getItemLayout}
      
      // Refresh control
      refreshControl={onRefresh ? (
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#FFC107"
          colors={['#FFC107']}
        />
      ) : undefined}
      
      // Infinite scroll
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      
      // Components
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={renderEmptyComponent}
      ListFooterComponent={renderFooterComponent}
      
      // Viewability config
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={{
        itemVisiblePercentThreshold: 50,
        minimumViewTime: 100,
      }}
    />
  );
});

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: '#FFC107',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 16,
  },
  footerContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
  },
});

OptimizedProductList.displayName = 'OptimizedProductList';

export default OptimizedProductList;