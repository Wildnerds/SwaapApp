import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@config/index';
import COLORS from '@constants/colors';

type OrderListScreenNavigationProp = StackNavigationProp<RootStackParamList, 'OrderListScreen'>;
type OrderListScreenRouteProp = RouteProp<RootStackParamList, 'OrderListScreen'>;

interface Props {
  navigation: OrderListScreenNavigationProp;
  route: OrderListScreenRouteProp;
}

interface Order {
  _id: string;
  reference: string;
  status: string;
  totalAmount: number;
  product: {
    _id: string;
    title: string;
    images: string[];
    price: number;
  };
  createdAt: string;
  paidAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
}

const OrderListScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      console.log('📦 Loading user orders...');
      
      const response = await apiClient.get('/api/orders');
      
      console.log('✅ Orders received:', response);
      
      setOrders(response.orders || []);
      
    } catch (error: any) {
      console.error('❌ Error loading orders:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load orders';
      setError(errorMessage);
      
      if (!isRefresh) {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadOrders(true);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return '#ff9800';
      case 'paid':
        return COLORS.blue;
      case 'processing':
        return COLORS.blue;
      case 'shipped':
        return COLORS.gold;
      case 'delivered':
        return COLORS.green;
      case 'cancelled':
        return COLORS.red;
      default:
        return '#666';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'time-outline';
      case 'paid':
        return 'card-outline';
      case 'processing':
        return 'construct-outline';
      case 'shipped':
        return 'airplane-outline';
      case 'delivered':
        return 'checkmark-circle-outline';
      case 'cancelled':
        return 'close-circle-outline';
      default:
        return 'receipt-outline';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleOrderPress = (order: Order) => {
    navigation.navigate('OrderTrackingScreen', { orderId: order._id });
  };

  const addTestOrder = () => {
    navigation.navigate('OrderTrackingScreen', { orderId: 'test' });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.gold} />
          <Text style={styles.loadingText}>Loading your orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.background} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track Orders</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.gold}
          />
        }
      >
        {orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#666" />
            <Text style={styles.emptyTitle}>No Orders Yet</Text>
            <Text style={styles.emptyDescription}>
              You haven't made any orders yet. When you do, they'll appear here for tracking.
            </Text>
            
            <TouchableOpacity
              style={styles.testButton}
              onPress={addTestOrder}
            >
              <Ionicons name="flask" size={20} color={COLORS.background} />
              <Text style={styles.testButtonText}>View Test Tracking</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {orders.map((order) => (
              <TouchableOpacity
                key={order._id}
                style={styles.orderCard}
                onPress={() => handleOrderPress(order)}
              >
                <View style={styles.orderHeader}>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderReference}>
                      Order #{order.reference || order._id.slice(-8)}
                    </Text>
                    <Text style={styles.orderDate}>
                      {formatDate(order.createdAt)}
                    </Text>
                  </View>
                  
                  <View style={styles.statusContainer}>
                    <Ionicons 
                      name={getStatusIcon(order.status)} 
                      size={16} 
                      color={getStatusColor(order.status)} 
                    />
                    <Text style={[
                      styles.orderStatus,
                      { color: getStatusColor(order.status) }
                    ]}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Text>
                  </View>
                </View>

                <View style={styles.orderBody}>
                  {order.product?.images?.[0] && (
                    <Image
                      source={{ uri: order.product.images[0] }}
                      style={styles.productImage}
                    />
                  )}
                  
                  <View style={styles.productInfo}>
                    <Text style={styles.productTitle} numberOfLines={2}>
                      {order.product?.title || 'Product'}
                    </Text>
                    <Text style={styles.orderTotal}>
                      Total: ₦{order.totalAmount?.toLocaleString()}
                    </Text>
                  </View>
                  
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </View>

                <View style={styles.trackingHint}>
                  <Ionicons name="location-outline" size={14} color={COLORS.gold} />
                  <Text style={styles.trackingHintText}>Tap to track this order</Text>
                </View>
              </TouchableOpacity>
            ))}

            {orders.length > 0 && (
              <TouchableOpacity
                style={styles.testOrderButton}
                onPress={addTestOrder}
              >
                <Ionicons name="flask" size={16} color="#ff6b35" />
                <Text style={styles.testOrderButtonText}>View Test Tracking Demo</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.darkbackground,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.darkbackground,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.background,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.background,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 32,
  },
  testButton: {
    backgroundColor: '#ff6b35',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  testButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  orderCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderReference: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.background,
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: '#aaa',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  orderStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  orderBody: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: 14,
    color: COLORS.background,
    marginBottom: 4,
  },
  orderTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.gold,
  },
  trackingHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  trackingHintText: {
    fontSize: 12,
    color: COLORS.gold,
    marginLeft: 4,
  },
  testOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  testOrderButtonText: {
    color: '#ff6b35',
    fontSize: 14,
    marginLeft: 8,
  },
});

export default OrderListScreen;