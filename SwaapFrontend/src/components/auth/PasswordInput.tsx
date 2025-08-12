// components/auth/PasswordInput.tsx
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { CustomInput } from '../common/CustomInput';
import COLORS from '@constants/colors';

interface PasswordInputProps {
  value: string;
  onChangeText: (text: string) => void;
  showPassword: boolean;
  onTogglePassword: () => void;
  placeholder?: string;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  value,
  onChangeText,
  showPassword,
  onTogglePassword,
  placeholder = "Password",
}) => {
  return (
    <View style={styles.passwordContainer}>
      <CustomInput
        customStyle={styles.passwordInput}
        placeholder={placeholder}
        secureTextEntry={!showPassword}
        value={value}
        onChangeText={onChangeText}
      />
      <TouchableOpacity
        onPress={onTogglePassword}
        style={styles.eyeIcon}
      >
        <Text style={styles.eyeIconText}>
          {showPassword ? '🙈' : '👁️'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  passwordContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    top: 15,
    padding: 5,
    zIndex: 1,
  },
  eyeIconText: {
    fontSize: 20,
    color: COLORS.gold,
  },
});