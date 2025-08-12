// 1. First, create a consistent storage keys file
// constants/storage.ts
export const STORAGE_KEYS = {
  USER_TOKEN: 'userToken', // or whatever key you're using in STORAGE_KEYS
  USER_DATA: 'userData',
  // Add other keys as needed
} as const;

// 2. Update your API client to use the correct storage key
// config/apiClient.ts

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@constants/storage'; // Import your storage keys

const BASE_URL = 'http://192.168.0.4:5002';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Fixed request interceptor using correct storage key
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // ✅ Use the same key that your AuthContext uses
      const token = await AsyncStorage.getItem(STORAGE_KEYS.USER_TOKEN);
      
      if (token) {
        // Ensure clean token format
        const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
        config.headers.Authorization = `Bearer ${cleanToken}`;
        
        console.log('🔑 Auth token added to request:', {
          endpoint: config.url,
          hasToken: true,
          tokenPreview: `${cleanToken.substring(0, 20)}...`
        });
      } else {
        console.log('⚠️ No auth token found in storage for request to:', config.url);
        delete config.headers.Authorization;
      }
      
      return config;
    } catch (error) {
      console.error('❌ Request interceptor error:', error);
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling auth errors
apiClient.interceptors.response.use(
  (response) => {
    console.log('📥 Response received:', {
      status: response.status,
      endpoint: response.config.url,
    });
    return response;
  },
  async (error) => {
    console.error('❌ API Error:', {
      status: error.response?.status,
      endpoint: error.config?.url,
      message: error.response?.data?.message,
    });
    
    if (error.response?.status === 401) {
      console.log('🔐 Token invalid - clearing auth data');
      
      try {
        await AsyncStorage.removeItem(STORAGE_KEYS.USER_TOKEN);
        await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
        delete apiClient.defaults.headers.Authorization;
      } catch (clearError) {
        console.error('Failed to clear auth data:', clearError);
      }
    }
    
    return Promise.reject(error);
  }
);

// 3. Add function to initialize auth when app starts
export const initializeAuth = async (): Promise<boolean> => {
  try {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.USER_TOKEN);
    
    if (token) {
      const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
      apiClient.defaults.headers.Authorization = `Bearer ${cleanToken}`;
      
      console.log('✅ Authentication initialized with token:', `${cleanToken.substring(0, 20)}...`);
      return true;
    } else {
      console.log('⚠️ No stored token found');
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to initialize authentication:', error);
    return false;
  }
};

export default apiClient;

// 4. Update your AuthContext login function to also set the API client header
const login = async (email: string, password: string) => {
  try {
    setLoading(true);
    console.log('🔐 AuthContext: Starting login for:', email);
    
    const response = await authAPI.login(email, password);

    if (response && response.token) {
      console.log('✅ AuthContext: Login successful, storing token...');
      
      // Store token
      await AsyncStorage.setItem(STORAGE_KEYS.USER_TOKEN, response.token);
      
      // ✅ IMPORTANT: Set the API client header immediately after login
      const cleanToken = response.token.startsWith('Bearer ') ? response.token.slice(7) : response.token;
      apiClient.defaults.headers.Authorization = `Bearer ${cleanToken}`;
      console.log('🔧 AuthContext: API client header set after login');
      
      // Get fresh user data
      console.log('🔄 AuthContext: Fetching fresh user data after login...');
      const freshUser = await refreshUser();
      
      if (freshUser) {
        console.log('✅ AuthContext: Login complete with fresh user data');
        return { success: true, user: freshUser, token: response.token };
      } else {
        throw new Error('Failed to fetch user data after login');
      }
    } else {
      throw new Error(response?.message || 'Login failed');
    }
  } catch (error: any) {
    console.error('❌ AuthContext: Login error:', error);
    
    // Clear any stored data on login failure
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_TOKEN);
      delete apiClient.defaults.headers.Authorization;
    } catch (storageError) {
      console.error('Error clearing token on login failure:', storageError);
    }
    
    setUser(null);
    setIsAuthenticated(false);
    
    throw error;
  } finally {
    setLoading(false);
  }
};

// 5. Update your App.tsx or main component to initialize auth on startup
// App.tsx
import { initializeAuth } from '@config/apiClient';

const App = () => {
  useEffect(() => {
    const setupAuth = async () => {
      console.log('🚀 App: Initializing authentication...');
      const authInitialized = await initializeAuth();
      console.log('🔐 App: Auth initialized:', authInitialized);
    };
    
    setupAuth();
  }, []);

  // ... rest of your App component
};

// 6. Quick debug function to check token storage
const debugTokenStorage = async () => {
  try {
    console.log('🔍 Debugging token storage...');
    
    // Check all possible token storage keys
    const keys = ['token', 'userToken', 'auth_token', 'authToken'];
    
    for (const key of keys) {
      const value = await AsyncStorage.getItem(key);
      console.log(`📦 Storage[${key}]:`, value ? `${value.substring(0, 30)}...` : 'null');
    }
    
    // Check what your STORAGE_KEYS actually contains
    console.log('🔑 STORAGE_KEYS.USER_TOKEN:', STORAGE_KEYS.USER_TOKEN);
    
    // Check API client headers
    console.log('🌐 API Client Auth Header:', apiClient.defaults.headers.Authorization ? 'Set' : 'Missing');
    
  } catch (error) {
    console.error('❌ Debug token storage error:', error);
  }
};

// Call this in your PaymentScreen to debug
// debugTokenStorage();