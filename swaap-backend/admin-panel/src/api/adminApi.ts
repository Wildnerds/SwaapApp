// Admin Panel API Services
import { apiClient } from './client';

const ADMIN_ENDPOINTS = {
  metrics: '/api/admin/metrics',
  users: '/api/admin/all-users',
  advertisements: '/api/admin/advertisements',
  verifications: '/api/admin/verifications/identity',
  products: '/api/admin/products',
  orders: '/api/admin/orders',
};

export const adminApi = {
  // Dashboard metrics
  async getMetrics() {
    try {
      console.log('🔍 Admin API: Fetching dashboard metrics');
      const response: any = await apiClient.get(ADMIN_ENDPOINTS.metrics);
      return response;
    } catch (error: any) {
      console.error('❌ Admin metrics error:', error);
      throw new Error('Failed to fetch dashboard metrics');
    }
  },

  // User management
  async getUsers() {
    try {
      console.log('🔍 Admin API: Fetching users');
      const response: any = await apiClient.get(ADMIN_ENDPOINTS.users);
      return response;
    } catch (error: any) {
      console.error('❌ Admin users error:', error);
      throw new Error('Failed to fetch users');
    }
  },

  async updateUser(userId: string, userData: any) {
    try {
      console.log('🔍 Admin API: Updating user', userId);
      const response = await apiClient.put(`${ADMIN_ENDPOINTS.users}/${userId}`, userData);
      return response;
    } catch (error: any) {
      console.error('❌ Admin update user error:', error);
      throw new Error('Failed to update user');
    }
  },

  async deleteUser(userId: string) {
    try {
      console.log('🔍 Admin API: Deleting user', userId);
      const response = await apiClient.delete(`${ADMIN_ENDPOINTS.users}/${userId}`);
      return response;
    } catch (error: any) {
      console.error('❌ Admin delete user error:', error);
      throw new Error('Failed to delete user');
    }
  },

  // Advertisement management
  async getAdvertisements() {
    try {
      console.log('🔍 Admin API: Fetching advertisements');
      const response: any = await apiClient.get(ADMIN_ENDPOINTS.advertisements);
      return response;
    } catch (error: any) {
      console.error('❌ Admin advertisements error:', error);
      throw new Error('Failed to fetch advertisements');
    }
  },

  async createAdvertisement(adData: any) {
    try {
      console.log('🔍 Admin API: Creating advertisement');
      const response = await apiClient.post(ADMIN_ENDPOINTS.advertisements, adData);
      return response;
    } catch (error: any) {
      console.error('❌ Admin create ad error:', error);
      throw new Error('Failed to create advertisement');
    }
  },

  async updateAdvertisement(adId: string, adData: any) {
    try {
      console.log('🔍 Admin API: Updating advertisement', adId);
      const response = await apiClient.put(`${ADMIN_ENDPOINTS.advertisements}/${adId}`, adData);
      return response;
    } catch (error: any) {
      console.error('❌ Admin update ad error:', error);
      throw new Error('Failed to update advertisement');
    }
  },

  async deleteAdvertisement(adId: string) {
    try {
      console.log('🔍 Admin API: Deleting advertisement', adId);
      const response = await apiClient.delete(`${ADMIN_ENDPOINTS.advertisements}/${adId}`);
      return response;
    } catch (error: any) {
      console.error('❌ Admin delete ad error:', error);
      throw new Error('Failed to delete advertisement');
    }
  },

  // Verification management
  async getVerifications() {
    try {
      console.log('🔍 Admin API: Fetching verifications');
      const response: any = await apiClient.get(ADMIN_ENDPOINTS.verifications);
      return response;
    } catch (error: any) {
      console.error('❌ Admin verifications error:', error);
      throw new Error('Failed to fetch verifications');
    }
  },

  async updateVerificationStatus(verificationId: string, status: string, reason?: string) {
    try {
      console.log('🔍 Admin API: Updating verification status', verificationId);
      const response = await apiClient.put(`${ADMIN_ENDPOINTS.verifications}/${verificationId}`, {
        status,
        reason,
      });
      return response;
    } catch (error: any) {
      console.error('❌ Admin update verification error:', error);
      throw new Error('Failed to update verification status');
    }
  },

  // Product management
  async getProducts() {
    try {
      console.log('🔍 Admin API: Fetching products');
      const response = await apiClient.get(ADMIN_ENDPOINTS.products);
      return response;
    } catch (error: any) {
      console.error('❌ Admin products error:', error);
      throw new Error('Failed to fetch products');
    }
  },

  async updateProduct(productId: string, productData: any) {
    try {
      console.log('🔍 Admin API: Updating product', productId);
      const response = await apiClient.put(`${ADMIN_ENDPOINTS.products}/${productId}`, productData);
      return response;
    } catch (error: any) {
      console.error('❌ Admin update product error:', error);
      throw new Error('Failed to update product');
    }
  },

  async deleteProduct(productId: string) {
    try {
      console.log('🔍 Admin API: Deleting product', productId);
      const response = await apiClient.delete(`${ADMIN_ENDPOINTS.products}/${productId}`);
      return response;
    } catch (error: any) {
      console.error('❌ Admin delete product error:', error);
      throw new Error('Failed to delete product');
    }
  },
};

export default adminApi;