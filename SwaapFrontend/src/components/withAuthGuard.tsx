// src/hoc/withAuthGuard.tsx
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import { setAuth, logout } from '@/store/redux/slices/authSlice'; // ✅ Use logout instead of clearAuth
import { useAuth } from '@context/AuthContext';
import { User } from '@/types/user';

// Update your withAuthGuard with more debugging to see if it's running:

export function withAuthGuard<P>(WrappedComponent: React.ComponentType<P>) {
  return function AuthGuardedComponent(props: P) {
    const dispatch = useDispatch();
    const { syncAuthData, clearAuthData } = useAuth();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
      const bootstrap = async () => {
        try {
          console.log('🔍 withAuthGuard: Starting bootstrap process...');
          
          const token = await AsyncStorage.getItem('@token');
          const userJson = await AsyncStorage.getItem('@user');

          console.log('🔍 withAuthGuard: AsyncStorage check:', {
            tokenExists: !!token,
            userExists: !!userJson,
            tokenLength: token?.length || 0
          });

          if (token && userJson) {
            console.log('🔍 withAuthGuard: Found auth data, parsing user...');
            const user = JSON.parse(userJson) as User;
            
            console.log('🔍 withAuthGuard: Parsed user:', {
              id: user._id || user.id,
              name: user.fullName,
              email: user.email
            });
            
            // ✅ Sync to both Redux and AuthContext
            console.log('🔄 withAuthGuard: Dispatching to Redux...');
            dispatch(setAuth({ token, user }));
            
            console.log('🔄 withAuthGuard: Syncing to AuthContext...');
            await syncAuthData(user, token);
            
            console.log('✅ withAuthGuard: Auth synced to both Redux and AuthContext');
          } else {
            console.log('❌ withAuthGuard: No auth data found, clearing both stores');
            dispatch(logout());
            await clearAuthData();
          }
        } catch (e) {
          console.error('❌ withAuthGuard error:', e);
          dispatch(logout());
          await clearAuthData();
        } finally {
          console.log('🔍 withAuthGuard: Bootstrap complete, setting checking to false');
          setChecking(false);
        }
      };

      bootstrap();
    }, [dispatch, syncAuthData, clearAuthData]);

    console.log('🔍 withAuthGuard: Render check - checking:', checking);

    if (checking) {
      return (
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: '#121212'
        }}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={{ color: '#fff', marginTop: 10 }}>
            Loading authentication...
          </Text>
        </View>
      );
    }

    console.log('✅ withAuthGuard: Rendering wrapped component');
    return <WrappedComponent {...props} />;
  };
}