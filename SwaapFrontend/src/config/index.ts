// src/config/index.ts - BACKWARD-COMPATIBLE UPDATE
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logDebug, logInfo, logError } from '../utils/logger';

logDebug('Config file loading started');

// Environment
const DEV_PORT = '5002';
const PROD_URL = 'https://your-production-api.com';
const FORCE_LOCALHOST = false; // Allow IP detection for mobile access
const FALLBACK_IP = '192.168.0.4'; // Use your computer's IP instead of localhost

// ✅ Dynamic IP detection function
const getServerInfo = async (): Promise<{ baseURL: string; serverIP: string }> => {
  try {
    // Try multiple potential server IPs common in home networks
    const potentialIPs = [
      FALLBACK_IP,
      '192.168.1.1', '192.168.0.1', '192.168.1.2', '192.168.0.2', 
      '192.168.1.3', '192.168.0.3', '192.168.1.4', '192.168.0.4',
      '192.168.1.5', '192.168.0.5', '192.168.1.10', '192.168.0.10'
    ];
    
    for (const ip of potentialIPs) {
      try {
        // Create an AbortController for timeout handling (React Native compatible)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        
        const response = await fetch(`http://${ip}:${DEV_PORT}/api/config/server-info`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          logInfo('Successfully connected to server', { ip, port: DEV_PORT });
          return { baseURL: data.baseURL, serverIP: data.serverIP };
        }
      } catch (error) {
        logDebug('Failed to connect to server', { ip, port: DEV_PORT, error: error.name });
        continue;
      }
    }
    
    // If all IPs fail, use fallback
    logInfo('Using fallback IP', { ip: FALLBACK_IP, port: DEV_PORT });
    return { 
      baseURL: `http://${FALLBACK_IP}:${DEV_PORT}`, 
      serverIP: FALLBACK_IP 
    };
  } catch (error) {
    logError('Dynamic IP detection failed', error);
    return { 
      baseURL: `http://${FALLBACK_IP}:${DEV_PORT}`, 
      serverIP: FALLBACK_IP 
    };
  }
};

// ✅ Global variables to cache the server info
let cachedServerInfo: { baseURL: string; serverIP: string } | null = null;
let serverInfoPromise: Promise<{ baseURL: string; serverIP: string }> | null = null;

const getBaseUrl = async (): Promise<string> => {
  if (!__DEV__) return PROD_URL;
  
  // Force localhost if enabled
  if (FORCE_LOCALHOST) {
    const localhostURL = `http://localhost:${DEV_PORT}`;
    logInfo('Forcing localhost usage', { url: localhostURL });
    return localhostURL;
  }
  
  if (cachedServerInfo) {
    return cachedServerInfo.baseURL;
  }
  
  if (!serverInfoPromise) {
    serverInfoPromise = getServerInfo();
  }
  
  const serverInfo = await serverInfoPromise;
  cachedServerInfo = serverInfo;
  
  return serverInfo.baseURL;
};

// ✅ Initialize base URL as a promise
export const API_BASE_URL_PROMISE = getBaseUrl();
export const SOCKET_URL_PROMISE = getBaseUrl();

// ✅ Synchronous export for backward compatibility (will be updated dynamically)
export let API_BASE_URL = `http://${FALLBACK_IP}:${DEV_PORT}`;
export let SOCKET_URL = `http://${FALLBACK_IP}:${DEV_PORT}`;

