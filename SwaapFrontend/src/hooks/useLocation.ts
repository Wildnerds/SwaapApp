// src/hooks/useLocation.ts
import { useState, useEffect } from 'react';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export const useLocation = () => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPermission = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Placeholder - you can implement real location logic later
      console.log('📍 Location permission requested');
      
      // Mock location for now
      setTimeout(() => {
        setLocation({
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 10
        });
        setLoading(false);
      }, 1000);
      
    } catch (err: any) {
      setError(err.message || 'Failed to get location');
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📍 Getting current location');
      
      // Mock location for now
      setTimeout(() => {
        setLocation({
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 10
        });
        setLoading(false);
      }, 1000);
      
    } catch (err: any) {
      setError(err.message || 'Failed to get location');
      setLoading(false);
    }
  };

  return {
    location,
    loading,
    error,
    requestPermission,
    getCurrentLocation,
  };
};