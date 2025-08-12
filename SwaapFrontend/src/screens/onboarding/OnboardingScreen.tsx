import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import COLORS from '@constants/colors';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const onboardingData = [
  {
    id: 1,
    title: 'Welcome to Swaap',
    subtitle: 'Buy, Sell & Trade with Ease',
    description: 'Discover amazing products from trusted sellers in your community. Buy what you need, sell what you don\'t, or trade for something better.',
    image: require('../../assets/images/logo1.png'),
    backgroundColor: '#1a1a1a',
    accentColor: COLORS.gold,
  },
  {
    id: 2,
    title: 'Smart Swapping',
    subtitle: 'Trade Instead of Buying',
    description: 'Don\'t just sell your old items - trade them for something you actually want! Our smart matching system finds the perfect trades for you.',
    image: require('../../assets/images/phone.jpg'),
    backgroundColor: '#1e2a47',
    accentColor: '#4CAF50',
  },
  {
    id: 3,
    title: 'Trusted Community',
    subtitle: 'Verified Sellers & Reviews',
    description: 'Shop with confidence using our trust score system, verified profiles, and honest reviews from real community members.',
    image: require('../../assets/images/checkmark.png'),
    backgroundColor: '#2d1b3d',
    accentColor: '#9C27B0',
  },
  {
    id: 4,
    title: 'Secure & Fast',
    subtitle: 'Safe Payments & Quick Delivery',
    description: 'Enjoy secure payment processing, buyer protection, and fast local delivery. Your satisfaction is our priority.',
    image: require('../../assets/images/laptop.jpg'),
    backgroundColor: '#1a2f1a',
    accentColor: '#2196F3',
  },
];

export default function OnboardingScreen() {
  const navigation = useNavigation();
  const [currentPage, setCurrentPage] = useState(0);

  const goToNextPage = () => {
    if (currentPage < onboardingData.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      completeOnboarding();
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('@onboarding_completed', 'true');
      navigation.navigate('Login');
    } catch (error) {
      console.error('Failed to save onboarding completion:', error);
      navigation.navigate('Login');
    }
  };

  const skipOnboarding = () => {
    completeOnboarding();
  };

  const currentData = onboardingData[currentPage];

  return (
    <View style={[styles.container, { backgroundColor: currentData.backgroundColor }]}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={currentData.backgroundColor}
          translucent={false}
        />
        
        {/* Skip Button */}
        {currentPage < onboardingData.length - 1 && (
          <View style={styles.header}>
            <TouchableOpacity onPress={skipOnboarding} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Content */}
        <View style={styles.contentContainer}>
          <View style={styles.imageContainer}>
            <Image source={currentData.image} style={styles.onboardingImage} resizeMode="contain" />
          </View>

          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: currentData.accentColor }]}>{currentData.title}</Text>
            <Text style={styles.subtitle}>{currentData.subtitle}</Text>
            <Text style={styles.description}>{currentData.description}</Text>
          </View>
        </View>

        {/* Navigation */}
        <View style={styles.navigationContainer}>
          {/* Page Indicators */}
          <View style={styles.indicatorContainer}>
            {onboardingData.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.indicator,
                  {
                    backgroundColor: i === currentPage ? currentData.accentColor : 'rgba(255,255,255,0.3)',
                    width: i === currentPage ? 24 : 8,
                  },
                ]}
              />
            ))}
          </View>

          {/* Navigation Buttons */}
          <View style={styles.buttonContainer}>
            {currentPage > 0 && (
              <TouchableOpacity onPress={goToPrevPage} style={styles.prevButton}>
                <Ionicons name="chevron-back" size={24} color="#fff" />
                <Text style={styles.prevButtonText}>Back</Text>
              </TouchableOpacity>
            )}

            <View style={{ flex: 1 }} />

            <TouchableOpacity
              onPress={goToNextPage}
              style={[styles.nextButton, { backgroundColor: currentData.accentColor }]}
            >
              <Text style={styles.nextButtonText}>
                {currentPage === onboardingData.length - 1 ? 'Get Started' : 'Next'}
              </Text>
              <Ionicons 
                name={currentPage === onboardingData.length - 1 ? "arrow-forward" : "chevron-forward"} 
                size={20} 
                color="#000" 
              />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  skipText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  imageContainer: {
    flex: 0.6,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  onboardingImage: {
    width: screenWidth * 0.8,
    height: screenHeight * 0.35,
    maxHeight: 300,
  },
  textContainer: {
    flex: 0.4,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  navigationContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
    gap: 8,
  },
  indicator: {
    height: 8,
    borderRadius: 4,
    transition: 'all 0.3s ease',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prevButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    gap: 4,
  },
  prevButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
    gap: 8,
    minWidth: 120,
    justifyContent: 'center',
  },
  nextButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});