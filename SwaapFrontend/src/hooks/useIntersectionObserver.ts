import { useEffect, useState, useRef, useCallback } from 'react';
import { ViewToken } from 'react-native';

interface UseIntersectionObserverProps {
  threshold?: number;
  rootMargin?: number;
  enabled?: boolean;
}

interface IntersectionResult {
  isVisible: boolean;
  entry: ViewToken | null;
}

// Custom hook for handling intersection observer functionality in React Native
export const useIntersectionObserver = ({
  threshold = 0.5,
  rootMargin = 0,
  enabled = true,
}: UseIntersectionObserverProps = {}): {
  observe: (callback: (info: { viewableItems: ViewToken[] }) => void) => void;
  unobserve: () => void;
  viewabilityConfig: any;
} => {
  const observerRef = useRef<((info: { viewableItems: ViewToken[] }) => void) | null>(null);

  const observe = useCallback((callback: (info: { viewableItems: ViewToken[] }) => void) => {
    if (enabled) {
      observerRef.current = callback;
    }
  }, [enabled]);

  const unobserve = useCallback(() => {
    observerRef.current = null;
  }, []);

  const handleViewableItemsChanged = useCallback((info: { viewableItems: ViewToken[] }) => {
    if (observerRef.current && enabled) {
      observerRef.current(info);
    }
  }, [enabled]);

  const viewabilityConfig = {
    viewAreaCoveragePercentThreshold: threshold * 100,
    minimumViewTime: 100,
    itemVisiblePercentThreshold: threshold * 100,
  };

  return {
    observe,
    unobserve,
    viewabilityConfig,
  };
};

// Hook for lazy loading items based on visibility
export const useLazyLoading = (
  items: any[] | undefined | null,
  initialLoadCount: number = 10,
  loadMoreCount: number = 5
) => {
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set());
  const [loadedCount, setLoadedCount] = useState(initialLoadCount);

  const safeItems = items || [];
  const itemsLength = safeItems.length;

  const loadMoreItems = useCallback(() => {
    setLoadedCount(prev => Math.min(prev + loadMoreCount, itemsLength));
  }, [itemsLength, loadMoreCount]);

  const markItemVisible = useCallback((itemId: string) => {
    setVisibleItems(prev => new Set(prev).add(itemId));
  }, []);

  const isItemVisible = useCallback((itemId: string) => {
    return visibleItems.has(itemId);
  }, [visibleItems]);

  const shouldLoadMore = loadedCount < itemsLength;

  return {
    loadedCount,
    loadMoreItems,
    markItemVisible,
    isItemVisible,
    shouldLoadMore,
    visibleItems,
  };
};

// Hook for managing image preloading
export const useImagePreloader = () => {
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());

  const preloadImage = useCallback(async (uri: string): Promise<boolean> => {
    if (preloadedImages.has(uri) || loadingImages.has(uri)) {
      return preloadedImages.has(uri);
    }

    setLoadingImages(prev => new Set(prev).add(uri));

    return new Promise((resolve) => {
      const image = new Image();
      
      image.onload = () => {
        setPreloadedImages(prev => new Set(prev).add(uri));
        setLoadingImages(prev => {
          const newSet = new Set(prev);
          newSet.delete(uri);
          return newSet;
        });
        resolve(true);
      };

      image.onerror = () => {
        setLoadingImages(prev => {
          const newSet = new Set(prev);
          newSet.delete(uri);
          return newSet;
        });
        resolve(false);
      };

      image.src = uri;
    });
  }, [preloadedImages, loadingImages]);

  const preloadImages = useCallback(async (uris: string[]) => {
    const promises = uris.map(uri => preloadImage(uri));
    await Promise.allSettled(promises);
  }, [preloadImage]);

  const isImagePreloaded = useCallback((uri: string) => {
    return preloadedImages.has(uri);
  }, [preloadedImages]);

  const isImageLoading = useCallback((uri: string) => {
    return loadingImages.has(uri);
  }, [loadingImages]);

  return {
    preloadImage,
    preloadImages,
    isImagePreloaded,
    isImageLoading,
    preloadedImages: Array.from(preloadedImages),
    loadingImages: Array.from(loadingImages),
  };
};