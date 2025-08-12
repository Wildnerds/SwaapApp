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
import { useNavigation, useRoute } from '@react-navigation/native';
import { apiClient } from '@config/index';

// Component imports
import { AnimatedBanner } from '@/components/auth/AnimatedBanner';
import { AuthTitle } from '@/components/auth/AuthTitle';
import { CustomInput } from '@/components/common/CustomInput';
import { CustomButton } from '@/components/common/CustomButton';
import { LoadingOverlay } from '@/components/common/LoadingOverlay';

const logo = require('@/assets/images/logo1.png');

export default function ResetPasswordScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  
  // Get token from route params with type assertion
  const { token } = route.params as { token: string };

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const validatePasswords = () => {
    if (!newPassword.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Password Required',
        text2: 'Please enter your new password.'
      });
      return false;
    }

    if (newPassword.length < 6) {
      Toast.show({
        type: 'error',
        text1: 'Password Too Short',
        text2: 'Password must be at least 6 characters long.'
      });
      return false;
    }

    if (newPassword !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Passwords Don\'t Match',
        text2: 'Please make sure both passwords match.'
      });
      return false;
    }

    return true;
  };

  const handleResetPassword = async () => {
    if (!validatePasswords()) return;

    setLoading(true);
    try {
      console.log('🔄 Resetting password with token...');
      
      const response = await apiClient.post('/api/auth/reset-password', {
        token,
        newPassword,
        confirmPassword
      });

      console.log('✅ Password reset successful');

      Toast.show({
        type: 'success',
        text1: 'Password Reset Successful!',
        text2: 'You can now login with your new password.'
      });

      // Clear fields
      setNewPassword('');
      setConfirmPassword('');
      
      // Navigate to login after success
      setTimeout(() => {
        navigation.navigate('Login' as never);
      }, 2000);

    } catch (error: any) {
      console.error('❌ Password reset failed:', error);
      
      let message = 'Something went wrong. Please try again.';
      
      if (error?.response?.status === 400) {
        message = error?.response?.data?.message || 'Invalid or expired reset token.';
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

        <AuthTitle title="Set New Password" />

        <Text style={styles.subtitle}>
          Enter your new password below. Make sure it's secure and easy to remember.
        </Text>

        <CustomInput
          placeholder="New Password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry={true}
          autoCapitalize="none"
          customStyle={styles.passwordInput}
        />

        <CustomInput
          placeholder="Confirm New Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={true}
          autoCapitalize="none"
          customStyle={styles.passwordInput}
        />

        <CustomButton
          title="Reset Password"
          loadingTitle="Resetting..."
          onPress={handleResetPassword}
          loading={loading}
          customStyle={styles.resetButton}
        />

        <TouchableOpacity 
          onPress={() => navigation.navigate('Login' as never)} 
          style={styles.backLink}
          disabled={loading}
        >
          <Text style={styles.backText}>← Back to Login</Text>
        </TouchableOpacity>
      </ScrollView>

      <LoadingOverlay visible={loading} text="Resetting password..." />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#121212',
    padding: 20,
    justifyContent: 'center',
    minHeight: '100%',
  },
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  passwordInput: {
    marginBottom: 15,
  },
  resetButton: {
    marginTop: 20,
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
});