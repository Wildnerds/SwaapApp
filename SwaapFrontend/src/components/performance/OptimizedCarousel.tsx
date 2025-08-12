import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LazyImage from './LazyImage';

interface CarouselItem {
  id: string;
  image: any;
  title?: string;
  subtitle?: string;
}

interface OptimizedCarouselProps {
  data: CarouselItem[];
  autoRotate?: boolean;
  autoRotateInterval?: number;
  height?: number;
  onItemPress?: (item: CarouselItem, index: number) => void;
  showIndicators?: boolean;
  showOverlay?: boolean;
}

const screenWidth = Dimensions.get('window').width;

const OptimizedCarousel = memo<OptimizedCarouselProps>(({
  data,
  autoRotate = true,
  autoRotateInterval = 10000,
  height = 160,
  onItemPress,
  showIndicators = true,
  showOverlay = true,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const intervalRef = useRef<NodeJS.Timeout>();

  // Auto-rotation logic
  useEffect(() => {
    if (!autoRotate || data.length <= 1) return;

    const startAutoRotate = () => {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          const nextIndex = (prev + 1) % data.length;
          
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollTo({
              x: nextIndex * screenWidth,
              animated: true,
            });
          }
          
          return nextIndex;
        });
      }, autoRotateInterval);
    };

    startAutoRotate();
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRotate, autoRotateInterval, data.length]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    
    if (index !== currentIndex && index >= 0 && index < data.length) {
      setCurrentIndex(index);
    }
  }, [currentIndex, data.length]);

  const handleScrollBeginDrag = useCallback(() => {
    // Pause auto-rotation when user starts dragging
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  const handleScrollEndDrag = useCallback(() => {
    // Resume auto-rotation after user stops dragging
    if (!autoRotate || data.length <= 1) return;

    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => {
        const nextIndex = (prev + 1) % data.length;
        
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({
            x: nextIndex * screenWidth,
            animated: true,
          });
        }
        
        return nextIndex;
      });
    }, autoRotateInterval);
  }, [autoRotate, autoRotateInterval, data.length]);

  const scrollToIndex = useCallback((index: number) => {
    if (scrollViewRef.current && index >= 0 && index < data.length) {
      scrollViewRef.current.scrollTo({
        x: index * screenWidth,
        animated: true,
      });
      setCurrentIndex(index);
    }
  }, [data.length]);

  const handleItemPress = useCallback((item: CarouselItem, index: number) => {
    onItemPress?.(item, index);
  }, [onItemPress]);

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        decelerationRate="fast"
        snapToInterval={screenWidth}
        snapToAlignment="start"
      >
        {data.map((item, index) => (
          <TouchableOpacity 
            key={item.id} 
            style={[styles.carouselItem, { height }]}
            activeOpacity={0.9}
            onPress={() => handleItemPress(item, index)}
          >
            <LazyImage 
              source={item.image}
              style={[styles.carouselImage, { height }]}
              resizeMode="cover"
              showLoadingIndicator={true}
              showErrorIcon={false}
            />
            
            {showOverlay && (item.title || item.subtitle) && (
              <View style={styles.overlay}>
                <View style={styles.textContent}>
                  {item.title && (
                    <Text style={styles.title}>{item.title}</Text>
                  )}
                  {item.subtitle && (
                    <Text style={styles.subtitle}>{item.subtitle}</Text>
                  )}
                </View>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* Indicators */}
      {showIndicators && data.length > 1 && (
        <View style={styles.indicatorsContainer}>
          {data.map((_, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.indicator,
                index === currentIndex && styles.activeIndicator
              ]}
              onPress={() => scrollToIndex(index)}
            />
          ))}
        </View>
      )}
    </View>
  );
});

OptimizedCarousel.displayName = 'OptimizedCarousel';

const styles = StyleSheet.create({
  container: {
    width: screenWidth,
    marginBottom: 0,
  },
  carouselItem: {
    width: screenWidth,
    borderRadius: 0,
    overflow: 'hidden',
    marginHorizontal: 0,
    position: 'relative',
  },
  carouselImage: {
    width: '100%',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 4,
  },
  textContent: {
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  indicatorsContainer: {
    flexDirection: 'row',
    marginTop: 10,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: '#FFC107',
    width: 24,
  },
});

export default OptimizedCarousel;