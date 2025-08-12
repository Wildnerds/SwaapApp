import axios from 'axios';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;
const IS_DEV = process.env.NODE_ENV !== 'production';

// Create a mock paystack response for development
const createMockPaystackResponse = (requestData: any) => {
  const mockReference = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    data: {
      status: true,
      message: "Authorization URL created",
      data: {
        authorization_url: `https://checkout.paystack.com/mock/${mockReference}`,
        access_code: `mock_access_${Math.random().toString(36).substr(2, 9)}`,
        reference: mockReference
      }
    }
  };
};

// Create axios instance with interceptor for development
export const paystackApi = axios.create({
  baseURL: 'https://api.paystack.co',
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET}`,
    'Content-Type': 'application/json',
  },
});

// Add mock interceptor for development when Paystack key is invalid
paystackApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // If we get a 401 error and we're in development, return mock data
    if (error.response?.status === 401 && IS_DEV) {
      console.log('🔄 Paystack auth failed, using mock response for development');
      const mockResponse = createMockPaystackResponse(error.config.data);
      return Promise.resolve(mockResponse);
    }
    return Promise.reject(error);
  }
);