// ✅ Function to update static API object with dynamic URLs
const updateStaticAPIObject = (baseURL: string) => {
  API.base = baseURL;
  
  API.auth.register = `${baseURL}/api/auth/register`;
  API.auth.login = `${baseURL}/api/auth/login`;
  API.auth.me = `${baseURL}/api/auth/me`;
  API.auth.refresh = `${baseURL}/api/auth/refresh`;
  API.auth.logout = `${baseURL}/api/auth/logout`;
  API.auth.forgotPassword = `${baseURL}/api/auth/forgot-password`;
  
  API.profile.get = (userId: string) => `${baseURL}/api/profiles/${userId}`;
  
  API.products.getAll = `${baseURL}/api/products`;
  API.products.search = (query: string) => `${baseURL}/api/products/search?q=${encodeURIComponent(query)}`;
  API.products.myProducts = `${baseURL}/api/products/my`;
  API.products.getById = (id: string) => `${baseURL}/api/products/${id}`;
  API.products.create = `${baseURL}/api/products`;
  API.products.update = (id: string) => `${baseURL}/api/products/${id}`;
  API.products.delete = (id: string) => `${baseURL}/api/products/${id}`;
  
  API.wallet.fund = `${baseURL}/api/wallet/fund`;
  API.wallet.balance = `${baseURL}/api/wallet/balance`;
  API.wallet.topup = `${baseURL}/api/wallet/topup`;
  API.wallet.history = `${baseURL}/api/wallet/history`;
  
  API.messages.list = (conversationId: string) => `${baseURL}/api/messages/${conversationId}`;
  API.messages.send = `${baseURL}/api/messages`;
  
  API.conversations.all = `${baseURL}/api/conversations`;
  API.conversations.get = (userId: string) => `${baseURL}/api/conversations/${userId}`;
  API.conversations.create = `${baseURL}/api/conversations`;
  
  API.shipping.rates = `${baseURL}/api/shipping/rates`;
  API.shipping.addresses = `${baseURL}/api/shipping/addresses`;
  API.shipping.locations = `${baseURL}/api/shipping/locations`;
  
  API.payment.cartPay = `${baseURL}/api/pay/cart-pay`;
  API.payment.walletPay = `${baseURL}/api/pay/wallet/cart-pay`;
  API.payment.hybridPay = `${baseURL}/api/pay/wallet/cart-pay-partial`;
  
  API.support.base = `${baseURL}/api/support`;
  API.support.conversations = `${baseURL}/api/support/conversations`;
  API.support.messages = (conversationId: string) => `${baseURL}/api/support/conversations/${conversationId}/messages`;
  API.support.escalate = (conversationId: string) => `${baseURL}/api/support/conversations/${conversationId}/escalate`;
  
  // 🤖 AI Agent API endpoints
  API.ai.base = `${baseURL}/api/ai`;
  API.ai.chat = `${baseURL}/api/ai/chat`;
  API.ai.matches = (productId: string, limit?: number) => `${baseURL}/api/ai/matches?productId=${productId}&limit=${limit || 5}`;
  API.ai.value = (productId: string) => `${baseURL}/api/ai/value/${productId}`;
  API.ai.recommendations = (limit?: number) => `${baseURL}/api/ai/recommendations?limit=${limit || 10}`;
  API.ai.negotiation = (swapId: string) => `${baseURL}/api/ai/negotiation/${swapId}`;
  API.ai.status = `${baseURL}/api/ai/status`;
};

// ✅ Update the synchronous exports once we get the server info
getBaseUrl().then(url => {
  API_BASE_URL = url;
  SOCKET_URL = url;
  updateStaticAPIObject(url);
  console.log('✅ API_BASE_URL updated to:', url);
  console.log('✅ Static API object updated with dynamic URLs');
}).catch(error => {
  console.error('❌ Failed to initialize dynamic IP detection:', error);
  console.log('⚠️ Using fallback configuration');
});

// ✅ KEEP YOUR EXISTING STORAGE KEYS + ADD NEW ONES
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@auth_token', // ✅ Keep existing for backward compatibility
  USER_TOKEN: 'userToken',   // ✅ Add new for AuthContext
  USER_DATA: '@user_data',
  CART_ITEMS: '@cart_items',
  FAVORITES: '@favorites',
  RECENT_SEARCHES: '@recent_searches',
  ONBOARDING_COMPLETED: '@onboarding_completed',
  VERIFICATION_COMPLETION_TIME: 'verification_completion_time',
};

export const CHAT_CONFIG = {
  MAX_MESSAGE_LENGTH: 1000,
  TYPING_TIMEOUT: 3000,
  CONNECTION_TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
};

// ✅ ADD NEW AUTH-SPECIFIC API REQUEST (separate from existing)
interface AuthApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  requireAuth?: boolean;
}

