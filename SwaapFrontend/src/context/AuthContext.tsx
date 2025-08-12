// context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { useDispatch } from 'react-redux';
import { authAPI } from '@config/index';
import { setCurrentUser, clearAllCarts, transferAnonymousCart } from '@/store/redux/slices/cartSlice';
import { setCurrentUserFavorites } from '@/store/redux/slices/favoriteSlice';
import { logout as reduxLogout } from '@/store/redux/slices/authSlice';
import { persistor } from '@/store';

// Use the same storage keys as App.tsx for consistency
const STORAGE_KEYS = {
  USER_TOKEN: '@auth_token',
  USER_DATA: '@user_data'
};

interface User {
  _id: string;
  fullName: string;
  email: string;
  mobile?: string;
  role: string;
  trustScore?: number;
  verificationLevel?: number;
  phoneVerified?: boolean;
  emailVerified?: boolean;
  identityVerified?: boolean;
  addressVerified?: boolean;
  socialVerifications?: any[];
  walletBalance?: number;
  // Add other user fields as needed
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  register: (userData: any) => Promise<any>;
  loading: boolean;
  authKey: number;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
  refreshUser: async () => null,
  register: async () => {},
  loading: false,
  authKey: 0,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  
  // Simple computed state - handle both _id and id
  const isAuthenticated = !!(user && (user._id || user.id));
  

