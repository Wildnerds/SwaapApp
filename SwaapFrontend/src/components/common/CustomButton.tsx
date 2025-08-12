// components/common/CustomButton.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import COLORS from '@constants/colors';

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  loadingTitle?: string;
  customStyle?: any;
  textStyle?: any;
}

export const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  loadingTitle,
  customStyle,
  textStyle,
}) => {
  const isDisabled = loading || disabled;
  const displayTitle = loading && loadingTitle ? loadingTitle : title;

  return (
    <TouchableOpacity
      style={[styles.button, isDisabled && styles.buttonDisabled, customStyle]}
      onPress={onPress}
      disabled={isDisabled}
    >
      <Text style={[styles.buttonText, textStyle]}>{displayTitle}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.gold,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#121212',
    fontWeight: 'bold',
    fontSize: 16,
  },
});