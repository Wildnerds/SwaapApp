// src/api/client.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ Fix: Define API_BASE_URL directly here instead of importing from config
const API_BASE_URL = 'http://192.168.0.4:5002'; // Your IP and port

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Function to set auth token
export const setAuthToken = (token: string | null) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    console.log('✅ Auth token set in apiClient headers');
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
    console.log('❌ Auth token removed from apiClient headers');
  }
};

// Request interceptor: fallback to AsyncStorage if token not set
apiClient.interceptors.request.use(
  async (config) => {
    // Check if Authorization header is already set
    let hasAuth = !!config.headers.Authorization;
    
    // If no token is already set, try AsyncStorage as fallback
    if (!hasAuth) {
      try {
        const token = await AsyncStorage.getItem('@auth_token');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
          hasAuth = true;
          console.log('🔧 Token added from AsyncStorage');
        }
      } catch (error) {
        console.error('Failed to get token from AsyncStorage:', error);
      }
    }
    
    // Debug logging
    console.log('📤 Request details:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      hasAuth,
      authHeader: hasAuth ? 'Bearer ***' : 'None'
    });
    
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ Response received:', {
      status: response.status,
      url: response.config.url
    });
    return response;
  },
  (error) => {
    console.error('❌ Response error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      message: error.response?.data?.message || error.message
    });
    
    if (error.response?.status === 401) {
      console.warn('🔐 Unauthorized – token may be missing or expired');
      // Clear token on unauthorized
      setAuthToken(null);
    }
    
    return Promise.reject(error);
  }
);

// ✅ Export both default and named export
export { apiClient };
export default apiClient;