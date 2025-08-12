// Create a simple auth state manager: src/utils/authState.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@types';

const TOKEN_KEY = '@token';
const USER_KEY = '@user';

// Simple event emitter for auth state changes
class AuthStateManager {
  private listeners: Array<() => void> = [];
  private _user: User | null = null;
  private _token: string | null = null;
  private _loading = true;

  get user() { return this._user; }
  get token() { return this._token; }
  get loading() { return this._loading; }
  get isAuthenticated() { return !!this._user && !!this._token; }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    console.log('📢 AuthStateManager: Notifying', this.listeners.length, 'listeners');
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('AuthStateManager listener error:', error);
      }
    });
  }

  async loadFromStorage() {
    try {
      console.log('📱 AuthStateManager: Loading from storage...');
      const storedUser = await AsyncStorage.getItem(USER_KEY);
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);

      if (storedUser && storedToken) {
        this._user = JSON.parse(storedUser);
        this._token = storedToken;
        console.log('🟢 AuthStateManager: Restored from storage');
      } else {
        console.log('ℹ️ AuthStateManager: No stored auth found');
      }
    } catch (error) {
      console.error('❌ AuthStateManager: Load error', error);
    } finally {
      this._loading = false;
      this.notify();
    }
  }

  async setAuth(user: User, token: string) {
    try {
      console.log('💾 AuthStateManager: Setting auth', { userEmail: user.email });
      
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      await AsyncStorage.setItem(TOKEN_KEY, token);
      
      this._user = user;
      this._token = token;
      
      console.log('✅ AuthStateManager: Auth set and persisted');
      this.notify(); // This should trigger RootNavigator re-render
      
      // Fallback: Force navigation after a short delay if re-render doesn't work
      setTimeout(() => {
        console.log('⏰ AuthStateManager: Fallback - checking if navigation happened...');
        
        // Import navigationRef dynamically to avoid circular imports
        import('../navigation/RootNavigation').then(({ navigationRef }) => {
          if (navigationRef.isReady()) {
            try {
              // Get current route
              const currentRoute = navigationRef.getCurrentRoute();
              console.log('📍 Current route:', currentRoute?.name);
              
              // If we're still on auth screens, we need to trigger a complete app refresh
              if (currentRoute?.name === 'Login' || currentRoute?.name === 'Register' || currentRoute?.name === 'ForgotPassword') {
                console.log('🚀 AuthStateManager: RootNavigator not re-rendering, forcing complete refresh');
                
                // Since RootNavigator isn't re-rendering, we need to force the entire app to refresh
                // This is a React Native specific workaround
                const { DevSettings } = require('react-native');
                if (__DEV__) {
                  console.log('🔄 AuthStateManager: Triggering dev reload as last resort');
                  DevSettings.reload();
                } else {
                  console.log('❌ AuthStateManager: Production - cannot force reload');
                }
              }
            } catch (error) {
              console.error('❌ AuthStateManager: Fallback navigation failed:', error);
            }
          }
        });
      }, 2000);
      
    } catch (error) {
      console.error('❌ AuthStateManager: Set auth error', error);
    }
  }

  async logout() {
    try {
      console.log('🚪 AuthStateManager: Logging out...');
      
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
      this._user = null;
      this._token = null;
      
      console.log('✅ AuthStateManager: Logged out');
      this.notify();
    } catch (error) {
      console.error('❌ AuthStateManager: Logout error', error);
    }
  }
}

export const authStateManager = new AuthStateManager();