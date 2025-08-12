import React, { memo, useCallback, useMemo } from 'react';
import {
  VirtualizedList,
  Dimensions,
  ViewToken,
  ListRenderItemInfo,
} from 'react-native';
import { Product } from '@types';

interface VirtualizedProductListProps {
  data: Product[];
  renderItem: ({ item, index }: { item: Product; index: number }) => React.ReactElement | null;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  refreshing?: boolean;
  onRefresh?: () => void;
  ListHeaderComponent?: React.ReactElement | null;
  ListEmptyComponent?: React.ReactElement | null;
  ListFooterComponent?: React.ReactElement | null;
  numColumns?: number;
  onViewableItemsChanged?: (info: { viewableItems: ViewToken[] }) => void;
  viewabilityConfig?: {
    itemVisiblePercentThreshold?: number;
    minimumViewTime?: number;
  };
  windowSize?: number;
  maxToRenderPerBatch?: number;
  updateCellsBatchingPeriod?: number;
  initialNumToRender?: number;
}

const screenWidth = Dimensions.get('window').width;
const ITEM_HEIGHT = 280; // Approximate height of product card
const ITEM_WIDTH = (screenWidth - 48) / 2; // 2 columns with padding

const VirtualizedProductList = memo<VirtualizedProductListProps>(({
  data,
  renderItem,
  onEndReached,
  onEndReachedThreshold = 0.5,
  refreshing = false,
  onRefresh,
  ListHeaderComponent,
  ListEmptyComponent,
  ListFooterComponent,
  numColumns = 2,
  onViewableItemsChanged,
  viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 100,
  },
  windowSize = 10,
  maxToRenderPerBatch = 5,
  updateCellsBatchingPeriod = 50,
  initialNumToRender = 6,
}) => {
  const getItem = useCallback(
    (data: Product[], index: number) => {
      return data[index];
    },
    []
  );

  const getItemCount = useCallback(
    (data: Product[]) => data.length,
    []
  );

  const keyExtractor = useCallback(
    (item: Product, index: number) => item._id || index.toString(),
    []
  );

  const getItemLayout = useCallback(
    (data: Product[] | null | undefined, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * Math.floor(index / numColumns),
      index,
    }),
    [numColumns]
  );

  const renderVirtualizedItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Product>) => {
      return renderItem({ item, index });
    },
    [renderItem]
  );

  // Memoize the viewability config to prevent unnecessary re-renders
  const memoizedViewabilityConfig = useMemo(
    () => viewabilityConfig,
    [viewabilityConfig.itemVisiblePercentThreshold, viewabilityConfig.minimumViewTime]
  );

  return (
    <VirtualizedList
      data={data}
      getItem={getItem}
      getItemCount={getItemCount}
      keyExtractor={keyExtractor}
      renderItem={renderVirtualizedItem}
      getItemLayout={getItemLayout}
      onEndReached={onEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      onRefresh={onRefresh}
      refreshing={refreshing}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      ListFooterComponent={ListFooterComponent}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={memoizedViewabilityConfig}
      // Performance optimization props
      windowSize={windowSize}
      maxToRenderPerBatch={maxToRenderPerBatch}
      updateCellsBatchingPeriod={updateCellsBatchingPeriod}
      initialNumToRender={initialNumToRender}
      removeClippedSubviews={true}
      disableVirtualization={false}
      // Style
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingBottom: 100,
      }}
    />
  );
});

VirtualizedProductList.displayName = 'VirtualizedProductList';

export default VirtualizedProductList;