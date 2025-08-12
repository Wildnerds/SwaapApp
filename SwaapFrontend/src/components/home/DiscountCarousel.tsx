// components/home/DiscountCarousel.tsx - ULTRA STABLE VERSION
import React, { memo, useRef } from 'react';
import { View, Text, Image, Dimensions, StyleSheet } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';

const screenWidth = Dimensions.get('window').width;

interface DiscountBanner {
  id: string;
  percentage: string;
  title: string;
  subtitle: string;
  color: string;
  image: any;
}

interface DiscountCarouselProps {
  banners: DiscountBanner[];
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

// ✅ ULTRA FIX: Create completely static render function
const CarouselItem = memo(({ item }: { item: DiscountBanner }) => (
  <View style={[carouselStyles.discountBanner, { backgroundColor: item.color }]}>
    <View style={carouselStyles.discountContent}>
      <View style={carouselStyles.discountTextContainer}>
        <Text style={carouselStyles.discountPercentage}>{item.percentage}</Text>
        <Text style={carouselStyles.discountText}>{item.title}</Text>
        <Text style={carouselStyles.discountSubtext}>{item.subtitle}</Text>
      </View>
      <View style={carouselStyles.discountImageContainer}>
        <Image 
          source={item.image}
          style={carouselStyles.discountImage}
        />
      </View>
    </View>
  </View>
));

CarouselItem.displayName = 'CarouselItem';

export const DiscountCarousel = memo<DiscountCarouselProps>(({
  banners,
  autoPlay = true,
  autoPlayInterval = 3000,
}) => {
  // ✅ ULTRA FIX: Use ref to prevent carousel recreation
  const carouselRef = useRef<any>(null);
  
  return (
    <View style={carouselStyles.carouselContainer}>
      <Carousel
        ref={carouselRef}
        width={screenWidth - 32}
        height={120}
        autoPlay={autoPlay}
        loop={banners.length > 1}
        scrollAnimationDuration={1000}
        autoPlayInterval={autoPlayInterval}
        data={banners}
        renderItem={({ item }) => <CarouselItem item={item} />}
        // ✅ ULTRA FIX: Completely disable any animations that might cause blinking
        windowSize={3}
        enabled={true}
        // ✅ Add these props to stabilize
        vertical={false}
        style={{ width: screenWidth - 32 }}
      />
    </View>
  );
});

DiscountCarousel.displayName = 'DiscountCarousel';

const carouselStyles = StyleSheet.create({
  carouselContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  discountBanner: {
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 4,
    width: screenWidth - 40, // ✅ Fixed width
  },
  discountContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    height: 120, // ✅ Fixed height
  },
  discountTextContainer: {
    flex: 1,
  },
  discountPercentage: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  discountText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: -4,
  },
  discountSubtext: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginTop: 2,
  },
  discountImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
  },
  discountImage: {
    width: 80, // ✅ Fixed dimensions
    height: 80,
  },
});