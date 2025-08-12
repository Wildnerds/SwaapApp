// src/screens/OrderReceiptScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '@navigation/types';
import COLORS from '@constants/colors';

type OrderReceiptRouteProp = RouteProp<RootStackParamList, 'OrderReceipt'>;

const OrderReceiptScreen: React.FC = () => {
  const { params } = useRoute<OrderReceiptRouteProp>();
  const { order } = params;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Order Receipt</Text>
      <Text style={styles.label}>Product: <Text style={styles.value}>{order.product.title}</Text></Text>
      <Text style={styles.label}>Quantity: <Text style={styles.value}>{order.quantity}</Text></Text>
      <Text style={styles.label}>Total: <Text style={styles.value}>₦{order.totalAmount.toLocaleString()}</Text></Text>
      <Text style={styles.label}>Payment Method: <Text style={styles.value}>{order.paymentMethod}</Text></Text>
      <Text style={styles.label}>Status: <Text style={styles.value}>{order.status}</Text></Text>
      <Text style={styles.label}>Paid At: <Text style={styles.value}>{new Date(order.paidAt).toLocaleString()}</Text></Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: COLORS.background,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: COLORS.black,
  },
  label: {
    fontSize: 16,
    marginBottom: 10,
    color: COLORS.black,
  },
  value: {
    fontWeight: 'bold',
  },
});

export default OrderReceiptScreen;
