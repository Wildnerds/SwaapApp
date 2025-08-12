// components/profile/LogoutButton.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LogoutButtonProps {
  onPress: () => void;
  loading?: boolean;
}

export const LogoutButton: React.FC<LogoutButtonProps> = ({ onPress, loading = false }) => {
  return (
    <TouchableOpacity
      style={styles.logoutBtn}
      onPress={onPress}
      disabled={loading}
    >
      <Ionicons name="log-out-outline" size={20} color="#fff" />
      <Text style={styles.logoutText}>
        {loading ? 'Logging out...' : 'Log Out'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  logoutBtn: {
    marginTop: 20,
    backgroundColor: '#E53935',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: 30,
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});