// Add this debug logging to your useAuth hook

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setAuth, logout as logoutAction } from '@store/redux/slices/authSlice';
import type { User } from '@types';

// Define the storage keys
const TOKEN_KEY = 'authToken';
const USER_KEY = 'authUser';

export const useAuth = () => {
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [user, setUserState] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);

  const dispatch = useDispatch();

  // Add this effect to log all state changes
  useEffect(() => {
    console.log('🔄 useAuth state changed:', {
      hasUser: !!user,
      hasToken: !!token,
      loading,
      logoutLoading,
      userEmail: user?.email || 'none'
    });
  }, [user, token, loading, logoutLoading]);

  useEffect(() => {
    const loadAuthFromStorage = async () => {
      try {
        console.log('📱 useAuth: Loading auth from storage...');
        const storedUser = await AsyncStorage.getItem(USER_KEY);
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);

        console.log('📱 Storage check:', {
          hasStoredUser: !!storedUser,
          hasStoredToken: !!storedToken
        });

        if (storedUser && storedToken) {
          const parsedUser: User = JSON.parse(storedUser);
          setUserState(parsedUser);
          setTokenState(storedToken);
          dispatch(setAuth({ user: parsedUser, token: storedToken }));
          console.log('🟢 Auth restored from AsyncStorage');
        } else {
          console.log('ℹ️ No stored user/token found');
        }
      } catch (err) {
        console.error('❌ Failed to load auth from storage', err);
      } finally {
        setLoading(false);
        console.log('✅ useAuth loading completed');
      }
    };

    loadAuthFromStorage();
  }, []);

  const logout = async () => {
    setLogoutLoading(true);
    console.log('🚪 useAuth logout starting...');
    
    try {
      // Clear AsyncStorage first
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
      console.log('🗑️ AsyncStorage cleared');
      
      // Clear local state
      setUserState(null);
      setTokenState(null);
      console.log('🔄 Local state cleared');
      
      // Clear Redux
      dispatch(logoutAction());
      console.log('🔄 Redux state cleared');
      
      // Verify storage is actually cleared
      const remainingUser = await AsyncStorage.getItem(USER_KEY);
      const remainingToken = await AsyncStorage.getItem(TOKEN_KEY);
      console.log('🔍 Post-logout storage check:', {
        remainingUser: !!remainingUser,
        remainingToken: !!remainingToken
      });
      
      console.log('🚪 Logged out and cleared auth');
    } catch (err) {
      console.error('❌ Logout error', err);
    } finally {
      setLogoutLoading(false);
    }
  };

  const setAuthState = async (user: User, token: string) => {
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      await AsyncStorage.setItem(TOKEN_KEY, token);
      setUserState(user);
      setTokenState(token);
      dispatch(setAuth({ user, token }));
      console.log('✅ Auth set and persisted');
    } catch (err) {
      console.error('❌ Failed to save auth', err);
    }
  };

  return {
    loading,
    logout,
    logoutLoading,
    user,
    token,
    setAuth: setAuthState,
    isAuthenticated: !!user && !!token,
  };
};