export const authApiRequest = async (endpoint: string, options: AuthApiRequestOptions = {}) => {
  try {
    const {
      method = 'GET',
      body,
      headers = {},
      requireAuth = false,
    } = options;

    const baseURL = await getBaseUrl(); // ✅ Get current base URL
    const fullUrl = `${baseURL}${endpoint}`;
    console.log(`📤 Auth API Request: ${method} ${endpoint}`);
    console.log(`🔗 Full URL: ${fullUrl}`);

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    // ✅ Use the AuthContext token storage key
    if (requireAuth) {
      const token = await AsyncStorage.getItem('@auth_token');
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
        console.log('🔑 Auth API Request: Token added');
      } else {
        console.log('❌ Auth API Request: No token found');
        throw new Error('Authentication token not found');
      }
    }

    const requestConfig: RequestInit = {
      method,
      headers: requestHeaders,
    };

    if (body && method !== 'GET') {
      requestConfig.body = JSON.stringify(body);
    }

    const response = await fetch(fullUrl, requestConfig);

    // Handle 401 errors specifically for auth
    if (response.status === 401) {
      console.log('🔑 Auth API: 401 - Clearing token');
      try {
        await AsyncStorage.multiRemove(['@auth_token', '@user_data']);
      } catch (error) {
        console.error('Error clearing token:', error);
      }
      
      const error = new Error('Authentication expired');
      (error as any).status = 401;
      throw error;
    }

    if (!response.ok) {
      const errorData = await response.text();
      let parsedError;
      try {
        parsedError = JSON.parse(errorData);
      } catch {
        parsedError = { message: errorData };
      }
      
      const error = new Error(parsedError.message || `HTTP ${response.status}`);
      (error as any).status = response.status;
      (error as any).response = parsedError;
      throw error;
    }

    try {
      const jsonResponse = await response.json();
      console.log('🔍 authApiRequest: JSON parsed successfully:', {
        hasData: !!jsonResponse,
        dataType: typeof jsonResponse,
        dataKeys: jsonResponse ? Object.keys(jsonResponse) : 'no keys'
      });
      return jsonResponse;
    } catch (jsonError) {
      console.error('❌ authApiRequest: Failed to parse JSON response:', jsonError);
      throw new Error('Invalid response format from server');
    }

  } catch (error: any) {
    console.error(`❌ Auth API Request failed:`, error.message);
    throw error;
  }
};

