// components/common/InfoCard.tsx - Simple InfoCard component
import React from 'react';
import { View, StyleSheet } from 'react-native';

interface InfoCardProps {
  children: React.ReactNode;
  style?: any;
}

export const InfoCard: React.FC<InfoCardProps> = ({ children, style }) => {
  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
});