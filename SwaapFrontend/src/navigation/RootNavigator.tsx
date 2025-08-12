// src/navigation/RootNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator, Text } from 'react-native';
import { useAuth } from '@context/AuthContext'; // ✅ Use AuthContext instead of manual checking
import { logDebug } from '@/utils/logger';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';

// Import navigationRef properly
import { navigationRef } from './RootNavigation';

export default function RootNavigator() {
  // ✅ FIXED: Use AuthContext instead of manual auth checking
  const { isAuthenticated, loading, user, authKey } = useAuth();


  const linking = {
    prefixes: ['swaap://', 'https://yourswaapapp.com'],
    config: {
      screens: {
        // Auth screens
        Login: 'login',
        Register: 'register',
        ForgotPassword: 'forgot-password',
        ResetPassword: 'reset-password/:token',
        
        // Main app screens
        MainTabs: {
          path: 'main',
          screens: {
            Home: 'home',
            SwapInbox: {
              path: 'swaps',
              screens: {
                SwapInboxScreen: 'inbox',
                SwapOfferScreen: 'offer/:productId',
                SwapDetails: 'swap/:swapId', // For viewing specific swap offers
              }
            },
            Profile: 'profile',
            MyProducts: 'my-products',
          }
        },
        
        // Direct navigation screens
        ProductDetail: 'product/:productId',
        PostItem: 'post-item',
        PaymentScreen: 'payment',
        Chat: 'chat/:conversationId',
        EditProfile: 'edit-profile',
        Wallet: 'wallet',
        
        // Swap specific deep links
        SwapOffer: 'swap/:swapId',
        SwapDetails: 'swap-details/:swapId',
      },
    },
  };

  if (loading) {
    return (
      <NavigationContainer ref={navigationRef} linking={linking}>
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center', 
          backgroundColor: '#121212' 
        }}>
          <ActivityIndicator size="large" color="#FFC107" />
          <Text style={{ color: 'white', marginTop: 10, fontSize: 16 }}>Loading...</Text>
        </View>
      </NavigationContainer>
    );
  }


  logDebug('RootNavigator render', { 
    isAuthenticated, 
    loading, 
    userId: user?._id || user?.id || 'none',
    userEmail: user?.email || 'none',
    authKey,
    timestamp: new Date().toISOString()
  });

  // Force a decision - no ambiguity
  const shouldShowAuth = !isAuthenticated;


  return (
    <NavigationContainer 
      ref={navigationRef} 
      linking={linking}
      key={isAuthenticated ? 'authenticated' : 'unauthenticated'}
    >
      {shouldShowAuth ? <AuthNavigator /> : <AppNavigator />}
    </NavigationContainer>
  );
}