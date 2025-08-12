import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useAppSelector } from '@store/redux/hooks';
import { RootState } from '@store/store';
import COLORS from '@constants/colors';
import { apiClient } from '@config/index'; // ✅ Only need apiClient now
import { navigationAuth } from '@/navigation/NavigationAuth';

const OrdersScreen: React.FC = () => {
  const currentUser = useAppSelector((state: RootState) => state.auth.user);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Check both auth sources
  const isAuthenticated = !!(currentUser?._id || navigationAuth.user?.id);
  const userId = currentUser?._id || navigationAuth.user?.id;

  useEffect(() => {
    console.log('🔍 Orders Screen Auth Check:', {
      reduxUser: !!currentUser?._id,
      navAuthUser: !!navigationAuth.user?.id,
      finalAuth: isAuthenticated,
      userEmail: currentUser?.email || navigationAuth.user?.email
    });

    const fetchOrders = async () => {
      try {
        console.log('🔍 OrdersScreen: Fetching orders...');
        
        console.log('🔍 OrdersScreen: Fetching orders...');
        
        // ✅ Use the simple endpoint now that we added it to the backend
        const response = await apiClient.get('/api/orders');

        console.log('✅ OrdersScreen: Orders fetched successfully');
        
        // Handle different response formats
        const ordersData = response.orders || response.data?.orders || response || [];
        setOrders(ordersData);

      } catch (error: any) {
        console.error('❌ OrdersScreen: Failed to fetch orders:', error);
        
        if (error?.status === 404) {
          // No orders found — not a real error
          console.log('📝 OrdersScreen: No orders found (404)');
          setOrders([]);
        } else if (error?.status === 401) {
          // Authentication error
          Alert.alert(
            'Authentication Error', 
            'Please log in again to view your orders.',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Handle logout if needed
                  navigationAuth.logout();
                }
              }
            ]
          );
        } else {
          // Other errors
          Alert.alert(
            'Error', 
            error?.message || 'Could not fetch your orders. Please try again later.'
          );
        }
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchOrders();
    } else {
      console.log('❌ OrdersScreen: User not authenticated');
      setLoading(false);
    }
  }, [currentUser, isAuthenticated]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.gold} size="large" />
        <Text style={styles.loadingText}>Loading your orders...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>You must be logged in to view your orders.</Text>
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No orders found.</Text>
        <Text style={styles.subtitleText}>
          Your order history will appear here when you make purchases.
        </Text>
      </View>
    );
  }

  const renderOrderItem = ({ item }: { item: any }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderTitle}>{item.product?.title || 'Unknown Product'}</Text>
        <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
          <Text style={[styles.statusText, getStatusTextStyle(item.status)]}>
            {item.status?.toUpperCase() || 'PENDING'}
          </Text>
        </View>
      </View>
      
      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Quantity:</Text>
          <Text style={styles.detailValue}>{item.quantity || 1}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Total Amount:</Text>
          <Text style={styles.detailValue}>₦{(item.totalAmount || 0).toLocaleString()}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Payment Method:</Text>
          <Text style={styles.detailValue}>{item.paymentMethod || 'Unknown'}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Order Date:</Text>
          <Text style={styles.detailValue}>
            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Unknown'}
          </Text>
        </View>
        
        {item.reference && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Reference:</Text>
            <Text style={styles.detailValue}>{item.reference}</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item._id || item.id || Math.random().toString()}
        contentContainerStyle={styles.list}
        renderItem={renderOrderItem}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

// Helper functions for status styling
const getStatusStyle = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'delivered':
      return { backgroundColor: '#E8F5E8' };
    case 'pending':
    case 'processing':
      return { backgroundColor: '#FFF4E6' };
    case 'cancelled':
    case 'failed':
      return { backgroundColor: '#FFEAEA' };
    default:
      return { backgroundColor: '#F0F0F0' };
  }
};

const getStatusTextStyle = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'delivered':
      return { color: '#2E7D32' };
    case 'pending':
    case 'processing':
      return { color: '#F57C00' };
    case 'cancelled':
    case 'failed':
      return { color: '#C62828' };
    default:
      return { color: '#666' };
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  list: {
    padding: 20,
    paddingBottom: 30,
  },
  orderCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#aaa',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#aaa',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 20,
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
});

export default OrdersScreen;