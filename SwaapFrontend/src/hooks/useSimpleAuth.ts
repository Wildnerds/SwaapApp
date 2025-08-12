// Create: src/hooks/useSimpleAuth.ts
import { useState, useEffect } from 'react';
import { authStateManager } from '@/utils/authState';

export const useSimpleAuth = () => {
  console.log('🏗️ useSimpleAuth: Hook called');
  
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    console.log('🔗 useSimpleAuth useEffect: Setting up subscription');
    
    const unsubscribe = authStateManager.subscribe(() => {
      console.log('🔔 useSimpleAuth: Auth state change notification received');
      console.log('📊 useSimpleAuth: Current auth state:', {
        hasUser: !!authStateManager.user,
        hasToken: !!authStateManager.token,
        userEmail: authStateManager.user?.email || 'none',
      });
      
      console.log('🔄 useSimpleAuth: Triggering force update');
      forceUpdate(prev => {
        console.log('🔄 useSimpleAuth: Force update executed:', prev, '->', prev + 1);
        return prev + 1;
      });
    });

    // Load initial auth state
    console.log('⏳ useSimpleAuth: Loading initial auth state');
    authStateManager.loadFromStorage();

    return () => {
      console.log('🔗 useSimpleAuth cleanup: Unsubscribing');
      unsubscribe();
    };
  }, []);

  const currentState = {
    user: authStateManager.user,
    token: authStateManager.token,
    loading: authStateManager.loading,
    isAuthenticated: authStateManager.isAuthenticated,
    setAuth: authStateManager.setAuth.bind(authStateManager),
    logout: authStateManager.logout.bind(authStateManager),
  };

  console.log('📤 useSimpleAuth: Returning state:', {
    hasUser: !!currentState.user,
    hasToken: !!currentState.token,
    loading: currentState.loading,
    userEmail: currentState.user?.email || 'none',
  });

  return currentState;
};