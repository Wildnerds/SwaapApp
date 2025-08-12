// src/context/NavigationAuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import { setAuth, logout as logoutAction } from '@store/redux/slices/authSlice';
import type { User } from '@types';

const TOKEN_KEY = '@token';
const USER_KEY = '@user';

interface NavigationAuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  logoutLoading: boolean;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const NavigationAuthContext = createContext<NavigationAuthContextType | undefined>(undefined);

export const NavigationAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const dispatch = useDispatch();

  // Load auth from storage on app start
  useEffect(() => {
    const loadAuthFromStorage = async () => {
      try {
        const storedUser = await AsyncStorage.getItem(USER_KEY);
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);

        if (storedUser && storedToken) {
          const parsedUser: User = JSON.parse(storedUser);
          setUser(parsedUser);
          setToken(storedToken);
          dispatch(setAuth({ user: parsedUser, token: storedToken }));
        }
      } catch (err) {
        // Handle error silently
      } finally {
        setLoading(false);
      }
    };

    loadAuthFromStorage();
  }, [dispatch]);


  const setAuthState = async (user: User, token: string) => {
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      await AsyncStorage.setItem(TOKEN_KEY, token);
      
      setUser(user);
      setToken(token);
      dispatch(setAuth({ user, token }));
    } catch (err) {
      // Handle error silently
    }
  };

  const logout = async () => {
    setLogoutLoading(true);
    
    try {
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
      setUser(null);
      setToken(null);
      dispatch(logoutAction());
    } catch (err) {
      console.error('❌ NavigationAuth: Logout error', err);
    } finally {
      setLogoutLoading(false);
    }
  };

  const value = {
    user,
    token,
    loading,
    logoutLoading,
    isAuthenticated: !!user && !!token,
    setAuth: setAuthState,
    logout,
  };

  return (
    <NavigationAuthContext.Provider value={value}>
      {children}
    </NavigationAuthContext.Provider>
  );
};

export const useNavigationAuth = (): NavigationAuthContextType => {
  const context = useContext(NavigationAuthContext);
  if (!context) {
    throw new Error('useNavigationAuth must be used within NavigationAuthProvider');
  }
  return context;
};