// ✅ KEEP YOUR EXISTING apiClient UNCHANGED (but with dynamic URL)
export const apiClient = {
  async get(endpoint: string, options: any = {}) {
    try {
      const token = await AsyncStorage.getItem('@auth_token'); // ✅ Keep existing storage key
      const baseURL = await getBaseUrl(); // ✅ Get current base URL
      console.log('🔍 Making GET request:', {
        endpoint,
        hasToken: !!token,
        fullURL: `${baseURL}${endpoint}`
      });
      
      const response = await fetch(`${baseURL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers
        }
      });

      console.log('📥 Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ API Error Response:', errorData);
        
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        (error as any).status = response.status;
        (error as any).statusText = response.statusText;
        (error as any).response = errorData;
        throw error;
      }
      
      const data = await response.json();
      console.log('✅ Response data received successfully');
      return data;
    } catch (error: any) {
      console.error('❌ API GET Error:', {
        endpoint,
        message: error.message,
        status: error.status
      });
      throw error;
    }
  },

  async post(endpoint: string, data: any, options: any = {}) {
    try {
      const token = await AsyncStorage.getItem('@auth_token'); // ✅ Keep existing storage key
      const baseURL = await getBaseUrl(); // ✅ Get current base URL
      console.log('🔍 Making POST request:', {
        endpoint,
        hasToken: !!token,
        isFormData: data instanceof FormData,
        fullURL: `${baseURL}${endpoint}`
      });

      const headers: any = {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers
      };

      if (!(data instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
      }

      console.log('📤 Request headers:', headers);
      
      if (data instanceof FormData) {
        console.log('📋 FormData contents:');
        for (let [key, value] of data.entries()) {
          if (value instanceof File || (value && typeof value === 'object' && 'uri' in value)) {
            console.log(`  ${key}:`, { 
              name: value.name || 'file', 
              type: value.type || 'unknown',
              size: value.size || 'unknown'
            });
          } else {
            console.log(`  ${key}:`, value);
          }
        }
      }

      const response = await fetch(`${baseURL}${endpoint}`, {
        method: 'POST',
        headers,
        body: data instanceof FormData ? data : JSON.stringify(data)
      });

      console.log('📥 Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ API Error Response:', errorData);
        
        let parsedError;
        try {
          parsedError = JSON.parse(errorData);
        } catch {
          parsedError = { message: errorData };
        }
        
        const error = new Error(parsedError.message || `HTTP ${response.status}: ${response.statusText}`);
        (error as any).status = response.status;
        (error as any).statusText = response.statusText;
        (error as any).response = parsedError;
        throw error;
      }
      
      const responseData = await response.json();
      console.log('✅ POST response data received successfully');
      return responseData;
    } catch (error: any) {
      console.error('❌ API POST Error:', {
        endpoint,
        message: error.message,
        status: error.status
      });
      throw error;
    }
  },

  async put(endpoint: string, data: any, options: any = {}) {
    try {
      const token = await AsyncStorage.getItem('@auth_token'); // ✅ Keep existing
      const baseURL = await getBaseUrl(); // ✅ Get current base URL
      
      const response = await fetch(`${baseURL}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.text();
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        (error as any).status = response.status;
        (error as any).statusText = response.statusText;
        (error as any).response = errorData;
        throw error;
      }
      return response.json();
    } catch (error: any) {
      console.error('❌ API PUT Error:', error);
      throw error;
    }
  },

  async delete(endpoint: string, options: any = {}) {
    try {
      const token = await AsyncStorage.getItem('@auth_token'); // ✅ Keep existing
      const baseURL = await getBaseUrl(); // ✅ Get current base URL
      
      const response = await fetch(`${baseURL}${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        (error as any).status = response.status;
        (error as any).statusText = response.statusText;
        (error as any).response = errorData;
        throw error;
      }
      return response.json();
    } catch (error: any) {
      console.error('❌ API DELETE Error:', error);
      throw error;
    }
  },

  async patch(endpoint: string, data: any, options: any = {}) {
    try {
      const token = await AsyncStorage.getItem('@auth_token'); // ✅ Keep existing
      const baseURL = await getBaseUrl(); // ✅ Get current base URL
      console.log('🔍 Making PATCH request:', {
        endpoint,
        hasToken: !!token,
        fullURL: `${baseURL}${endpoint}`
      });
      
      const response = await fetch(`${baseURL}${endpoint}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers
        },
        body: JSON.stringify(data)
      });

      console.log('📥 PATCH response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ PATCH API Error Response:', errorData);
        
        let parsedError;
        try {
          parsedError = JSON.parse(errorData);
        } catch {
          parsedError = { message: errorData };
        }
        
        const error = new Error(parsedError.message || `HTTP ${response.status}: ${response.statusText}`);
        (error as any).status = response.status;
        (error as any).statusText = response.statusText;
        (error as any).response = parsedError;
        throw error;
      }
      
      const responseData = await response.json();
      console.log('✅ PATCH response data received successfully');
      return responseData;
    } catch (error: any) {
      console.error('❌ API PATCH Error:', {
        endpoint,
        message: error.message,
        status: error.status
      });
      throw error;
    }
  }
};

// ✅ KEEP ALL YOUR EXISTING API FUNCTIONS UNCHANGED
export const productAPI = {
  getAll: () => apiClient.get('/api/products'),
  search: (query: string) => apiClient.get(`/api/products/search?q=${encodeURIComponent(query)}`),
  getById: (id: string) => apiClient.get(`/api/products/${id}`),
  create: (data: any) => apiClient.post('/api/products', data),
  update: (id: string, data: any) => apiClient.put(`/api/products/${id}`, data),
  delete: (id: string) => apiClient.delete(`/api/products/${id}`),
  getMy: () => apiClient.get('/api/products/my'),
};

export const fetchSearchedProducts = async (query: string) => {
  try {
    console.log('🔍 fetchSearchedProducts called with query:', query);
    if (!query || query.trim() === '') {
      console.log('📝 Empty query, returning empty array');
      return [];
    }
    
    const result = await apiClient.get(`/api/products/search?q=${encodeURIComponent(query.trim())}`);
    console.log('✅ fetchSearchedProducts result:', result?.length || 0, 'products found');
    return result || [];
  } catch (error: any) {
    console.error('❌ fetchSearchedProducts error:', error.message);
    return [];
  }
};

export const supportAPI = {
  getConversations: () => apiClient.get('/api/support/conversations'),
  getMessages: (conversationId: string) => apiClient.get(`/api/support/conversations/${conversationId}/messages`),
  sendMessage: (conversationId: string, message: string) => 
    apiClient.post(`/api/support/conversations/${conversationId}/messages`, { message }),
  createConversation: (subject: string, message: string) => 
    apiClient.post('/api/support/conversations', { subject, message }),
};

