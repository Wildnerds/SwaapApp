// components/auth/AuthLinks.tsx
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import COLORS from '@constants/colors';

interface AuthLinksProps {
  onForgotPassword: () => void;
  onSignUp: () => void;
  forgotPasswordText?: string;
  signUpText?: string;
}

export const AuthLinks: React.FC<AuthLinksProps> = ({
  onForgotPassword,
  onSignUp,
  forgotPasswordText = "Forgot Password?",
  signUpText = "Don't have an account? Sign up",
}) => {
  return (
    <View style={styles.footerLinks}>
      <TouchableOpacity onPress={onForgotPassword}>
        <Text style={styles.link}>{forgotPasswordText}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onSignUp}>
        <Text style={styles.link}>{signUpText}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  footerLinks: {
    marginTop: 30,
  },
  link: {
    color: COLORS.gold,
    textAlign: 'center',
    marginVertical: 10,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});