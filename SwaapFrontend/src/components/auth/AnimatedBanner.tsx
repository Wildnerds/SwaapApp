// // components/auth/AnimatedBanner.tsx
// import React, { useEffect } from 'react';
// import { Image, StyleSheet } from 'react-native';
// import Animated, {
//   useSharedValue,
//   useAnimatedStyle,
//   withTiming,
// } from 'react-native-reanimated';
// import COLORS from '@constants/colors';

// interface AnimatedBannerProps {
//   logoSource: any;
//   logoWidth?: number;
//   logoHeight?: number;
// }

// export const AnimatedBanner: React.FC<AnimatedBannerProps> = ({
//   logoSource,
//   logoWidth = 120,
//   logoHeight = 120,
// }) => {
//   const opacity = useSharedValue(0);
//   const translateY = useSharedValue(30);

//   useEffect(() => {
//     opacity.value = withTiming(1, { duration: 500 });
//     translateY.value = withTiming(0, { duration: 500 });
//   }, []);

//   const animatedStyle = useAnimatedStyle(() => ({
//     opacity: opacity.value,
//     transform: [{ translateY: translateY.value }],
//   }));

//   return (
//     <Animated.View style={[styles.bannerContainer, animatedStyle]}>
//       <Image 
//         source={logoSource} 
//         style={{ width: logoWidth, height: logoHeight }} 
//         resizeMode="contain" 
//       />
//     </Animated.View>
//   );
// };

// const styles = StyleSheet.create({
//   bannerContainer: {
//     height: 180,
//     width: '100%',
//     backgroundColor: '#FFD700',
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderRadius: 20,
//     marginBottom: 20,
//     shadowColor: '#FFD700',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 8,
//     elevation: 8,
//   },
// });

// components/auth/AnimatedBanner.tsx
import COLORS from '@/constants/colors';
import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

interface AnimatedBannerProps {
  logoSource: any;
  logoWidth?: number;
  logoHeight?: number;
}

export const AnimatedBanner: React.FC<AnimatedBannerProps> = ({
  logoSource,
  logoWidth = 120,
  logoHeight = 120,
}) => {
  return (
    <View style={styles.bannerContainer}>
      <Image 
        source={logoSource} 
        style={{ width: logoWidth, height: logoHeight }} 
        resizeMode="contain" 
      />
    </View>
  );
};

const styles = StyleSheet.create({
 bannerContainer: {
    height: 180,
    width: '100%',
    backgroundColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    marginBottom: 30,
    shadowColor: COLORS.gold,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});