// ✅ Dynamic API object generator
export const getAPI = async () => {
  const baseURL = await getBaseUrl();
  return {
    base: baseURL,
    
    auth: {
      register: `${baseURL}/api/auth/register`,
      login: `${baseURL}/api/auth/login`,
      me: `${baseURL}/api/auth/me`, // ✅ Fixed endpoint
      refresh: `${baseURL}/api/auth/refresh`,
      logout: `${baseURL}/api/auth/logout`,
      forgotPassword: `${baseURL}/api/auth/forgot-password`,
    },

    profile: {
      get: (userId: string) => `${baseURL}/api/profiles/${userId}`,
    },

    products: {
      getAll: `${baseURL}/api/products`,
      search: (query: string) => `${baseURL}/api/products/search?q=${encodeURIComponent(query)}`,
      myProducts: `${baseURL}/api/products/my`,
      getById: (id: string) => `${baseURL}/api/products/${id}`,
      create: `${baseURL}/api/products`,
      update: (id: string) => `${baseURL}/api/products/${id}`,
      delete: (id: string) => `${baseURL}/api/products/${id}`,
    },

    wallet: {
      fund: `${baseURL}/api/wallet/fund`,
      balance: `${baseURL}/api/wallet/balance`,
      topup: `${baseURL}/api/wallet/topup`,
      history: `${baseURL}/api/wallet/history`,
    },

    messages: {
      list: (conversationId: string) => `${baseURL}/api/messages/${conversationId}`,
      send: `${baseURL}/api/messages`,
    },

    conversations: {
      all: `${baseURL}/api/conversations`,
      get: (userId: string) => `${baseURL}/api/conversations/${userId}`,
      create: `${baseURL}/api/conversations`,
    },

    shipping: {
      rates: `${baseURL}/api/shipping/rates`,
      addresses: `${baseURL}/api/shipping/addresses`,
      locations: `${baseURL}/api/shipping/locations`,
    },

    payment: {
      cartPay: `${baseURL}/api/pay/cart-pay`,
      walletPay: `${baseURL}/api/pay/wallet/cart-pay`,
      hybridPay: `${baseURL}/api/pay/wallet/cart-pay-partial`,
    },

    support: {
      base: `${baseURL}/api/support`,
      conversations: `${baseURL}/api/support/conversations`,
      messages: (conversationId: string) => `${baseURL}/api/support/conversations/${conversationId}/messages`,
      escalate: (conversationId: string) => `${baseURL}/api/support/conversations/${conversationId}/escalate`,
    },
  };
};

