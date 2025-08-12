// Create: src/hooks/useNavigationAuth.ts
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigationAuth } from '@/navigation/NavigationAuth';
import { apiClient } from '@config/index'; // ✅ Import apiClient directly

// ✅ FIXED: Updated refreshUser function to use correct endpoint
const refreshUser = async () => {
  try {
    console.log('🔍 Refreshing user data from /api/users/me...');
    const response = await apiClient.get('/api/users/me'); // ✅ CHANGED
    console.log('✅ User data refreshed successfully with verification fields:', {
      phoneVerified: response.user?.phoneVerified,
      trustScore: response.user?.trustScore,
      verificationLevel: response.user?.verificationLevel
    });
    return response.user || response;
  } catch (error: any) {
    console.error('❌ Refresh user error:', error);
    if (error.status === 401 || error.status === 404) {
      await AsyncStorage.removeItem('@auth_token');
    }
    throw new Error('Failed to fetch user');
  }
};

export const useNavigationAuth = () => {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    console.log('🔗 useNavigationAuth: Setting up subscription');
    
    const unsubscribe = navigationAuth.subscribe(() => {
      console.log('🔄 useNavigationAuth: Auth changed, forcing update');
      forceUpdate(prev => prev + 1);
    });

    // ✅ Add automatic user refresh when token exists
    const refreshUserIfNeeded = async () => {
      try {
        const token = await AsyncStorage.getItem('@auth_token');
        if (token && !navigationAuth.user) {
          console.log('🔄 useNavigationAuth: Token exists but no user, refreshing...');
          const userData = await refreshUser();
         navigationAuth.setAuth(userData, token);
        }
      } catch (error) {
        console.error('❌ Failed to refresh user on mount:', error);
        // If refresh fails, clear invalid token
        await AsyncStorage.removeItem('@auth_token');
        navigationAuth.setAuth(null, null);
      }
    };

    refreshUserIfNeeded();

    return () => {
      console.log('🔗 useNavigationAuth: Cleaning up');
      unsubscribe();
    };
  }, []);

  // 🚨 ENHANCED LOGOUT FUNCTION
  const enhancedLogout = async () => {
    try {
      console.log('🚪 useNavigationAuth: Starting enhanced logout');
      
      // Clear ALL possible storage keys
      console.log('🧹 Clearing all authentication storage...');
      await AsyncStorage.multiRemove([
        '@token', 
        'token', 
        '@auth_token',
        '@user', 
        'user', 
        '@user_data',
        '@authToken',
        '@userData',
        '@cached_user',
        '@session',
        '@login_data'
      ]);
      
      // Call the original NavigationAuth logout
      await navigationAuth.logout();
      
      console.log('✅ useNavigationAuth: Enhanced logout completed');
      
    } catch (error) {
      console.error('❌ useNavigationAuth: Logout failed:', error);
      
      // Emergency fallback - clear everything
      try {
        console.log('🚨 Emergency storage clear...');
        const allKeys = await AsyncStorage.getAllKeys();
        const authKeys = allKeys.filter(key => 
          key.includes('token') || 
          key.includes('user') || 
          key.includes('auth') ||
          key.includes('session') ||
          key.includes('login')
        );
        await AsyncStorage.multiRemove(authKeys);
        console.log('✅ Emergency clear completed');
      } catch (emergencyError) {
        console.error('❌ Emergency clear failed:', emergencyError);
        // Last resort - clear everything
        await AsyncStorage.clear();
        console.log('🧹 Nuclear clear completed');
      }
      
      // Still call original logout to notify callbacks
      await navigationAuth.logout();
      
      throw error; // Re-throw so calling code knows it failed
    }
  };

  // ✅ ENHANCED: Add manual refresh function
  const refreshUserData = async () => {
    try {
      console.log('🔄 useNavigationAuth: Manual user refresh triggered');
      const userData = await refreshUser();
      const token = await AsyncStorage.getItem('@auth_token');
      navigationAuth.setAuth(token, userData);
      return userData;
    } catch (error) {
      console.error('❌ useNavigationAuth: Manual refresh failed:', error);
      // Clear invalid token on failure
      await AsyncStorage.removeItem('@auth_token');
      navigationAuth.setAuth(null, null);
      throw error;
    }
  };

  // 🚨 RESTORED: Return actual auth state (not forced empty)
  const state = {
    user: navigationAuth.user,
    token: navigationAuth.token,
    loading: navigationAuth.loading,
    isAuthenticated: navigationAuth.isAuthenticated,
    setAuth: navigationAuth.setAuth.bind(navigationAuth),
    logout: enhancedLogout, // Use enhanced logout
    refreshUser: refreshUserData, // ✅ Add manual refresh function
  };

  console.log('📤 useNavigationAuth: Returning state:', {
    hasUser: !!state.user,
    hasToken: !!state.token,
    loading: state.loading,
    userEmail: state.user?.email || 'none',
  });

  return state;
};