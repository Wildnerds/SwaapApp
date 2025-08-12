import React, { useState, useCallback, useEffect, memo, useRef } from 'react';
import { Image, View, ActivityIndicator, Text, StyleSheet, ImageStyle, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ImageCacheProps {
  uri: string;
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  placeholder?: React.ReactNode;
  errorPlaceholder?: React.ReactNode;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  onLoad?: () => void;
  onError?: () => void;
  showLoadingIndicator?: boolean;
  showErrorIcon?: boolean;
  priority?: 'high' | 'normal' | 'low';
  preloadNext?: string[];
}

class ImageCacheManager {
  private static instance: ImageCacheManager;
  private cache = new Map<string, boolean>();
  private preloadQueue = new Set<string>();
  private isPreloading = false;

  static getInstance(): ImageCacheManager {
    if (!ImageCacheManager.instance) {
      ImageCacheManager.instance = new ImageCacheManager();
    }
    return ImageCacheManager.instance;
  }

  async preloadImage(uri: string): Promise<void> {
    if (this.cache.has(uri)) return;

    return new Promise((resolve, reject) => {
      Image.prefetch(uri)
        .then(() => {
          this.cache.set(uri, true);
          resolve();
        })
        .catch((error) => {
          console.warn('Image preload failed:', uri, error);
          reject(error);
        });
    });
  }

  addToQueue(uris: string[], priority: 'high' | 'normal' | 'low' = 'normal') {
    uris.forEach(uri => {
      if (!this.cache.has(uri)) {
        this.preloadQueue.add(uri);
      }
    });

    if (!this.isPreloading) {
      this.processQueue();
    }
  }

  private async processQueue() {
    if (this.preloadQueue.size === 0) {
      this.isPreloading = false;
      return;
    }

    this.isPreloading = true;
    const batch = Array.from(this.preloadQueue).slice(0, 3); // Process 3 at a time
    
    await Promise.allSettled(
      batch.map(uri => {
        this.preloadQueue.delete(uri);
        return this.preloadImage(uri);
      })
    );

    // Process next batch
    setTimeout(() => this.processQueue(), 100);
  }

  isCached(uri: string): boolean {
    return this.cache.has(uri);
  }
}

const ImageCache = memo<ImageCacheProps>(({
  uri,
  style,
  containerStyle,
  placeholder,
  errorPlaceholder,
  resizeMode = 'cover',
  onLoad,
  onError,
  showLoadingIndicator = true,
  showErrorIcon = true,
  priority = 'normal',
  preloadNext = [],
}) => {
  const [loading, setLoading] = useState(!ImageCacheManager.getInstance().isCached(uri));
  const [error, setError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (preloadNext.length > 0) {
      ImageCacheManager.getInstance().addToQueue(preloadNext, priority);
    }
  }, [preloadNext, priority]);

  const handleLoad = useCallback(() => {
    if (!mountedRef.current) return;
    setLoading(false);
    setError(false);
    setImageLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    if (!mountedRef.current) return;
    setLoading(false);
    setError(true);
    onError?.();
  }, [onError]);

  const defaultStyle: ImageStyle = {
    width: 150,
    height: 120,
    backgroundColor: '#2a2a2a',
    ...style,
  };

  const defaultContainerStyle: ViewStyle = {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    ...defaultStyle,
    ...containerStyle,
  };

  if (error) {
    if (errorPlaceholder) {
      return <View style={defaultContainerStyle}>{errorPlaceholder}</View>;
    }

    return (
      <View style={[defaultContainerStyle, styles.errorContainer]}>
        {showErrorIcon && (
          <>
            <Ionicons name="image-outline" size={32} color="#666" />
            <Text style={styles.errorText}>Image failed to load</Text>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={defaultContainerStyle}>
      <Image
        source={{ uri }}
        style={[defaultStyle, !imageLoaded && styles.hiddenImage]}
        resizeMode={resizeMode}
        onLoad={handleLoad}
        onError={handleError}
      />
      
      {loading && (
        <View style={styles.loadingOverlay}>
          {placeholder || (
            <>
              {showLoadingIndicator && (
                <ActivityIndicator size="small" color="#FFC107" />
              )}
              <Text style={styles.loadingText}>Loading...</Text>
            </>
          )}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  errorContainer: {
    backgroundColor: '#2a2a2a',
  },
  errorText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
  },
  loadingText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  hiddenImage: {
    opacity: 0,
  },
});

ImageCache.displayName = 'ImageCache';

export { ImageCacheManager };
export default ImageCache;