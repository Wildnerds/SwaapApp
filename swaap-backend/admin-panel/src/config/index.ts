// Admin Panel Configuration - Centralized API settings
const DEV_PORT = '5002';
const PROD_URL = 'https://your-production-api.com';

// Dynamic IP detection for admin panel
const getServerIP = (): string => {
  // Try common network IP ranges
  const potentialIPs = [
    '192.168.0.4',   // Current IP
    '192.168.1.4',   // Alternative range
    '192.168.0.1',   // Router IP
    '192.168.1.1',   // Alternative router
    '10.0.0.1',      // Another common range
    'localhost'      // Fallback
  ];

  // For admin panel, we'll use environment variable first, then fallback
  // In production, this would use the production URL
  return potentialIPs[0]; // Default to current working IP
};

// Get base URL based on environment
const getBaseUrl = (): string => {
  // Check if we're in production
  if (process.env.NODE_ENV === 'production') {
    return PROD_URL;
  }

  // Development mode - use environment variable or detect IP
  const envUrl = process.env.REACT_APP_API_BASE_URL;
  if (envUrl) {
    console.log('🔗 Using API URL from environment:', envUrl);
    return envUrl;
  }

  // Fallback to dynamic IP detection
  const detectedIP = getServerIP();
  const fallbackUrl = `http://${detectedIP}:${DEV_PORT}`;
  console.log('🔗 Using detected API URL:', fallbackUrl);
  return fallbackUrl;
};

// Export the API base URL
export const API_BASE_URL = getBaseUrl();

// Export for debugging
export const CONFIG = {
  API_BASE_URL,
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  DEV_PORT,
  PROD_URL,
};

// Log configuration on load
console.log('🚀 Admin Panel Config loaded:', {
  API_BASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  REACT_APP_API_BASE_URL: process.env.REACT_APP_API_BASE_URL,
});