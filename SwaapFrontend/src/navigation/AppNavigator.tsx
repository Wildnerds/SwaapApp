// src/navigation/AppNavigator.tsx - FIXED VERSION
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';

// Import core dependencies first
import MainTabs from './MainTabs';

// Import screens that exist
import SwapInboxScreen from '../screens/SwapInboxScreen';
import SwapOfferScreen from '../screens/SwapOfferScreen';  
import MySwapsScreen from '../screens/MySwapsScreen';
import PostItemScreen from '../screens/PostItemScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import ProductDetailsScreen from '../screens/ProductDetailsScreen';
import ChatScreen from '../screens/ChatScreen';
import BuyScreen from '../screens/BuyScreen';
import WalletScreen from '../screens/WalletScreen';
import PaymentScreen from '../screens/PaymentScreen';
import NotificationScreen from '../screens/NotificationScreen';
import BasicVerificationScreen from '../screens/BasicVerificationScreen';
import IdentityVerificationScreen from '../screens/IdentityVerificationScreen';
import SocialVerificationScreen from '../screens/SocialVerificationScreen';
import BillingHistoryScreen from '../screens/BillingHistoryScreen';
import FavoriteScreen from '../screens/FavoriteScreen';
import NearbyUsersScreen from '../screens/NearbyUsersScreen';
import TransactionHistoryScreen from '../screens/TransactionHistoryScreen';
import UpgradeToProScreen from '../screens/UpgradeToProScreen';
import OrdersScreen from '../screens/OrdersScreen';
// import SwapScreen from '../screens/SwapScreen';
import OrderReceiptScreen from '../screens/OrderReceiptScreen';
import ProSuccessScreen from '../screens/ProSuccessScreen';
import PostSuccessScreen from '../screens/PostSuccessScreen';
import SuccessConfirmationScreen from '../screens/SuccessConfirmationScreen';
import OrderListScreen from '../screens/OrderListScreen';
import OrderTrackingScreen from '../screens/OrderTrackingScreen';
import PaymentSuccessScreen from '../screens/PaymentSuccessScreen';
import PaystackWebview from '../screens/PaystackWebview';
import SetWalletPinScreen from '../screens/SetWalletPinScreen';
import SupportChatScreen from '../screens/SupportChatScreen';
import ProductReviewsScreen from '../screens/ProductReviewsScreen';
import UserReviewsScreen from '../screens/UserReviewsScreen';
import SellerReviewsScreen from '../screens/SellerReviewsScreen';
import ChatListScreen from '../screens/ChatListScreen';
import EditProductScreen from '../screens/product/EditProductScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  // Production-safe logging - removed console.log
  
  return (
    <Stack.Navigator 
      initialRouteName="MainTabs"
      screenOptions={{ headerShown: false }}
    >
      {/* Main Tabs - Core */}
      <Stack.Screen name="MainTabs" component={MainTabs} />
      
      {/* Product Screens */}
      <Stack.Screen 
        name="ProductDetail" 
        component={ProductDetailsScreen}
        options={{ 
          presentation: 'modal',
          gestureEnabled: true 
        }}
      />
      <Stack.Screen 
        name="PostItem" 
        component={PostItemScreen}
        options={{ 
          presentation: 'modal',
          gestureEnabled: true 
        }}
      />
      
      {/* Profile & Verification */}
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="BasicVerification" component={BasicVerificationScreen} />
      <Stack.Screen name="IdentityVerification" component={IdentityVerificationScreen} />
      <Stack.Screen name="SocialVerification" component={SocialVerificationScreen} />
      
      {/* Swap System */}
      <Stack.Screen name="SwapOffer" component={SwapOfferScreen} />
      <Stack.Screen name="SwapInbox" component={SwapInboxScreen} />
      
      {/* Financial */}
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="PaymentScreen" component={PaymentScreen} />
      
      {/* Communication */}
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="ChatScreen" component={ChatScreen} />
      
      {/* Commerce */}
      <Stack.Screen name="Buy" component={BuyScreen} />
      
      {/* Notifications */}
      <Stack.Screen 
        name="Notifications" 
        component={NotificationScreen}
        options={{ 
          presentation: 'modal',
          gestureEnabled: true 
        }}
      />
      
      {/* Additional Screens */}
      <Stack.Screen name="BillingHistoryScreen" component={BillingHistoryScreen} />
      <Stack.Screen name="FavoriteScreen" component={FavoriteScreen} />
      <Stack.Screen name="NearbyUsers" component={NearbyUsersScreen} />
      <Stack.Screen name="TransactionHistoryScreen" component={TransactionHistoryScreen} />
      <Stack.Screen name="UpgradeToProScreen" component={UpgradeToProScreen} />
      <Stack.Screen name="Orders" component={OrdersScreen} />
      <Stack.Screen name="MySwaps" component={MySwapsScreen} />
      {/* <Stack.Screen name="SwapScreen" component={SwapScreen} /> */}
      <Stack.Screen name="OrderReceipt" component={OrderReceiptScreen} />
      <Stack.Screen name="ProSuccess" component={ProSuccessScreen} />
      <Stack.Screen name="PostSuccess" component={PostSuccessScreen} />
      <Stack.Screen name="SuccessConfirmationScreen" component={SuccessConfirmationScreen} />
      <Stack.Screen name="OrderListScreen" component={OrderListScreen} />
      <Stack.Screen name="OrderTrackingScreen" component={OrderTrackingScreen} />
      <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} />
      <Stack.Screen name="PaystackWebview" component={PaystackWebview} />
      <Stack.Screen name="SetWalletPinScreen" component={SetWalletPinScreen} />
      <Stack.Screen name="SupportChat" component={SupportChatScreen} />
      <Stack.Screen 
        name="ProductReviews" 
        component={ProductReviewsScreen}
        options={{ headerShown: true }}
      />
      <Stack.Screen 
        name="UserReviews" 
        component={UserReviewsScreen}
        options={{ headerShown: true }}
      />
      <Stack.Screen 
        name="SellerReviews" 
        component={SellerReviewsScreen}
        options={{ headerShown: true }}
      />
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      <Stack.Screen 
        name="EditProduct" 
        component={EditProductScreen}
        options={{ 
          headerShown: true,
          title: 'Edit Product'
        }}
      />
    </Stack.Navigator>
  );
}