// src/utils/fetchPaystackKey.ts

export const fetchPaystackKey = async (): Promise<string> => {
  try {
    const res = await fetch('https://your-backend-url.com/api/config/paystack-key');
    const data = await res.json();
    return data.paystackKey;
  } catch (error) {
    console.error('Failed to fetch Paystack key:', error);
    throw new Error('Could not load Paystack key');
  }
};
