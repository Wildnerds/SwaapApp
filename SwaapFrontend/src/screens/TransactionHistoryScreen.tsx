import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { apiClient } from '@config/index'; // ✅ Use configured apiClient
import COLORS from '@constants/colors';
import * as Clipboard from 'expo-clipboard';
import { FontAwesome5, Feather } from '@expo/vector-icons';

// Enable layout animation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TransactionHistoryScreen = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ✅ FIXED: Use apiClient and correct endpoint
  const fetchLogs = async () => {
    try {
      console.log('🔍 TransactionHistoryScreen: Fetching wallet transactions...');
      
      // ✅ Use apiClient with correct /api prefix
      const response = await apiClient.get('/api/wallet/transactions');
      
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      
      console.log('✅ TransactionHistoryScreen: Raw response received');
      
      // Handle different response formats
      const transactions = response.transactions || response.data?.transactions || response || [];
      
      // Filter for wallet-related transactions
      const walletLogs = transactions.filter(log =>
        ['fund', 'funding', 'withdrawal', 'wallet_payment_partial', 'wallet_deduction', 'credit', 'debit', 'topup'].includes(log.type)
      );
      
      console.log('✅ TransactionHistoryScreen: Filtered', walletLogs.length, 'wallet transactions');
      setLogs(walletLogs);
      
    } catch (err: any) {
      console.error('❌ TransactionHistoryScreen: Failed to fetch transactions:', err);
      
      let errorMessage = 'Could not fetch transactions.';
      
      if (err?.status === 404) {
        errorMessage = 'Transaction history is not available yet. Make some transactions to see history.';
      } else if (err?.status === 401) {
        errorMessage = 'Please log in again to view transaction history.';
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      // Only show error if we have no cached data
      if (logs.length === 0) {
        Alert.alert('Notice', errorMessage);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleCopy = async (ref: string) => {
    try {
      await Clipboard.setStringAsync(ref);
      Alert.alert('Copied', 'Transaction reference copied to clipboard.');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const renderIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'withdrawal':
        return <FontAwesome5 name="arrow-up" size={18} color="#FF4444" />;
      case 'funding':
      case 'fund':
      case 'topup':
      case 'credit':
        return <FontAwesome5 name="arrow-down" size={18} color="#44AA44" />;
      case 'wallet_payment_partial':
      case 'payment':
        return <FontAwesome5 name="money-bill" size={18} color="#FF8800" />;
      case 'debit':
      case 'wallet_deduction':
        return <FontAwesome5 name="minus-circle" size={18} color="#FF4444" />;
      default:
        return <FontAwesome5 name="exchange-alt" size={18} color="#666" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'withdrawal':
      case 'debit':
      case 'wallet_deduction':
        return '#FF4444';
      case 'funding':
      case 'fund':
      case 'topup':
      case 'credit':
        return '#44AA44';
      case 'wallet_payment_partial':
      case 'payment':
        return '#FF8800';
      default:
        return '#666';
    }
  };

  const formatTransactionType = (type: string) => {
    const typeMap = {
      'fund': 'Wallet Funding',
      'funding': 'Wallet Funding',
      'topup': 'Top Up',
      'credit': 'Credit',
      'withdrawal': 'Withdrawal',
      'debit': 'Debit',
      'wallet_payment_partial': 'Partial Payment',
      'wallet_deduction': 'Wallet Deduction',
      'payment': 'Payment'
    };
    
    return typeMap[type?.toLowerCase()] || type?.replace(/_/g, ' ').toUpperCase() || 'Transaction';
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.log}>
      <View style={styles.header}>
        <View style={styles.row}>
          {renderIcon(item.type)}
          <Text style={[styles.type, { color: getTransactionColor(item.type) }]}>
            {formatTransactionType(item.type)}
          </Text>
        </View>
        
        <Text style={[styles.amount, { color: getTransactionColor(item.type) }]}>
          {item.type?.toLowerCase().includes('withdrawal') || item.type?.toLowerCase().includes('debit') ? '-' : '+'}
          ₦{Number(item.amount || 0).toLocaleString()}
        </Text>
      </View>

      <View style={styles.details}>
        <Text style={styles.date}>
          {item.paidAt ? new Date(item.paidAt).toLocaleString() : 
           item.createdAt ? new Date(item.createdAt).toLocaleString() : 
           'Date not available'}
        </Text>

        {item.description && (
          <Text style={styles.description}>{item.description}</Text>
        )}
      </View>

      {item.reference && (
        <View style={styles.refRow}>
          <Text style={styles.reference}>Ref: {item.reference}</Text>
          <TouchableOpacity 
            onPress={() => handleCopy(item.reference)}
            style={styles.copyButton}
          >
            <Feather name="copy" size={16} color={COLORS.gold} />
          </TouchableOpacity>
        </View>
      )}

      {item.status && (
        <Text style={[styles.status, { 
          color: item.status === 'completed' ? '#44AA44' : 
                item.status === 'failed' ? '#FF4444' : '#FF8800' 
        }]}>
          Status: {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.gold} />
        <Text style={styles.loadingText}>Loading transaction history...</Text>
      </View>
    );
  }

  if (!logs.length) {
    return (
      <View style={styles.emptyContainer}>
        <FontAwesome5 name="history" size={60} color="#333" />
        <Text style={styles.empty}>No transactions yet</Text>
        <Text style={styles.emptySubtext}>
          Your wallet transaction history will appear here
        </Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={() => {
            setRefreshing(true);
            fetchLogs();
          }}
        >
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Transaction History</Text>
      <FlatList
        data={logs}
        keyExtractor={(item) => item._id || item.id || Math.random().toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchLogs();
            }}
            colors={[COLORS.gold]}
            tintColor={COLORS.gold}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.gold,
    textAlign: 'center',
    marginVertical: 20,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  loadingText: {
    color: COLORS.gold,
    marginTop: 10,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
    padding: 20,
  },
  empty: {
    textAlign: 'center',
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#aaa',
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },
  refreshButton: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 20,
  },
  refreshButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  log: {
    backgroundColor: '#1e1e1e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  type: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
  },
  details: {
    marginBottom: 8,
  },
  date: {
    color: '#aaa',
    fontSize: 13,
    marginBottom: 4,
  },
  description: {
    color: '#ccc',
    fontSize: 14,
    fontStyle: 'italic',
  },
  refRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  reference: {
    fontSize: 12,
    color: '#aaa',
    flex: 1,
  },
  copyButton: {
    padding: 4,
  },
  status: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});

export default TransactionHistoryScreen;