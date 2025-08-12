// components/auth/AuthTitle.tsx
import React from 'react';
import { Text, StyleSheet } from 'react-native';

interface AuthTitleProps {
  title: string;
  customStyle?: any;
}

export const AuthTitle: React.FC<AuthTitleProps> = ({
  title,
  customStyle,
}) => {
  return (
    <Text style={[styles.title, customStyle]}>{title}</Text>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 30,
    textAlign: 'center',
  },
});