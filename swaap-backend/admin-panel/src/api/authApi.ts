// Admin Authentication API
import { apiClient } from './client';

interface User {
  _id: string;
  email: string;
  role: string;
  fullName: string;
}

interface LoginResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
}

const AUTH_ENDPOINTS = {
  login: '/api/auth/login',
  logout: '/api/auth/logout',
  me: '/api/users/me',
};

export const authApi = {
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      console.log('🔍 Admin Auth: Making login request');
      const response: any = await apiClient.post(AUTH_ENDPOINTS.login, {
        email,
        password,
      });

      // Verify admin role
      if (response.user?.role !== 'admin') {
        throw new Error('Access denied. Admin privileges required.');
      }

      // Set auth token in client
      if (response.token) {
        apiClient.setAuthToken(response.token);
      }

      return {
        success: true,
        token: response.token,
        user: response.user,
      };
    } catch (error: any) {
      console.error('❌ Admin login error:', error);
      return {
        success: false,
        message: error.message || 'Login failed',
      };
    }
  },

  async logout(): Promise<void> {
    try {
      console.log('🔍 Admin Auth: Making logout request');
      await apiClient.post(AUTH_ENDPOINTS.logout, {});
    } catch (error: any) {
      console.error('❌ Admin logout error:', error);
      // Don't throw error for logout - always clear local data
    } finally {
      // Always clear token from client
      apiClient.setAuthToken(null);
    }
  },

  async getProfile(): Promise<User> {
    try {
      console.log('🔍 Admin Auth: Fetching profile');
      const response: any = await apiClient.get(AUTH_ENDPOINTS.me);
      return response.user || response;
    } catch (error: any) {
      console.error('❌ Admin profile fetch error:', error);
      throw new Error('Failed to fetch profile');
    }
  },
};

export default authApi;