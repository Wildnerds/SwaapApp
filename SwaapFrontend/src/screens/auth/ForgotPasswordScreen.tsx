// screens/auth/ForgotPasswordScreen.tsx
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Text
} from 'react-native';
import Toast from 'react-native-toast-message';
import COLORS from '@constants/colors';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { apiClient } from '@config/index';

// Component imports
import { AnimatedBanner } from '@/components/auth/AnimatedBanner';
import { AuthTitle } from '@/components/auth/AuthTitle';
import { CustomInput } from '@/components/common/CustomInput';
import { CustomButton } from '@/components/common/CustomButton';
import { LoadingOverlay } from '@/components/common/LoadingOverlay';

import type { RootStackParamList } from '@navigation/types';

const logo = require('@/assets/images/logo1.png');

type ForgotPasswordScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ForgotPassword'
>;

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();

  const validateEmail = () => {
    if (!email.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Email Required',
        text2: 'Please enter your email address.'
      });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Email',
        text2: 'Please enter a valid email address.'
      });
      return false;
    }

    return true;
  };

  const handleResetPassword = async () => {
    if (!validateEmail()) return;

    setLoading(true);
    try {
      console.log('🔄 Sending password reset email...');
      
      const response = await apiClient.post('/api/auth/forgot-password', { 
        email: email.trim().toLowerCase() 
      });

      console.log('✅ Password reset email sent successfully');

      Toast.show({
        type: 'success',
        text1: 'Email Sent!',
        text2: 'Check your email for reset instructions.'
      });

      // Clear the email field after successful submission
      setEmail('');
      
      // Optionally navigate back to login after a delay
      setTimeout(() => {
        navigation.navigate('Login');
      }, 2000);

    } catch (error: any) {
      console.error('❌ Password reset failed:', error);
      
      let message = 'Something went wrong. Please try again.';
      
      if (error?.response?.status === 404) {
        message = 'No account found with this email address.';
      } else if (error?.response?.status === 400) {
        message = 'Invalid email format.';
      } else if (error?.response?.status === 429) {
        message = 'Too many requests. Please try again later.';
      } else if (error?.message) {
        message = error.message;
      }

      Toast.show({
        type: 'error',
        text1: 'Reset Failed',
        text2: message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView 
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <AnimatedBanner logoSource={logo} logoWidth={100} logoHeight={100} />

        <AuthTitle title="Reset Your Password" />

        <Text style={styles.subtitle}>
          Enter your email address and we'll send you a link to reset your password.
        </Text>

        <CustomInput
          placeholder="Enter your email address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          customStyle={styles.emailInput}
        />

        <CustomButton
          title="Send Reset Email"
          loadingTitle="Sending..."
          onPress={handleResetPassword}
          loading={loading}
          customStyle={styles.resetButton}
        />

        <TouchableOpacity 
          onPress={handleBackToLogin} 
          style={styles.backLink}
          disabled={loading}
        >
          <Text style={styles.backText}>← Back to Login</Text>
        </TouchableOpacity>

        <View style={styles.helpSection}>
          <Text style={styles.helpText}>
            Don't have an account?{' '}
            <Text 
              style={styles.helpLink}
              onPress={() => navigation.navigate('Register')}
            >
              Sign up here
            </Text>
          </Text>
        </View>
      </ScrollView>

      <LoadingOverlay visible={loading} text="Sending reset email..." />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#121212', // Dark background
    padding: 20,
    justifyContent: 'center',
    minHeight: '100%',
  },
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC', // Light gray text
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  emailInput: {
    marginBottom: 20, // Extra spacing for better UX
  },
  resetButton: {
    marginTop: 10,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  backLink: {
    marginTop: 30,
    alignItems: 'center',
    paddingVertical: 12,
  },
  backText: {
    color: COLORS.gold,
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  helpSection: {
    marginTop: 40,
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  helpText: {
    color: '#CCCCCC',
    fontSize: 14,
    textAlign: 'center',
  },
  helpLink: {
    color: COLORS.gold,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});