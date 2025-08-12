// components/profile/VirtualAccountSection.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '@constants/colors';
import { InfoCard } from '../common/InfoCard';
import * as Clipboard from 'expo-clipboard';

interface VirtualAccount {
  accountNumber: string;
  bankName: string;
  accountName: string;
  isActive?: boolean;
}

interface VirtualAccountSectionProps {
  hasVirtualAccount: boolean;
  virtualAccount?: VirtualAccount;
  loading: boolean;
  onCheckStatus: () => void;
}

export const VirtualAccountSection: React.FC<VirtualAccountSectionProps> = ({
  hasVirtualAccount,
  virtualAccount,
  loading,
  onCheckStatus,
}) => {
  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied!', `${label} copied to clipboard`);
  };

  return (
    <InfoCard>
      <View style={styles.sectionHeader}>
        <Ionicons name="card-outline" size={20} color={COLORS.gold} />
        <Text style={styles.sectionTitle}>Virtual Account</Text>
      </View>
      
      {hasVirtualAccount && virtualAccount ? (
        <View>
          <TouchableOpacity 
            style={styles.virtualAccountRow}
            onPress={() => copyToClipboard(virtualAccount.accountNumber, 'Account Number')}
          >
            <View style={styles.virtualAccountInfo}>
              <Text style={styles.virtualAccountLabel}>Account Number</Text>
              <Text style={styles.virtualAccountValue}>{virtualAccount.accountNumber}</Text>
            </View>
            <Ionicons name="copy-outline" size={20} color={COLORS.gold} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.virtualAccountRow}
            onPress={() => copyToClipboard(virtualAccount.bankName, 'Bank Name')}
          >
            <View style={styles.virtualAccountInfo}>
              <Text style={styles.virtualAccountLabel}>Bank Name</Text>
              <Text style={styles.virtualAccountValue}>{virtualAccount.bankName}</Text>
            </View>
            <Ionicons name="copy-outline" size={20} color={COLORS.gold} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.virtualAccountRow}
            onPress={() => copyToClipboard(virtualAccount.accountName, 'Account Name')}
          >
            <View style={styles.virtualAccountInfo}>
              <Text style={styles.virtualAccountLabel}>Account Name</Text>
              <Text style={styles.virtualAccountValue}>{virtualAccount.accountName}</Text>
            </View>
            <Ionicons name="copy-outline" size={20} color={COLORS.gold} />
          </TouchableOpacity>

          <View style={styles.virtualAccountNote}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.gold} />
            <Text style={styles.virtualAccountNoteText}>
              Transfer money to this account to fund your wallet automatically
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.noVirtualAccount}>
          <Text style={styles.noVirtualAccountText}>
            {loading ? 'Setting up your virtual account...' : 'Virtual account not ready yet'}
          </Text>
          <TouchableOpacity 
            style={styles.checkStatusButton}
            onPress={onCheckStatus}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#121212" />
            ) : (
              <>
                <Ionicons name="refresh-outline" size={16} color="#121212" />
                <Text style={styles.checkStatusButtonText}>Check Status</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </InfoCard>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  virtualAccountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  virtualAccountInfo: {
    flex: 1,
  },
  virtualAccountLabel: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 4,
  },
  virtualAccountValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  virtualAccountNote: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#2a2a2a',
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 8,
  },
  virtualAccountNoteText: {
    color: '#ccc',
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
  noVirtualAccount: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  noVirtualAccountText: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  checkStatusButton: {
    backgroundColor: COLORS.gold,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  checkStatusButtonText: {
    color: '#121212',
    fontWeight: 'bold',
    marginLeft: 4,
  },
});