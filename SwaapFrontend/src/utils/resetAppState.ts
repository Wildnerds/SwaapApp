// resetAppState.ts - Utility to completely reset app state for testing
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistor } from '@/store';

export const resetAppState = async () => {
  console.log('🔄 Resetting entire app state...');
  
  try {
    // Clear Redux Persist
    await persistor.purge();
    
    // Clear all AsyncStorage
    await AsyncStorage.clear();
    
    console.log('✅ App state reset complete');
    
    // Force app reload after reset
    return true;
  } catch (error) {
    console.error('❌ Error resetting app state:', error);
    return false;
  }
};