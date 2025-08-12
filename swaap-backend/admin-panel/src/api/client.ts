// Admin Panel API Client - Similar to mobile app structure
import { API_BASE_URL } from '../config';

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

class APIClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  // Set authentication token
  setAuthToken(token: string | null) {
    if (token) {
      this.defaultHeaders['Authorization'] = `Bearer ${token}`;
      console.log('✅ Auth token set in admin API client');
    } else {
      delete this.defaultHeaders['Authorization'];
      console.log('❌ Auth token removed from admin API client');
    }
  }

  // Get stored token from localStorage
  private getStoredToken(): string | null {
    return localStorage.getItem('admin_token');
  }

  // Generic request method
  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Ensure auth token is included
    const storedToken = this.getStoredToken();
    const headers = {
      ...this.defaultHeaders,
      ...options.headers,
    };

    // Add token from localStorage if not already in headers
    if (storedToken && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${storedToken}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    console.log('📤 Admin API Request:', {
      method: config.method || 'GET',
      url,
      hasAuth: !!headers['Authorization'],
    });

    try {
      const response = await fetch(url, config);
      
      console.log('📥 Admin API Response:', {
        status: response.status,
        url,
        ok: response.ok,
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('🔐 Unauthorized - clearing stored token');
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_user');
          this.setAuthToken(null);
        }
        
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If we can't parse error response, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Admin API Error:', {
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // HTTP Methods
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// Create and export the API client instance
const apiClient = new APIClient(API_BASE_URL);

export { apiClient };
export default apiClient;