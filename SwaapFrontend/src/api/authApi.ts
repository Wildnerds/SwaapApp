// ✅ FIXED: Use the config apiClient instead of separate client
import { apiClient } from '@config/index'; // Use your fixed apiClient
import { User } from '../types';

// ✅ FIXED: Updated to use the correct endpoint with verification fields
const AUTH_API = {
  login: `/api/auth/login`,
  register: `/api/auth/register`,
  me: `/api/users/me`,           // ✅ CHANGED: 
  refresh: `/api/auth/refresh`,
  logout: `/api/auth/logout`,
};

interface LoginResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
}

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  try {
    console.log('🔍 Auth Service: Making login request');
    const response = await apiClient.post(AUTH_API.login, { email, password });

    return {
      success: true,
      token: response.token,
      user: response.user,
    };
  } catch (error: any) {
    console.error('❌ Login API error:', error);
    return {
      success: false,
      message: error.message || 'Login failed',
    };
  }
};

// ✅ FIXED: Now uses the correct endpoint with verification fields
export const refreshUser = async (): Promise<User> => {
  try {
    console.log('🔍 Auth Service: Refreshing user data from /api/users/me');
    const response = await apiClient.get(AUTH_API.me);
    console.log('✅ Auth Service: Received user data with verification fields:', {
      phoneVerified: response.user?.phoneVerified,
      trustScore: response.user?.trustScore,
      verificationLevel: response.user?.verificationLevel
    });
    return response.user || response; // Handle different response formats
  } catch (error: any) {
    console.error('❌ Refresh user error:', error);
    throw new Error('Failed to fetch user');
  }
};

// ✅ Add other auth functions
export const register = async (userData: any): Promise<LoginResponse> => {
  try {
    console.log('🔍 Auth Service: Making register request');
    const response = await apiClient.post(AUTH_API.register, userData);

    return {
      success: true,
      token: response.token,
      user: response.user,
    };
  } catch (error: any) {
    console.error('❌ Register API error:', error);
    return {
      success: false,
      message: error.message || 'Registration failed',
    };
  }
};

export const logout = async (): Promise<void> => {
  try {
    console.log('🔍 Auth Service: Making logout request');
    await apiClient.post(AUTH_API.logout, {});
  } catch (error: any) {
    console.error('❌ Logout API error:', error);
    // Don't throw error for logout - always clear local data
  }
};