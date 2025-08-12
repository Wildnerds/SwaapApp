import React, { memo, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StyleSheet,
  Image,
} from 'react-native';

interface CarouselItem {
  id: string;
  image: any;
  title?: string;
  subtitle?: string;
}

interface FullWidthCarouselProps {
  data: CarouselItem[];
  height?: number;
  autoRotate?: boolean;
  autoRotateInterval?: number;
  onItemPress?: (item: CarouselItem, index: number) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_WIDTH = SCREEN_WIDTH - 32; // Account for padding

const FullWidthCarousel = memo<FullWidthCarouselProps>(({
  data,
  height = 160,
  autoRotate = true,
  autoRotateInterval = 10000,
  onItemPress,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-rotation
  useEffect(() => {
    if (!autoRotate || data.length <= 1) return;

    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => {
        const nextIndex = (prev + 1) % data.length;
        
        scrollViewRef.current?.scrollTo({
          x: nextIndex * CAROUSEL_WIDTH,
          animated: true,
        });
        
        return nextIndex;
      });
    }, autoRotateInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRotate, autoRotateInterval, data.length]);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / CAROUSEL_WIDTH);
    
    if (index !== currentIndex && index >= 0 && index < data.length) {
      setCurrentIndex(index);
    }
  };

  const handleScrollBeginDrag = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleScrollEndDrag = () => {
    if (!autoRotate || data.length <= 1) return;

    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => {
        const nextIndex = (prev + 1) % data.length;
        
        scrollViewRef.current?.scrollTo({
          x: nextIndex * CAROUSEL_WIDTH,
          animated: true,
        });
        
        return nextIndex;
      });
    }, autoRotateInterval);
  };

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
        snapToInterval={CAROUSEL_WIDTH}
        snapToAlignment="start"
        style={styles.scrollView}
      >
        {data.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.slide, { height }]}
            activeOpacity={0.9}
            onPress={() => onItemPress?.(item, index)}
          >
            <Image
              source={item.image}
              style={[styles.image, { height }]}
              resizeMode="cover"
            />
            
            {(item.title || item.subtitle) && (
              <View style={styles.overlay}>
                {item.title && (
                  <Text style={styles.title}>{item.title}</Text>
                )}
                {item.subtitle && (
                  <Text style={styles.subtitle}>{item.subtitle}</Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Indicators */}
      {data.length > 1 && (
        <View style={styles.indicators}>
          {data.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                index === currentIndex && styles.activeIndicator
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16, // Same padding as flash banner
    marginBottom: 16,
  },
  scrollView: {
    borderRadius: 12, // Same as flash banner
    overflow: 'hidden',
  },
  slide: {
    width: CAROUSEL_WIDTH,
    position: 'relative',
  },
  image: {
    width: CAROUSEL_WIDTH,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
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

FullWidthCarousel.displayName = 'FullWidthCarousel';

export default FullWidthCarousel;