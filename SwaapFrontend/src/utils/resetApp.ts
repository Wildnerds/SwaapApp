import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistor, store } from '../store/store';
import { logout } from '../store/redux/slices/authSlice';
import { navigationRef } from '@/navigation/navigation'; // ✅ if using

export const resetApp = async () => {
  try {
    await AsyncStorage.clear();         // Clear persisted storage
    await persistor.purge();            // Purge redux-persist cache
    store.dispatch(logout());           // Dispatch logout to reset state

    navigationRef.current?.resetRoot({  // Navigate to login screen
      index: 0,
      routes: [{ name: 'Login' }],
    });
  } catch (err) {
    console.error('❌ Error resetting app:', err);
  }
};
