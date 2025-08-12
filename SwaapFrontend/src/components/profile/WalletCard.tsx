// components/profile/WalletCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '@constants/colors';

interface WalletCardProps {
  balance: number;
  onPress: () => void;
}

export const WalletCard: React.FC<WalletCardProps> = ({ balance, onPress }) => {
  return (
    <TouchableOpacity style={styles.walletCard} onPress={onPress}>
      <View style={styles.walletHeader}>
        <Ionicons name="wallet-outline" size={24} color={COLORS.gold} />
        <Text style={styles.walletTitle}>Wallet Balance</Text>
      </View>
      <Text style={styles.walletBalance}>₦{balance.toLocaleString()}</Text>
      <View style={styles.walletAction}>
        <Text style={styles.walletActionText}>Tap to manage wallet</Text>
        <Ionicons name="chevron-forward" size={16} color="#666" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  walletCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    marginBottom: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.gold + '30',
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  walletTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  walletBalance: {
    color: COLORS.gold,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  walletAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  walletActionText: {
    color: '#aaa',
    fontSize: 14,
  },
});