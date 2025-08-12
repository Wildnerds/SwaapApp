import {
  createNavigationContainerRef,
  StackActions,
  CommonActions,
} from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate<Name extends keyof RootStackParamList>(
  ...args: undefined extends RootStackParamList[Name]
    ? [name: Name, params?: RootStackParamList[Name]]
    : [name: Name, params: RootStackParamList[Name]]
) {
  if (navigationRef.isReady()) {
    // @ts-expect-error - valid in practice
    navigationRef.navigate(...args);
  }
}

export function resetToLogin() {
  if (navigationRef.isReady()) {
    console.log('🔁 [resetToLogin] called, isReady:', navigationRef.isReady());
    console.log('📍 Current route before reset:', navigationRef.getCurrentRoute()?.name);

    navigationRef.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });

    console.log('✅ Navigation reset called successfully');
    console.log('📍 Current route after reset:', navigationRef.getCurrentRoute()?.name);
  }
}

// Alternative approach using CommonActions
export function resetToLoginAlternative() {
  console.log('🔁 [resetToLoginAlternative] called, isReady:', navigationRef.isReady());
  
  if (navigationRef.isReady()) {
    try {
      navigationRef.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        })
      );
      console.log('✅ Alternative navigation reset called successfully');
    } catch (error) {
      console.error('❌ Alternative navigation reset failed:', error);
    }
  }
}

// Force navigation approach
export function forceNavigateToLogin() {
  console.log('🔁 [forceNavigateToLogin] called, isReady:', navigationRef.isReady());
  
  if (navigationRef.isReady()) {
    try {
      // First try to navigate normally
      navigationRef.navigate('Login' as keyof RootStackParamList);
      console.log('✅ Force navigate to Login called');
    } catch (error) {
      console.error('❌ Force navigate failed:', error);
    }
  }
}