// components/common/ErrorState.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CustomButton } from './CustomButton';

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
  retryText?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message,
  onRetry,
  retryText = 'Try Again',
}) => {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>{message}</Text>
      <CustomButton
        title={retryText}
        onPress={onRetry}
        customStyle={styles.retryButton}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
    padding: 20,
  },
  errorText: {
    color: '#E53935',
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
  },
});