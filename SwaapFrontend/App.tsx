// App.tsx
import React, { useEffect } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { store, persistor } from './src/store';
import { ErrorBoundary } from './ErrorBoundary';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import { setAuth } from './src/store/redux/slices/authSlice';
import { setCurrentUser } from './src/store/redux/slices/cartSlice';
import { initializeFavorites } from './src/store/redux/slices/favoriteSlice';

function AppContent() {
  const dispatch = useDispatch();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('@auth_token');
        const userData = await AsyncStorage.getItem('@user_data');
        
        if (token && userData) {
          const user = JSON.parse(userData);
          dispatch(setAuth({ user, token }));
          dispatch(setCurrentUser(user));
          console.log('✅ Auth restored from storage');
        } else {
          console.log('ℹ️ No auth data found in storage');
        }
      } catch (error) {
        console.error('❌ Error restoring auth:', error);
      }
    };

    initializeAuth();
    // Initialize favorites from localStorage  
    dispatch(initializeFavorites());
  }, [dispatch]);

  return (
    <>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
      <Toast />
    </>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </PersistGate>
    </Provider>
  );
}