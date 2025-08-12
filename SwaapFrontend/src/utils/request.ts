// src/api/request.ts
import apiClient from '../api/client';

type Method = 'get' | 'post' | 'put' | 'delete' | 'patch';

interface RequestOptions {
  method: Method;
  url: string;
  data?: any;
  params?: Record<string, any>;
}

export async function request<T = any>({
  method,
  url,
  data,
  params,
}: RequestOptions): Promise<T> {
  try {
    const response = await apiClient.request<T>({
      method,
      url,
      data,
      params,
    });

    return response.data;
  } catch (error: any) {
    console.error(`[API ERROR] ${method.toUpperCase()} ${url}`, error?.response || error);
    throw error?.response?.data || error.message || 'Unknown error';
  }
}
