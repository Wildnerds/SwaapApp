// utils/auth.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export const getAuthToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem('@auth_token');
    return token;
  } catch (err) {
    console.error('Failed to load auth token', err);
    return null;
  }
};

export const getCurrentUser = async (): Promise<any | null> => {
  try {
    const user = await AsyncStorage.getItem('@user_data');
    return user ? JSON.parse(user) : null;
  } catch (err) {
    console.error('Failed to load user from storage', err);
    return null;
  }
};

export const clearAuthToken = async () => {
  try {
    await AsyncStorage.multiRemove(['@auth_token', '@user_data']);
  } catch (err) {
    console.error('Failed to clear auth token', err);
  }
};