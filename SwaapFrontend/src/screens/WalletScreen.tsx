import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { getAuthToken } from '@utils/auth';
import { apiClient } from '@config/index';
import COLORS from '@constants/colors';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WalletScreen = () => {
  const [balance, setBalance] = useState<number | null>(null);
  const [fundAmount, setFundAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fundingInProgress, setFundingInProgress] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showTransactions, setShowTransactions] = useState(false);

  const navigation = useNavigation();

  // ✅ FIXED: Use correct endpoint with /api prefix and let apiClient handle token
  const fetchBalance = async () => {
    setLoading(true);
    try {
      console.log('🔍 WalletScreen: Fetching balance...');
      
      // ✅ Use apiClient which handles token automatically
      const response = await apiClient.get('/api/wallet/balance');

      console.log('✅ WalletScreen: Balance fetched successfully');
      
      // Handle different response formats
      const balanceValue = response.balance ?? response.data?.balance ?? response;
      
      if (typeof balanceValue !== 'undefined') {
        setBalance(balanceValue);
      } else {
        throw new Error('Invalid balance response format');
      }
    } catch (error: any) {
      console.error('❌ WalletScreen: Balance fetch error:', error);
      
      // Specific handling for different error types
      if (error?.status === 401) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please login again.',
          [
            {
              text: 'OK',
              onPress: () => {
                AsyncStorage.removeItem('@auth_token');
                navigation.navigate('Login');
              }
            }
          ]
        );
      } else if (error?.status === 404) {
        Alert.alert(
          'Service Unavailable',
          'Wallet service is temporarily unavailable. Please try again later.'
        );
      } else {
        Alert.alert(
          'Error',
          error.message || 'Failed to fetch wallet balance'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBalance();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchBalance();
    });
    return unsubscribe;
  }, [navigation]);

  const handleFund = async (amountToFund: string) => {
    const amount = Number(amountToFund);
    
    if (!amount || isNaN(amount) || amount <= 0) {
      return Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0');
    }
    
    if (amount < 100) {
      return Alert.alert('Invalid Amount', 'Minimum funding amount is ₦100');
    }
    
    if (amount > 1000000) {
      return Alert.alert('Invalid Amount', 'Maximum funding amount is ₦1,000,000');
    }

    Alert.alert(
      'Confirm Funding',
      `You're about to fund your wallet with ₦${amount.toLocaleString()}. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Proceed',
          onPress: async () => {
            setFundingInProgress(true);
            try {
              console.log('🔍 WalletScreen: Initiating wallet funding...');
              
              // ✅ FIXED: Use the correct endpoint that matches your backend
              const res = await apiClient.post('/api/wallet/fund', { amount });

              const { authorization_url, reference, access_code, message } = res;

              if (!authorization_url) {
                throw new Error('No payment URL received from server');
              }

              console.log('✅ WalletScreen: Funding initiated successfully');
              console.log('📝 Reference:', reference);

              navigation.navigate('PaystackWebview', {
                url: authorization_url,
                reference,
                amount,
                purpose: 'wallet_funding',
                onSuccess: async (paymentReference: string) => {
                  console.log('🎉 Payment successful! Reference:', paymentReference);
                  
                  // Refresh balance after successful payment
                  await fetchBalance();
                  setFundAmount('');
                  setFundingInProgress(false);
                  
                  Alert.alert(
                    'Payment Successful! 🎉',
                    `₦${amount.toLocaleString()} has been added to your wallet`,
                    [
                      {
                        text: 'View Balance',
                        onPress: () => fetchBalance(),
                      },
                    ]
                  );
                },
                onClose: () => {
                  console.log('Payment cancelled by user');
                  setFundingInProgress(false);
                  fetchBalance(); // Refresh in case payment completed but user closed early
                  
                  Alert.alert(
                    'Payment Cancelled',
                    'Wallet funding was cancelled. You can try again anytime.',
                    [{ text: 'OK' }]
                  );
                },
              });
            } catch (err: any) {
              console.error('❌ WalletScreen: Funding failed:', err);
              setFundingInProgress(false);
              
              let errorMessage = 'Could not initiate wallet funding';
              if (err?.status === 401) {
                errorMessage = 'Please log in to fund your wallet';
              } else if (err?.status === 400) {
                errorMessage = err?.response?.message || err?.message || 'Invalid funding request';
              } else if (err?.message) {
                errorMessage = err.message;
              }
              
              Alert.alert('Funding Failed', errorMessage);
            }
          },
        },
      ]
    );
  };

  // ✅ REMOVED: verifyWalletTopup function since Paystack webhook handles verification
  // The onSuccess callback in PaystackWebview will be called automatically after successful payment

  const handleWithdraw = async (amountToWithdraw: string) => {
    const amount = Number(amountToWithdraw);

    if (!amount || isNaN(amount) || amount <= 0) {
      return Alert.alert('Invalid Amount', 'Please enter a valid withdrawal amount');
    }

    if (balance === null) {
      return Alert.alert('Error', 'Please wait for balance to load');
    }

    if (amount > balance) {
      return Alert.alert('Insufficient Balance', 'You cannot withdraw more than your current balance');
    }

    if (amount < 100) {
      return Alert.alert('Invalid Amount', 'Minimum withdrawal amount is ₦100');
    }

    Alert.alert(
      'Confirm Withdrawal',
      `Are you sure you want to withdraw ₦${amount.toLocaleString()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setWithdrawing(true);
              console.log('🔍 WalletScreen: Initiating withdrawal...');
              
              // ✅ FIXED: Use correct endpoint with /api prefix
              const response = await apiClient.post('/api/wallet/withdraw', { amount: amount });

              console.log('✅ WalletScreen: Withdrawal initiated successfully');

              Alert.alert(
                'Withdrawal Initiated', 
                `₦${amount.toLocaleString()} withdrawal has been initiated. It will be processed within 24 hours.`
              );
              
              await fetchBalance();
              setWithdrawAmount('');
            } catch (err: any) {
              console.error('❌ WalletScreen: Withdrawal error:', err);
              
              let errorMessage = 'Withdrawal request failed. Please try again.';
              if (err?.status === 400) {
                errorMessage = err?.response?.message || err?.message || errorMessage;
              } else if (err?.status === 401) {
                errorMessage = 'Please log in to make withdrawals';
              }
              
              Alert.alert('Withdrawal Failed', errorMessage);
            } finally {
              setWithdrawing(false);
            }
          },
        },
      ]
    );
  };

  // ✅ FIXED: Fetch transactions function with correct endpoint
  const fetchTransactions = async () => {
    try {
      console.log('🔍 WalletScreen: Fetching transactions...');
      
      // ✅ Try the most likely endpoints for wallet transactions
      let response;
      try {
        response = await apiClient.get('/api/wallet/transactions');
      } catch (firstError: any) {
        try {
          response = await apiClient.get('/api/wallet/history');
        } catch (secondError: any) {
          console.log('ℹ️ No transaction endpoint available yet');
          return; // Don't show error for missing transactions endpoint
        }
      }
      
      setTransactions(response.transactions || response.data || response || []);
      console.log('✅ WalletScreen: Transactions fetched successfully');
    } catch (error: any) {
      console.error('❌ WalletScreen: Failed to fetch transactions:', error);
      // Don't show error for transactions as it's not critical
    }
  };

  // ✅ ENHANCED: Fetch transactions when showing them
  useEffect(() => {
    if (showTransactions && transactions.length === 0) {
      fetchTransactions();
    }
  }, [showTransactions]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // ✅ ADDED: Quick amount buttons for easier funding
  const quickAmounts = [500, 1000, 2500, 5000, 10000];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading wallet...</Text>
          </View>
        ) : (
          <>
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Current Balance</Text>
              <Text style={styles.balanceText}>
                ₦{balance?.toLocaleString() || '0.00'}
              </Text>
              <TouchableOpacity 
                style={styles.transactionToggle}
                onPress={() => setShowTransactions(!showTransactions)}
              >
                <Text style={styles.transactionToggleText}>
                  {showTransactions ? 'Hide Recent Transactions' : 'Show Recent Transactions'}
                </Text>
                <Icon 
                  name={showTransactions ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} 
                  size={24} 
                  color="#007AFF" 
                />
              </TouchableOpacity>
            </View>

            {showTransactions && transactions.length > 0 && (
              <View style={styles.transactionsContainer}>
                <Text style={styles.sectionTitle}>Recent Transactions</Text>
                {transactions.slice(0, 5).map((tx, index) => (
                  <View key={index} style={styles.transactionItem}>
                    <View style={styles.transactionLeft}>
                      <Icon 
                        name={tx.type === 'credit' || tx.type === 'fund' ? 'call-received' : 'call-made'} 
                        size={20} 
                        color={tx.type === 'credit' || tx.type === 'fund' ? '#34C759' : '#FF3B30'} 
                      />
                      <View style={styles.transactionDetails}>
                        <Text style={styles.transactionType}>
                          {tx.type === 'credit' || tx.type === 'fund' ? 'Credit' : 'Debit'}
                        </Text>
                        <Text style={styles.transactionDate}>
                          {formatDate(tx.createdAt)}
                        </Text>
                        {tx.narration && (
                          <Text style={styles.transactionNarration}>{tx.narration}</Text>
                        )}
                      </View>
                    </View>
                    <Text style={[
                      styles.transactionAmount,
                      (tx.type === 'credit' || tx.type === 'fund') ? styles.credit : styles.debit
                    ]}>
                      {(tx.type === 'credit' || tx.type === 'fund') ? '+' : '-'}₦{tx.amount.toLocaleString()}
                    </Text>
                  </View>
                ))}
                <TouchableOpacity 
                  style={styles.viewAllButton}
                  onPress={() => navigation.navigate('TransactionHistoryScreen')}
                >
                  <Text style={styles.viewAllText}>View All Transactions</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Fund Wallet</Text>
              
              {/* ✅ ADDED: Quick amount buttons */}
              <View style={styles.quickAmountsContainer}>
                <Text style={styles.quickAmountsLabel}>Quick amounts:</Text>
                <View style={styles.quickAmountsGrid}>
                  {quickAmounts.map((amount) => (
                    <TouchableOpacity
                      key={amount}
                      style={styles.quickAmountButton}
                      onPress={() => setFundAmount(amount.toString())}
                      disabled={fundingInProgress}
                    >
                      <Text style={styles.quickAmountText}>₦{amount.toLocaleString()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TextInput
                placeholder="Enter amount (min. ₦100)"
                placeholderTextColor="#8E8E93"
                keyboardType="numeric"
                value={fundAmount}
                onChangeText={(text) => {
                  // Only allow numbers
                  const numericValue = text.replace(/[^0-9]/g, '');
                  setFundAmount(numericValue);
                }}
                style={styles.input}
                editable={!fundingInProgress}
                maxLength={7} // Max 1,000,000
              />

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.fundButton,
                  (fundingInProgress || !fundAmount || parseInt(fundAmount) < 100) && styles.disabledButton
                ]}
                onPress={() => handleFund(fundAmount)}
                disabled={fundingInProgress || !fundAmount || parseInt(fundAmount) < 100}
              >
                {fundingInProgress ? (
                  <>
                    <ActivityIndicator color="white" />
                    <Text style={styles.buttonText}>Processing...</Text>
                  </>
                ) : (
                  <>
                    <Icon name="account-balance-wallet" size={20} color="white" />
                    <Text style={styles.buttonText}>
                      Fund ₦{fundAmount ? parseInt(fundAmount).toLocaleString() : '0'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Withdraw Funds</Text>
              <TextInput
                placeholder="Enter amount to withdraw"
                placeholderTextColor="#8E8E93"
                keyboardType="numeric"
                value={withdrawAmount}
                onChangeText={(text) => {
                  const numericValue = text.replace(/[^0-9]/g, '');
                  setWithdrawAmount(numericValue);
                }}
                style={styles.input}
                editable={!withdrawing}
                maxLength={7}
              />

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.withdrawButton,
                  (withdrawing || !withdrawAmount || parseInt(withdrawAmount) < 100) && styles.disabledButton
                ]}
                onPress={() => handleWithdraw(withdrawAmount)}
                disabled={withdrawing || !withdrawAmount || parseInt(withdrawAmount) < 100}
              >
                {withdrawing ? (
                  <>
                    <ActivityIndicator color="white" />
                    <Text style={styles.buttonText}>Processing...</Text>
                  </>
                ) : (
                  <>
                    <Icon name="money-off" size={20} color="white" />
                    <Text style={styles.buttonText}>Withdraw</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.infoCard}>
              <Icon name="info" size={20} color="#007AFF" />
              <Text style={styles.infoText}>
                Your wallet balance can be used for purchases, upgrades, and withdrawals. 
                Funding is instant via card payment.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  balanceCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  balanceLabel: {
    fontSize: 18,
    color: '#8E8E93',
    marginBottom: 8,
    fontWeight: '600',
  },
  balanceText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  transactionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
    borderWidth: 1,
    borderColor: '#3C3C3E',
  },
  transactionToggleText: {
    color: '#007AFF',
    marginRight: 4,
    fontWeight: '600',
  },
  transactionsContainer: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionDetails: {
    marginLeft: 12,
    flex: 1,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  transactionDate: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  transactionNarration: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
    fontStyle: 'italic',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  credit: {
    color: '#34C759',
  },
  debit: {
    color: '#FF3B30',
  },
  viewAllButton: {
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: '#2C2C2E',
    borderWidth: 1,
    borderColor: '#3C3C3E',
  },
  viewAllText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  quickAmountsContainer: {
    marginBottom: 16,
  },
  quickAmountsLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
    fontWeight: '600',
  },
  quickAmountsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickAmountButton: {
    backgroundColor: '#2C2C2E',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    minWidth: '18%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3C3C3E',
  },
  quickAmountText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#3C3C3E',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    color: '#FFFFFF',
    backgroundColor: '#2C2C2E',
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
    borderRadius: 12,
  },
  fundButton: {
    backgroundColor: '#34C759',
  },
  withdrawButton: {
    backgroundColor: '#FF9500',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 8,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  infoText: {
    color: '#FFFFFF',
    marginLeft: 12,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default WalletScreen;