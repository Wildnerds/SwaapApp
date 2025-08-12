// screens/auth/LoginScreen.tsx - FINAL WORKING VERSION
import React, { useState } from 'react';
import {
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import { useAppDispatch } from '@store/redux/hooks';
import type { RootStackParamList } from '@navigation/types';
import { useAuth } from '@context/AuthContext';
import { setUser } from '@/store/redux/slices/authSlice';

// Component imports
import { AnimatedBanner } from '@/components/auth/AnimatedBanner';
import { AuthTitle } from '@/components/auth/AuthTitle';
import { CustomInput } from '@/components/common/CustomInput';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { CustomButton } from '@/components/common/CustomButton';
import { AuthLinks } from '@/components/auth/AuthLinks';
import { LoadingOverlay } from '@/components/common/LoadingOverlay';

const logo = require('../../assets/images/logo1.png');

type LoginScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Login'
>;

export default function LoginScreen() {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { login } = useAuth(); // ✅ This is working according to logs
  const dispatch = useAppDispatch();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateInputs = () => {
    if (!email.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Email Required',
        text2: 'Please enter your email address.',
      });
      return false;
    }

    if (!password.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Password Required',
        text2: 'Please enter your password.',
      });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Email',
        text2: 'Please enter a valid email address.',
      });
      return false;
    }

    return true;
  };

  // ✅ FIXED: Simple, working handleLogin
  const handleLogin = async () => {
    if (!validateInputs()) {
      return;
    }

    try {
      setLoading(true);
      console.log('🔍 LoginScreen: Starting login for:', email);
      
      // ✅ Since logs show login function exists, call it directly
      const result = await login(email.trim(), password);
      console.log('🔍 LoginScreen: Login result:', result);
      
      if (result.success) {
        console.log('✅ LoginScreen: Login successful');
        
        // AuthContext already handles user state - no need to dispatch here
        
        Toast.show({
          type: 'success',
          text1: 'Login Successful',
          text2: 'Welcome back!',
        });
        
        console.log('📡 LoginScreen: Waiting for automatic navigation...');
        
      } else {
        console.log('❌ LoginScreen: Login failed:', result.message);
        Toast.show({
          type: 'error',
          text1: 'Login Failed',
          text2: result.message || 'Please check your credentials',
        });
      }
    } catch (error: any) {
      console.error('❌ LoginScreen: Login error:', error);
      Toast.show({
        type: 'error',
        text1: 'Login Error',
        text2: error.message || 'Login failed. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleSignUp = () => {
    navigation.navigate('Register');
  };

  const handleTogglePassword = () => {
    setShowPassword(prev => !prev);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView 
        contentContainerStyle={styles.container} 
        keyboardShouldPersistTaps="handled"
      >
        <AnimatedBanner logoSource={logo} />

        

        <AuthTitle title="Login to your account" />

        

        <CustomInput
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <PasswordInput
          value={password}
          onChangeText={setPassword}
          showPassword={showPassword}
          onTogglePassword={handleTogglePassword}
        />

        <CustomButton
          title="Login"
          loadingTitle="Logging in..."
          onPress={handleLogin}
          loading={loading}
        />

        <AuthLinks
          onForgotPassword={handleForgotPassword}
          onSignUp={handleSignUp}
        />
      </ScrollView>

      <LoadingOverlay visible={loading} text="Logging in..." />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#121212',
    padding: 20,
    justifyContent: 'flex-start',
  },
});