  const refreshUser = async (): Promise<User | null> => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.USER_TOKEN);
      if (!token) {
        setUser(null);
        throw new Error('No authentication token found');
      }
      
      const response = await authAPI.getCurrentUser();
      
      console.log('🔍 AuthContext: getCurrentUser response:', {
        hasResponse: !!response,
        responseType: typeof response,
        hasUser: !!(response && response.user),
        responseKeys: response ? Object.keys(response) : 'no response'
      });
      
      if (response && typeof response === 'object' && response.user) {
        // Store user data for App.tsx consistency
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(response.user));
        setUser(response.user); // isAuthenticated will become true automatically
        // Set current user for cart and favorites isolation
        const userId = response.user._id || response.user.id;
        dispatch(setCurrentUser(userId));
        dispatch(setCurrentUserFavorites(userId)); // ✅ FIXED - Re-enabled user-specific favorites
        return response.user;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      if (error?.response?.status === 401 || 
          error?.status === 401 || 
          error?.message?.includes('401') ||
          error?.message?.includes('Authentication expired')) {
        
        try {
          await AsyncStorage.multiRemove([STORAGE_KEYS.USER_TOKEN, STORAGE_KEYS.USER_DATA]);
        } catch (storageError) {
          // Handle storage error silently
        }
        
        setUser(null); // isAuthenticated will become false automatically
        // Clear all cart data when session expires
        dispatch(clearAllCarts());
        // Switch to anonymous favorites
        const anonymousId = await AsyncStorage.getItem('@anonymous_cart_id') || 'anonymous';
        dispatch(setCurrentUserFavorites(anonymousId)); // ✅ FIXED - Re-enabled
        
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please log in again to continue.',
          [{ text: 'OK' }]
        );
        
        throw new Error('Authentication expired');
      }
      
      if (error?.message?.includes('Network')) {
        throw new Error('Network connection failed. Please check your internet.');
      }
      
      throw new Error(error?.message || 'Failed to refresh user data');
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      console.log('🔍 AuthContext: Calling authAPI.login...');
      const response = await authAPI.login(email, password);
      console.log('🔍 AuthContext: Login response received:', {
        hasResponse: !!response,
        hasToken: !!(response && response.token),
        hasUser: !!(response && response.user),
        responseKeys: response ? Object.keys(response) : 'no response'
      });

      // Add explicit null/undefined checks
      if (!response) {
        throw new Error('No response received from login API');
      }
      
      if (typeof response !== 'object') {
        throw new Error(`Invalid response type: ${typeof response}`);
      }
      
      if (response.token) {
        // Store token first
        await AsyncStorage.setItem(STORAGE_KEYS.USER_TOKEN, response.token);
        
        // Use user data from login response if available, otherwise refresh
        let userData;
        if (response.user) {
          userData = response.user;
        } else {
          // If no user in login response, fetch it
          userData = await refreshUser();
        }
        
        if (userData && typeof userData === 'object') {
          console.log('✅ AuthContext: Login successful, setting user state:', {
            hasUserData: !!userData,
            userDataType: typeof userData,
            userId: userData._id || userData.id || 'no id found',
            email: userData.email || 'no email',
            userKeys: Object.keys(userData)
          });
          
          await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
          
          // Set user state and immediately verify
          setUser(userData);
          
          console.log('🔍 AuthContext: User state set, checking computed auth:', {
            userSet: !!userData,
            userHas_id: !!(userData && userData._id),
            userHasId: !!(userData && userData.id), 
            computedAuth: !!(userData && (userData._id || userData.id))
          });
          
          // Set current user for cart and favorites isolation
          const userId = userData._id || userData.id;
          console.log('🔍 AuthContext: Setting current user:', {
            userId,
            hasUserId: !!userId,
            userIdType: typeof userId,
            userData_id: userData._id,
            userDataId: userData.id,
            fullUserData: userData
          });
          
          try {
            console.log('🔄 AuthContext: Switching to user cart (preserving all user data)');
            dispatch(setCurrentUser(userId));
            console.log('✅ AuthContext: setCurrentUser dispatched successfully');
            
            console.log('🔄 AuthContext: Re-enabling setCurrentUserFavorites dispatch for testing');
            try {
              console.log('🔍 AuthContext: Creating favorites action with userId:', userId, typeof userId);
              const favoritesAction = setCurrentUserFavorites(userId);
              console.log('✅ AuthContext: Created favorites action:', {
                type: favoritesAction.type,
                payload: favoritesAction.payload
              });
              dispatch(favoritesAction);
              console.log('✅ AuthContext: setCurrentUserFavorites dispatched successfully');
            } catch (favError) {
              console.error('❌ AuthContext: Favorites dispatch error:', favError);
            }
          } catch (dispatchError) {
            console.error('❌ AuthContext: Error in dispatch calls:', dispatchError);
            console.error('❌ AuthContext: Dispatch error details:', {
              userId,
              hasSetCurrentUser: typeof setCurrentUser === 'function',
              hasSetCurrentUserFavorites: typeof setCurrentUserFavorites === 'function',
              errorMessage: dispatchError?.message,
              errorStack: dispatchError?.stack
            });
            // Continue without failing login
          }
          
          // Transfer any anonymous cart items to this user
          try {
            const anonymousId = await AsyncStorage.getItem('@anonymous_cart_id');
            if (anonymousId) {
              console.log('🔄 Transferring anonymous cart to logged-in user:', anonymousId, '→', userId);
              dispatch(transferAnonymousCart({ fromUserId: anonymousId, toUserId: userId }));
            }
          } catch (storageError) {
            console.error('❌ AuthContext: Error with anonymous cart transfer:', storageError);
            // Continue without failing login
          }
          
          console.log('📱 AuthContext: Login complete - should navigate now');
          
          return { success: true, user: userData, token: response.token };
        } else {
          throw new Error('Failed to get user data after login');
        }
      } else {
        const errorMessage = (response && typeof response === 'object' && response.message) ? response.message : 'Login failed';
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('❌ AuthContext: Login error caught:', error);
      
      const errorDetails = {
        hasError: !!error,
        errorType: typeof error,
        message: error && error.message ? error.message : 'Unknown error',
        name: error && error.name ? error.name : 'Unknown',
        stack: error && error.stack ? error.stack : 'No stack trace'
      };
      
      console.error('❌ AuthContext: Login error details:', errorDetails);
      
      try {
        await AsyncStorage.removeItem(STORAGE_KEYS.USER_TOKEN);
      } catch (storageError) {
        // Handle storage error silently
      }
      
      setUser(null); // This will make isAuthenticated false automatically
      dispatch(clearAllCarts());
      // Switch to anonymous favorites
      try {
        const anonymousId = await AsyncStorage.getItem('@anonymous_cart_id') || 'anonymous';
        dispatch(setCurrentUserFavorites(anonymousId)); // ✅ FIXED - Re-enabled
      } catch (favError) {
        console.error('❌ AuthContext: Error setting anonymous favorites:', favError);
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    console.log('🚪 REFINED LOGOUT - Preserving user carts but switching to anonymous');
    
    // Clear user - isAuthenticated will become false automatically
    setUser(null);
    
    // Clear storage and Redux in background
    AsyncStorage.multiRemove([
      STORAGE_KEYS.USER_TOKEN,
      STORAGE_KEYS.USER_DATA,
    ]).catch(err => console.log('Storage clear error:', err));
    
    // ✅ REFINED: Switch to anonymous cart (user cart is preserved in state)
    const anonymousId = await AsyncStorage.getItem('@anonymous_cart_id') || 'anonymous';
    console.log('🔄 Switching to anonymous cart:', anonymousId);
    dispatch(setCurrentUser(anonymousId));
    dispatch(setCurrentUserFavorites(anonymousId)); // ✅ FIXED - Re-enabled
    
    dispatch(reduxLogout());
    
    console.log('🚪 LOGOUT COMPLETE - User carts preserved, switched to anonymous');
  };

  const register = async (userData: any) => {
    try {
      setLoading(true);
      
      const response = await authAPI.register(userData);

      if (response && response.token) {
        await AsyncStorage.setItem(STORAGE_KEYS.USER_TOKEN, response.token);
        
        const freshUser = await refreshUser();
        // Set current user for cart and favorites isolation (refreshUser already does this but let's be explicit)
        if (freshUser) {
          const userId = freshUser._id || freshUser.id;
          dispatch(setCurrentUser(userId));
          dispatch(setCurrentUserFavorites(userId)); // ✅ FIXED - Re-enabled
        }
        
        return { success: true, user: freshUser, token: response.token };
      } else {
        throw new Error(response?.message || 'Registration failed');
      }
    } catch (error: any) {
      try {
        await AsyncStorage.removeItem(STORAGE_KEYS.USER_TOKEN);
      } catch (storageError) {
        // Handle storage error silently
      }
      
      setUser(null);
      // Clear all cart data on registration failure
      dispatch(clearAllCarts());
      // Switch to anonymous favorites
      const anonymousId = await AsyncStorage.getItem('@anonymous_cart_id') || 'anonymous';
      dispatch(setCurrentUserFavorites(anonymousId)); // ✅ FIXED - Re-enabled
      
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.USER_TOKEN);
      const storedUserData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      
      if (token && storedUserData) {
        try {
          const userData = JSON.parse(storedUserData);
          setUser(userData); // isAuthenticated will be true automatically
          const userId = userData._id || userData.id;
          dispatch(setCurrentUser(userId));
          dispatch(setCurrentUserFavorites(userId)); // ✅ FIXED - Re-enabled
        } catch (error) {
          setUser(null); // isAuthenticated will be false automatically
          await initializeAnonymousCart();
        }
      } else {
        // No stored user data - initialize anonymous cart
        await initializeAnonymousCart();
      }
    };

    const initializeAnonymousCart = async () => {
      // Get or create a unique device-specific anonymous ID
      let anonymousId = await AsyncStorage.getItem('@anonymous_cart_id');
      if (!anonymousId) {
        anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('@anonymous_cart_id', anonymousId);
        console.log('🆕 Created new anonymous cart ID:', anonymousId);
      } else {
        console.log('📱 Using existing anonymous cart ID:', anonymousId);
      }
      dispatch(setCurrentUser(anonymousId));
      dispatch(setCurrentUserFavorites(anonymousId)); // ✅ FIXED - Re-enabled
    };

    initializeAuth();
  }, [dispatch]);

  console.log('🔐 ULTRA SIMPLE AUTH:', { 
    isAuthenticated, 
    hasUser: !!user, 
    userId: user?._id || user?.id || 'none',
    userEmail: user?.email || 'none'
  });

  const value: AuthContextType = {
    user,
    isAuthenticated,
    login,
    logout,
    refreshUser,
    register,
    loading,
    authKey: Date.now(), // Static for now
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};