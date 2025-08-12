import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '@/navigation/types';

const SuccessConfirmationScreen = () => {
  const navigation = useNavigation();
 type FundSuccessRouteProp = RouteProp<RootStackParamList, 'FundSuccess'>;
const route = useRoute<FundSuccessRouteProp>();
const { amount, date, reference } = route.params;

  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <Text style={styles.successIcon}>✅</Text>
      </View>

      <Text style={styles.title}>Payment Successful</Text>
      <Text style={styles.message}>Your transaction has been completed successfully.</Text>

      <View style={styles.summary}>
        {amount && (
          <Text style={styles.summaryText}>
            Amount: <Text style={styles.highlight}>₦{amount}</Text>
          </Text>
        )}
        {date && (
          <Text style={styles.summaryText}>
            Date: <Text style={styles.highlight}>{new Date(date).toLocaleDateString()}</Text>
          </Text>
        )}
        {reference && (
          <Text style={styles.summaryText}>
            Ref: <Text style={styles.highlight}>{reference}</Text>
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Home')} // or 'BillingHistory'
      >
        <Text style={styles.buttonText}>Go Back Home</Text>
      </TouchableOpacity>
    </View>
  );
};

export default SuccessConfirmationScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconWrapper: {
    backgroundColor: '#1a1a1a',
    padding: 30,
    borderRadius: 100,
    marginBottom: 24,
  },
  successIcon: {
    fontSize: 48,
    color: '#00ff88',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  summary: {
    marginBottom: 24,
  },
  summaryText: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 4,
  },
  highlight: {
    color: '#fff',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonText: {
    color: '#0d0d0d',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
