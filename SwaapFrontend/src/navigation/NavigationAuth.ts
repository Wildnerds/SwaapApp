// Create: src/navigation/NavigationAuth.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@types';

const NAV_TOKEN_KEY = '@nav_token';
const NAV_USER_KEY = '@nav_user';

// Simple singleton for navigation-specific auth
class NavigationAuth {
  private static instance: NavigationAuth;
  private _user: User | null = null;
  private _token: string | null = null;
  private _loading = true;
  private _callbacks: Set<() => void> = new Set();

  static getInstance() {
    if (!NavigationAuth.instance) {
      NavigationAuth.instance = new NavigationAuth();
    }
    return NavigationAuth.instance;
  }

  get user() { return this._user; }
  get token() { return this._token; }
  get loading() { return this._loading; }
  get isAuthenticated() { return !!this._user && !!this._token; }

  subscribe(callback: () => void) {
    this._callbacks.add(callback);
    return () => this._callbacks.delete(callback);
  }

  private notify() {
    console.log('🔔 NavigationAuth: Notifying', this._callbacks.size, 'callbacks');
    this._callbacks.forEach(callback => callback());
  }

  async initialize() {
    try {
      console.log('🎯 NavigationAuth: Initializing...');
      
      // 🚨 TOGGLE: Set to true to restore normal auth persistence, false for debugging
      const ENABLE_AUTH_PERSISTENCE = true;
      
      if (ENABLE_AUTH_PERSISTENCE) {
        console.log('🔄 NavigationAuth: Restoring stored auth data...');
        
        const storedUser = await AsyncStorage.getItem(NAV_USER_KEY);
        const storedToken = await AsyncStorage.getItem(NAV_TOKEN_KEY);

        if (storedUser && storedToken) {
          this._user = JSON.parse(storedUser);
          this._token = storedToken;
          console.log('✅ NavigationAuth: Restored user:', this._user?.email);
        } else {
          console.log('ℹ️ NavigationAuth: No stored auth data found');
        }
      } else {
        console.log('⚠️ NavigationAuth: Auth persistence disabled for debugging');
        this._user = null;
        this._token = null;
      }
      
    } catch (error) {
      console.error('❌ NavigationAuth: Init error', error);
      // Fallback to clean state
      this._user = null;
      this._token = null;
    } finally {
      this._loading = false;
      this.notify();
      console.log('✅ NavigationAuth: Initialization complete');
    }
  }

  async setAuth(user: User | null, token: string | null) {
    try {
      if (user && token) {
        console.log('💾 NavigationAuth: Setting auth for', user.email);
        
        await AsyncStorage.setItem(NAV_USER_KEY, JSON.stringify(user));
        await AsyncStorage.setItem(NAV_TOKEN_KEY, token);
        
        this._user = user;
        this._token = token;
        
        console.log('✅ NavigationAuth: Auth set successfully');
      } else {
        console.log('🚪 NavigationAuth: Clearing auth (null user/token)');
        
        await AsyncStorage.multiRemove([NAV_USER_KEY, NAV_TOKEN_KEY]);
        
        this._user = null;
        this._token = null;
        
        console.log('✅ NavigationAuth: Auth cleared successfully');
      }
      
      this.notify();
      
    } catch (error) {
      console.error('❌ NavigationAuth: Set auth error', error);
    }
  }

  async logout() {
    try {
      console.log('🚪 NavigationAuth: Starting logout...');
      
      // Clear all auth storage
      const authKeysToRemove = [
        NAV_USER_KEY,
        NAV_TOKEN_KEY,
        '@token', 
        'token', 
        '@auth_token',
        '@user', 
        'user', 
        '@user_data',
        '@authToken',
        '@userData',
        '@cached_user',
        '@session',
        '@login_data',
        'persist:root'
      ];
      
      await AsyncStorage.multiRemove(authKeysToRemove);
      console.log('✅ NavigationAuth: Storage cleared');
      
      // Clear internal state
      this._user = null;
      this._token = null;
      
      // Notify all callbacks
      this.notify();
      
      // Navigate to login
      setTimeout(async () => {
        try {
          const { navigationRef } = await import('./RootNavigation');
          
          if (navigationRef.isReady()) {
            navigationRef.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
            console.log('✅ NavigationAuth: Navigated to Login');
          }
        } catch (navError) {
          console.error('❌ NavigationAuth: Navigation reset failed:', navError);
        }
      }, 500);
      
      console.log('✅ NavigationAuth: Logout completed');
      
    } catch (error) {
      console.error('❌ NavigationAuth: Logout error', error);
      
      // Emergency fallback
      try {
        await AsyncStorage.clear();
        this._user = null;
        this._token = null;
        this.notify();
        console.log('🧹 NavigationAuth: Emergency clear completed');
      } catch (emergencyError) {
        console.error('❌ NavigationAuth: Emergency clear failed:', emergencyError);
      }
    }
  }
}

export const navigationAuth = NavigationAuth.getInstance();

// Initialize immediately - DISABLED to prevent conflicts with AuthContext
// navigationAuth.initialize();