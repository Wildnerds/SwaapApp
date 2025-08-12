// src/navigation/navigationHelpers.ts
import { NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/types';

export type NavigationHelpers = NavigationProp<RootStackParamList>;

// Navigation helper functions you can use throughout your app
export const navigationHelpers = {
  // ==================== PRODUCT NAVIGATION ====================
  goToProductDetail: (navigation: NavigationHelpers, productId: string) => {
    console.log('🔗 Navigating to ProductDetail:', productId);
    navigation.navigate('ProductDetail', { productId });
  },
  
  goToEditProduct: (navigation: NavigationHelpers, productId: string) => {
    console.log('🔗 Navigating to EditProduct:', productId);
    navigation.navigate('EditProduct', { productId });
  },
  
  goToBuy: (navigation: NavigationHelpers, product: any) => {
    console.log('🔗 Navigating to Buy:', product.title);
    navigation.navigate('Buy', { product });
  },
  
  goToPostItem: (navigation: NavigationHelpers) => {
    console.log('🔗 Navigating to PostItem');
    navigation.navigate('PostItem');
  },
  
  goToFavorites: (navigation: NavigationHelpers) => {
    console.log('🔗 Navigating to Favorites');
    navigation.navigate('FavoriteScreen');
  },
  
  // ==================== PROFILE NAVIGATION ====================
  goToEditProfile: (navigation: NavigationHelpers) => {
    console.log('🔗 Navigating to EditProfile');
    navigation.navigate('EditProfile');
  },
  
  goToBasicVerification: (navigation: NavigationHelpers) => {
    console.log('🔗 Navigating to BasicVerification');
    navigation.navigate('BasicVerification');
  },
  
  goToIdentityVerification: (navigation: NavigationHelpers) => {
    console.log('🔗 Navigating to IdentityVerification');
    navigation.navigate('IdentityVerification');
  },
  
  goToSocialVerification: (navigation: NavigationHelpers) => {
    console.log('🔗 Navigating to SocialVerification');
    navigation.navigate('SocialVerification');
  },
  
  // ==================== FINANCIAL NAVIGATION ====================
  goToWallet: (navigation: NavigationHelpers) => {
    console.log('🔗 Navigating to Wallet');
    navigation.navigate('Wallet');
  },
  
  goToBillingHistory: (navigation: NavigationHelpers) => {
    console.log('🔗 Navigating to BillingHistory');
    navigation.navigate('BillingHistory');
  },
  
  goToTransactionHistory: (navigation: NavigationHelpers) => {
    console.log('🔗 Navigating to TransactionHistory');
    navigation.navigate('TransactionHistoryScreen');
  },
  
  goToPayment: (navigation: NavigationHelpers, params: any) => {
    console.log('🔗 Navigating to Payment with params:', params);
    navigation.navigate('PaymentScreen', params);
  },
  
  goToPaymentSuccess: (navigation: NavigationHelpers, params: any) => {
    console.log('🔗 Navigating to PaymentSuccess');
    navigation.navigate('PaymentSuccess', params);
  },
  
  goToUpgradeToPro: (navigation: NavigationHelpers) => {
    console.log('🔗 Navigating to UpgradeToPro');
    navigation.navigate('UpgradeToProScreen');
  },
  
  // ==================== SOCIAL NAVIGATION ====================
  goToChat: (navigation: NavigationHelpers, conversationId: string) => {
    console.log('🔗 Navigating to Chat:', conversationId);
    navigation.navigate('Chat', { conversationId });
  },
  
  goToNearbyUsers: (navigation: NavigationHelpers) => {
    console.log('🔗 Navigating to NearbyUsers');
    navigation.navigate('NearbyUsers');
  },
  
  goToSupportChat: (navigation: NavigationHelpers) => {
    console.log('🔗 Navigating to SupportChat');
    navigation.navigate('SupportChat');
  },
  
  // ==================== ORDERS & SWAPS ====================
  goToOrders: (navigation: NavigationHelpers) => {
    console.log('🔗 Navigating to Orders');
    navigation.navigate('Orders');
  },
  
  goToOrderReceipt: (navigation: NavigationHelpers, order: any) => {
    console.log('🔗 Navigating to OrderReceipt');
    navigation.navigate('OrderReceipt', { order });
  },
  
  goToSwapOffer: (navigation: NavigationHelpers, params: any) => {
    console.log('🔗 Navigating to SwapOffer');
    navigation.navigate('SwapOffer', params);
  },
  
  goToSwapInbox: (navigation: NavigationHelpers) => {
    console.log('🔗 Navigating to SwapInbox');
    navigation.navigate('SwapInbox');
  },
  
  // ==================== NOTIFICATIONS ====================
  goToNotifications: (navigation: NavigationHelpers) => {
    console.log('🔗 Navigating to Notifications');
    navigation.navigate('Notifications');
  },
  
  // ==================== SUCCESS SCREENS ====================
  goToSuccessConfirmation: (navigation: NavigationHelpers, params: any) => {
    console.log('🔗 Navigating to SuccessConfirmation');
    navigation.navigate('SuccessConfirmationScreen', params);
  },
  
  goToProSuccess: (navigation: NavigationHelpers) => {
    console.log('🔗 Navigating to ProSuccess');
    navigation.navigate('ProSuccess');
  },
  
  // ==================== TAB NAVIGATION ====================
  goToHome: (navigation: NavigationHelpers) => {
    console.log('🔗 Navigating to Home tab');
    navigation.navigate('MainTabs', { screen: 'Home' } as any);
  },
  
  goToProfile: (navigation: NavigationHelpers) => {
    console.log('🔗 Navigating to Profile tab');
    navigation.navigate('MainTabs', { screen: 'Profile' } as any);
  },
  
  goToCart: (navigation: NavigationHelpers) => {
    console.log('🔗 Navigating to Cart tab');
    navigation.navigate('MainTabs', { screen: 'Cart' } as any);
  },
  
  goToMyProducts: (navigation: NavigationHelpers) => {
    console.log('🔗 Navigating to MyProducts tab');
    navigation.navigate('MainTabs', { screen: 'MyProducts' } as any);
  },
  
  // ==================== UTILITY NAVIGATION ====================
  goBack: (navigation: NavigationHelpers) => {
    console.log('🔗 Going back');
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // Fallback to home if can't go back
      navigationHelpers.goToHome(navigation);
    }
  },
  
  resetToHome: (navigation: NavigationHelpers) => {
    console.log('🔗 Resetting to Home');
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  },
  
  resetToLogin: (navigation: NavigationHelpers) => {
    console.log('🔗 Resetting to Login');
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  },
};

// ==================== USAGE EXAMPLES ====================
/*
// How to use in your screens:

import { useNavigation } from '@react-navigation/native';
import { navigationHelpers, NavigationHelpers } from '@/navigation/navigationHelpers';

export default function YourScreen() {
  const navigation = useNavigation<NavigationHelpers>();
  
  // Example usage:
  const handleProductPress = (productId: string) => {
    navigationHelpers.goToProductDetail(navigation, productId);
  };
  
  const handleEditProfile = () => {
    navigationHelpers.goToEditProfile(navigation);
  };
  
  const handleGoToWallet = () => {
    navigationHelpers.goToWallet(navigation);
  };
  
  const handleStartChat = (conversationId: string) => {
    navigationHelpers.goToChat(navigation, conversationId);
  };
  
  return (
    // Your screen JSX
  );
}
*/