// ✅ Backward compatibility - mutable API object (will be updated dynamically)
export const API: any = {
  base: `http://${FALLBACK_IP}:${DEV_PORT}`,
  
  auth: {
    register: `http://${FALLBACK_IP}:${DEV_PORT}/api/auth/register`,
    login: `http://${FALLBACK_IP}:${DEV_PORT}/api/auth/login`,
    me: `http://${FALLBACK_IP}:${DEV_PORT}/api/auth/me`,
    refresh: `http://${FALLBACK_IP}:${DEV_PORT}/api/auth/refresh`,
    logout: `http://${FALLBACK_IP}:${DEV_PORT}/api/auth/logout`,
    forgotPassword: `http://${FALLBACK_IP}:${DEV_PORT}/api/auth/forgot-password`,
  },

  profile: {
    get: (userId: string) => `http://${FALLBACK_IP}:${DEV_PORT}/api/profiles/${userId}`,
  },

  products: {
    getAll: `http://${FALLBACK_IP}:${DEV_PORT}/api/products`,
    search: (query: string) => `http://${FALLBACK_IP}:${DEV_PORT}/api/products/search?q=${encodeURIComponent(query)}`,
    myProducts: `http://${FALLBACK_IP}:${DEV_PORT}/api/products/my`,
    getById: (id: string) => `http://${FALLBACK_IP}:${DEV_PORT}/api/products/${id}`,
    create: `http://${FALLBACK_IP}:${DEV_PORT}/api/products`,
    update: (id: string) => `http://${FALLBACK_IP}:${DEV_PORT}/api/products/${id}`,
    delete: (id: string) => `http://${FALLBACK_IP}:${DEV_PORT}/api/products/${id}`,
  },

  wallet: {
    fund: `http://${FALLBACK_IP}:${DEV_PORT}/api/wallet/fund`,
    balance: `http://${FALLBACK_IP}:${DEV_PORT}/api/wallet/balance`,
    topup: `http://${FALLBACK_IP}:${DEV_PORT}/api/wallet/topup`,
    history: `http://${FALLBACK_IP}:${DEV_PORT}/api/wallet/history`,
  },

  messages: {
    list: (conversationId: string) => `http://${FALLBACK_IP}:${DEV_PORT}/api/messages/${conversationId}`,
    send: `http://${FALLBACK_IP}:${DEV_PORT}/api/messages`,
  },

  conversations: {
    all: `http://${FALLBACK_IP}:${DEV_PORT}/api/conversations`,
    get: (userId: string) => `http://${FALLBACK_IP}:${DEV_PORT}/api/conversations/${userId}`,
    create: `http://${FALLBACK_IP}:${DEV_PORT}/api/conversations`,
  },

  shipping: {
    rates: `http://${FALLBACK_IP}:${DEV_PORT}/api/shipping/rates`,
    addresses: `http://${FALLBACK_IP}:${DEV_PORT}/api/shipping/addresses`,
    locations: `http://${FALLBACK_IP}:${DEV_PORT}/api/shipping/locations`,
  },

  payment: {
    cartPay: `http://${FALLBACK_IP}:${DEV_PORT}/api/pay/cart-pay`,
    walletPay: `http://${FALLBACK_IP}:${DEV_PORT}/api/pay/wallet/cart-pay`,
    hybridPay: `http://${FALLBACK_IP}:${DEV_PORT}/api/pay/wallet/cart-pay-partial`,
  },

  support: {
    base: `http://${FALLBACK_IP}:${DEV_PORT}/api/support`,
    conversations: `http://${FALLBACK_IP}:${DEV_PORT}/api/support/conversations`,
    messages: (conversationId: string) => `http://${FALLBACK_IP}:${DEV_PORT}/api/support/conversations/${conversationId}/messages`,
    escalate: (conversationId: string) => `http://${FALLBACK_IP}:${DEV_PORT}/api/support/conversations/${conversationId}/escalate`,
  },

  // 🤖 AI Agent API endpoints
  ai: {
    base: `http://${FALLBACK_IP}:${DEV_PORT}/api/ai`,
    chat: `http://${FALLBACK_IP}:${DEV_PORT}/api/ai/chat`,
    matches: (productId: string, limit?: number) => `http://${FALLBACK_IP}:${DEV_PORT}/api/ai/matches?productId=${productId}&limit=${limit || 5}`,
    value: (productId: string) => `http://${FALLBACK_IP}:${DEV_PORT}/api/ai/value/${productId}`,
    recommendations: (limit?: number) => `http://${FALLBACK_IP}:${DEV_PORT}/api/ai/recommendations?limit=${limit || 10}`,
    negotiation: (swapId: string) => `http://${FALLBACK_IP}:${DEV_PORT}/api/ai/negotiation/${swapId}`,
    status: `http://${FALLBACK_IP}:${DEV_PORT}/api/ai/status`,
  },
};

// ✅ ADD NEW AUTH-SPECIFIC FUNCTIONS (for AuthContext only)
export const authAPI = {
  login: async (email: string, password: string) => {
    console.log('🔍 authAPI.login: Starting login request...');
    try {
      const response = await authApiRequest('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      console.log('🔍 authAPI.login: Response received:', {
        hasResponse: !!response,
        responseType: typeof response,
        responseKeys: response ? Object.keys(response) : 'no keys',
        hasToken: !!(response && response.token),
        hasUser: !!(response && response.user)
      });
      return response;
    } catch (error) {
      console.error('❌ authAPI.login: Error during login request:', error);
      throw error;
    }
  },

  register: async (userData: any) => {
    return authApiRequest('/api/auth/register', {
      method: 'POST',
      body: userData,
    });
  },

  getCurrentUser: async () => {
    return authApiRequest('/api/auth/me', {
      method: 'GET',
      requireAuth: true,
    });
  },

  logout: async () => {
    return authApiRequest('/api/auth/logout', {
      method: 'POST',
      requireAuth: true,
    });
  },
};

console.log('✅ Config loaded with backward compatibility');
console.log('🎯 Config file loading completed!');