import { useAuth } from '../context/AuthContext';

export const useAuthenticatedFetch = () => {
  const { token } = useAuth();
  
  return async (url: string, options?: RequestInit) => {
    if (!token) {
      throw new Error('No authentication token available');
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Token might be expired, logout user
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.reload();
      return null;
    }

    return response;
  };
};