// screens/PaymentSuccessScreen.tsx
import React, { useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import COLORS from '@constants/colors';
import { Ionicons } from '@expo/vector-icons';
import Button from '@components/Button';
import { getAuthToken } from '@utils/auth';
import { apiClient } from '@config/index';

type Props = NativeStackScreenProps<RootStackParamList, 'PaymentSuccess'>;

interface OrderDetails {
  _id: string;
  totalAmount: number;
  paymentMethod: string;
  walletPaid: number;
  paystackPaid: number;
  status: string;
  verificationLevel: 'self-arranged' | 'basic' | 'premium';
  shippingMethod: 'self-arranged' | 'shipbubble';
  serviceFee: number;
  shippingFee: number;
  trackingCode?: string;
  trackingUrl?: string;
  inspectionPeriodEnd?: string;
  selfArrangedDetails?: {
    meetupLocation?: string;
    meetupTime?: string;
    deliveryInstructions?: string;
  };
  shipToAddress?: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
  };
}

const PaymentSuccessScreen: React.FC<Props> = ({ navigation, route }) => {
  // Set navigation options immediately to prevent swipe back
  React.useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerLeft: () => null,
    });
  }, [navigation]);
  const { orderId, product, quantity, totalAmount, cartItems, shippingMethod } = route.params;
  
  const [orders, setOrders] = useState<OrderDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const handleBackToHome = React.useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'MainTabs',
          state: {
            index: 0,
            routes: [{ name: 'Home' }],
          },
        },
      ],
    });
  }, [navigation]);

  // Prevent going back to payment screen via gesture or hardware back button
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        // Redirect to home instead of allowing back navigation
        handleBackToHome();
        return true; // Prevent default back action
      };

      // Disable hardware back button (Android)
      const backHandler = require('react-native').BackHandler;
      if (backHandler) {
        const subscription = backHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription?.remove();
      }

    }, [handleBackToHome])
  );

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = await getAuthToken();
        
        if (cartItems && cartItems.length > 0) {
          // For cart payments, fetch multiple orders
          const orderPromises = cartItems.map((item: any) => 
            apiClient.get(`/api/orders/by-reference/${route.params.reference}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
          );
          
          const responses = await Promise.all(orderPromises);
          const allOrders = responses.flatMap(res => res.orders || res.data?.orders || []).filter(Boolean);
          setOrders(allOrders);
        } else {
          // Single order
          const res = await apiClient.get(`/api/orders/${orderId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setOrders([res.order || res.data?.order]);
        }
      } catch (err) {
        console.error('Error fetching orders:', err);
        Alert.alert('Error', 'Failed to load order details.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [orderId, cartItems, route.params.reference]);

  const getShippingIcon = (verificationLevel: string) => {
    switch (verificationLevel) {
      case 'self-arranged': return 'people-outline';
      case 'basic': return 'bicycle-outline';
      case 'premium': return 'shield-checkmark-outline';
      default: return 'cube-outline';
    }
  };

  const getShippingTitle = (verificationLevel: string) => {
    switch (verificationLevel) {
      case 'self-arranged': return 'Self-Arranged';
      case 'basic': return 'Basic Delivery';
      case 'premium': return 'Premium Delivery';
      default: return 'Standard';
    }
  };

  const getShippingDescription = (verificationLevel: string) => {
    switch (verificationLevel) {
      case 'self-arranged': return 'Coordinate pickup/delivery with seller';
      case 'basic': return 'Professional delivery, auto-release on delivery';
      case 'premium': return 'Professional delivery + 48hr inspection period';
      default: return 'Standard shipping';
    }
  };


  const handleViewOrders = () => navigation.navigate('Orders');

  const handleOrderTracking = (order: OrderDetails) => {
    navigation.navigate('OrderTracking', { orderId: order._id });
  };

  const totalServiceFees = orders.reduce((sum, order) => sum + (order.serviceFee || 0), 0);
  const totalShippingFees = orders.reduce((sum, order) => sum + (order.shippingFee || 0), 0);
  const itemsTotal = totalAmount - totalServiceFees - totalShippingFees;

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.content}>
          <ActivityIndicator size="large" color={COLORS.gold} />
        </View>
      ) : (
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={80} color={COLORS.gold} />
            </View>
            <Text style={styles.successTitle}>Payment Successful!</Text>
            <Text style={styles.successMessage}>
              Your payment of ₦{totalAmount.toLocaleString()} has been processed successfully.
            </Text>

            {/* ✅ NEW: Shipping Summary */}
            <View style={styles.shippingCard}>
              <View style={styles.shippingHeader}>
                <Ionicons 
                  name={getShippingIcon(orders[0]?.verificationLevel)} 
                  size={24} 
                  color={COLORS.gold} 
                />
                <Text style={styles.shippingTitle}>
                  {getShippingTitle(orders[0]?.verificationLevel)}
                </Text>
              </View>
              <Text style={styles.shippingDescription}>
                {getShippingDescription(orders[0]?.verificationLevel)}
              </Text>

              {orders[0]?.verificationLevel === 'self-arranged' && (
                <View style={styles.selfArrangedInfo}>
                  <Text style={styles.infoLabel}>📍 Next Steps:</Text>
                  <Text style={styles.infoText}>
                    Contact the seller to arrange pickup or delivery. Once you receive the item, 
                    confirm receipt in your orders to release payment.
                  </Text>
                </View>
              )}

              {orders[0]?.verificationLevel === 'basic' && (
                <View style={styles.basicInfo}>
                  <Text style={styles.infoLabel}>🚚 Delivery Info:</Text>
                  <Text style={styles.infoText}>
                    Your item will be delivered professionally. Payment will be automatically 
                    released to the seller upon delivery confirmation.
                  </Text>
                </View>
              )}

              {orders[0]?.verificationLevel === 'premium' && (
                <View style={styles.premiumInfo}>
                  <Text style={styles.infoLabel}>🔍 Premium Protection:</Text>
                  <Text style={styles.infoText}>
                    You'll have 48 hours after delivery to inspect the item. 
                    Confirm satisfaction to release payment or report any issues.
                  </Text>
                </View>
              )}
            </View>

            {/* ✅ ENHANCED: Payment Summary */}
            <View style={styles.orderSummary}>
              <Text style={styles.summaryTitle}>Payment Summary</Text>

              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Items ({orders.length}):</Text>
                <Text style={styles.summaryValue}>₦{itemsTotal.toLocaleString()}</Text>
              </View>

              {totalServiceFees > 0 && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Service Fee:</Text>
                  <Text style={styles.summaryValue}>₦{totalServiceFees.toLocaleString()}</Text>
                </View>
              )}

              {totalShippingFees > 0 && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Shipping Fee:</Text>
                  <Text style={styles.summaryValue}>₦{totalShippingFees.toLocaleString()}</Text>
                </View>
              )}

              <View style={[styles.summaryItem, styles.totalItem]}>
                <Text style={styles.totalLabel}>Total Paid:</Text>
                <Text style={styles.totalValue}>₦{totalAmount.toLocaleString()}</Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Payment Method:</Text>
                <Text style={styles.summaryValue}>
                  {orders[0]?.paymentMethod === 'hybrid' ? 'Wallet + Card' : 
                   orders[0]?.paymentMethod === 'wallet' ? 'Wallet' : 'Card'}
                </Text>
              </View>

              {orders[0]?.walletPaid > 0 && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>From Wallet:</Text>
                  <Text style={styles.summaryValue}>₦{orders[0].walletPaid.toLocaleString()}</Text>
                </View>
              )}

              {orders[0]?.paystackPaid > 0 && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>From Card:</Text>
                  <Text style={styles.summaryValue}>₦{orders[0].paystackPaid.toLocaleString()}</Text>
                </View>
              )}
            </View>

            {/* ✅ NEW: Order Numbers */}
            <View style={styles.orderNumbers}>
              <Text style={styles.orderNumbersTitle}>Order References</Text>
              {orders.map((order, index) => (
                <View key={order._id} style={styles.orderNumberItem}>
                  <Text style={styles.orderNumberLabel}>Order {index + 1}:</Text>
                  <Text style={styles.orderNumberValue}>{order._id}</Text>
                </View>
              ))}
            </View>

            {/* ✅ NEW: Next Steps */}
            <View style={styles.nextStepsCard}>
              <Text style={styles.nextStepsTitle}>📋 What's Next?</Text>
              
              {orders[0]?.verificationLevel === 'self-arranged' && (
                <>
                  <Text style={styles.stepText}>1. Seller will contact you to arrange pickup/delivery</Text>
                  <Text style={styles.stepText}>2. Meet safely and inspect the item</Text>
                  <Text style={styles.stepText}>3. Confirm receipt in your orders to release payment</Text>
                </>
              )}

              {orders[0]?.verificationLevel === 'basic' && (
                <>
                  <Text style={styles.stepText}>1. Your item will be picked up and shipped</Text>
                  <Text style={styles.stepText}>2. Track delivery progress in your orders</Text>
                  <Text style={styles.stepText}>3. Payment releases automatically upon delivery</Text>
                </>
              )}

              {orders[0]?.verificationLevel === 'premium' && (
                <>
                  <Text style={styles.stepText}>1. Your item will be picked up and shipped</Text>
                  <Text style={styles.stepText}>2. Track delivery progress in your orders</Text>
                  <Text style={styles.stepText}>3. Inspect item within 48hrs after delivery</Text>
                  <Text style={styles.stepText}>4. Confirm satisfaction to release payment</Text>
                </>
              )}
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <Button 
              title="Track Orders" 
              onPress={handleViewOrders} 
              filled 
              style={styles.button} 
            />
            <Button 
              title="Back to Home" 
              onPress={handleBackToHome} 
              filled={false} 
              style={styles.button} 
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: 20,
    marginTop: 40,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 30,
    maxWidth: '90%',
    lineHeight: 22,
  },

  // ✅ NEW: Shipping card styles
  shippingCard: {
    width: '100%',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.gold,
  },
  shippingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  shippingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  shippingDescription: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 15,
    lineHeight: 20,
  },
  selfArrangedInfo: {
    backgroundColor: '#2A2A2A',
    padding: 15,
    borderRadius: 8,
  },
  basicInfo: {
    backgroundColor: '#1A4B3A',
    padding: 15,
    borderRadius: 8,
  },
  premiumInfo: {
    backgroundColor: '#3A2A1A',
    padding: 15,
    borderRadius: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.gold,
    marginBottom: 5,
  },
  infoText: {
    fontSize: 13,
    color: '#CCCCCC',
    lineHeight: 18,
  },

  // ✅ UPDATED: Summary styles
  orderSummary: {
    width: '100%',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#FFFFFF',
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  totalItem: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.gold,
  },

  // ✅ NEW: Order numbers
  orderNumbers: {
    width: '100%',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  orderNumbersTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  orderNumberItem: {
    marginBottom: 5,
  },
  orderNumberLabel: {
    fontSize: 12,
    color: '#CCCCCC',
  },
  orderNumberValue: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: COLORS.gold,
  },

  // ✅ NEW: Next steps
  nextStepsCard: {
    width: '100%',
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  nextStepsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  stepText: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 8,
    paddingLeft: 10,
    lineHeight: 20,
  },

  buttonContainer: {
    width: '100%',
    padding: 20,
    paddingTop: 0,
  },
  button: {
    width: '100%',
    marginBottom: 10,
  },
});

export default PaymentSuccessScreen;