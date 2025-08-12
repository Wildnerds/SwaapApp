import React from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  GestureResponderEvent,
  ActivityIndicator,
} from 'react-native';
import COLORS from '../constants/colors';

export interface ButtonProps {
  title: string;
  onPress: (event: GestureResponderEvent) => void | Promise<void>;
  filled?: boolean;
  style?: ViewStyle;
  disabled?: boolean;
  loading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  filled = true,
  style,
  disabled = false,
  loading = false,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        filled ? styles.filled : styles.outlined,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={filled ? '#121212' : COLORS.gold} />
      ) : (
        <Text style={filled ? styles.filledText : styles.outlinedText}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  filled: {
    backgroundColor: COLORS.gold,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  filledText: {
    color: '#121212',
    fontWeight: 'bold',
    fontSize: 16,
  },
  outlinedText: {
    color: COLORS.gold,
    fontWeight: 'bold',
    fontSize: 16,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default Button;
