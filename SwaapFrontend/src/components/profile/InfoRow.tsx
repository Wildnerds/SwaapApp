// components/profile/InfoRow.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InfoRowProps {
  label: string;
  value?: string | number;
  onPress?: () => void;
  showChevron?: boolean;
  customContent?: React.ReactNode;
  icon?: string;
  iconColor?: string;
}

export const InfoRow: React.FC<InfoRowProps> = ({
  label,
  value,
  onPress,
  showChevron = false,
  customContent,
  icon,
  iconColor = '#666',
}) => {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container 
      style={styles.infoRow} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.labelContainer}>
        {icon && (
          <Ionicons name={icon as any} size={16} color={iconColor} style={styles.icon} />
        )}
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      
      <View style={styles.valueContainer}>
        {customContent || (
          <Text style={styles.infoValue}>{value}</Text>
        )}
        {(showChevron || onPress) && (
          <Ionicons name="chevron-forward" size={16} color="#666" />
        )}
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 8,
  },
  infoLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '400',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoValue: {
    color: '#aaa',
    fontSize: 16,
    fontWeight: '400',
  },
});