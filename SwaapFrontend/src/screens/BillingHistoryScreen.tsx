import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { apiClient } from '@config/index'; // ✅ Use configured apiClient
import { FontAwesome5 } from '@expo/vector-icons';

const BillingHistoryScreen = () => {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const filters = ['All', 'Paid', 'Failed'];

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    if (statusFilter === 'All') {
      setFiltered(history);
    } else {
      setFiltered(history.filter(item => item.status === statusFilter.toLowerCase()));
    }
  }, [statusFilter, history]);

  // ✅ FIXED: Use apiClient and correct endpoint
  const fetchHistory = async () => {
    try {
      console.log('🔍 BillingHistoryScreen: Fetching billing history, page:', page);
      
      // ✅ Use apiClient with correct endpoint and /api prefix
      const data = await apiClient.get(`/api/pay/billing-history?page=${page}`);

      console.log('✅ BillingHistoryScreen: Billing history fetched successfully');

      // Handle different response formats
      const historyData = data.history || data.data?.history || data || [];
      
      const filteredData = historyData.filter(item =>
        ['pro_upgrade', 'paystack', 'subscription', 'wallet_topup', 'purchase'].includes(item.type)
      );

      console.log('✅ BillingHistoryScreen: Filtered', filteredData.length, 'billing items');

      if (page === 1) {
        setHistory(filteredData);
      } else {
        setHistory(prev => [...prev, ...filteredData]);
      }

      // Check if there are more pages
      setHasMore(filteredData.length > 0);
      
    } catch (err: any) {
      console.error('❌ BillingHistoryScreen: Error fetching billing history:', err);
      
      let errorMessage = 'Failed to load billing history.';
      
      if (err?.status === 404) {
        errorMessage = 'Billing history feature is not available yet.';
      } else if (err?.status === 401) {
        errorMessage = 'Please log in again to view billing history.';
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      // Only show error on first page load
      if (page === 1) {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ ENHANCED: Refresh function
  const handleRefresh = async () => {
    setLoading(true);
    setPage(1);
    setHistory([]);
    await fetchHistory();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'success':
      case 'completed':
        return '#32CD32';
      case 'failed':
      case 'error':
      case 'cancelled':
        return '#FF4500';
      case 'pending':
      case 'processing':
        return '#FFD700';
      default:
        return '#999';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'subscription':
        return 'receipt';
      case 'pro_upgrade':
        return 'gem';
      case 'paystack':
      case 'card':
        return 'credit-card';
      case 'wallet_topup':
      case 'wallet':
        return 'wallet';
      case 'purchase':
        return 'shopping-cart';
      default:
        return 'file-invoice';
    }
  };

  const getTypeDisplayName = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'pro_upgrade':
        return 'Pro Upgrade';
      case 'wallet_topup':
        return 'Wallet Top-up';
      case 'subscription':
        return 'Subscription';
      case 'paystack':
        return 'Payment';
      case 'purchase':
        return 'Purchase';
      default:
        return type?.charAt(0).toUpperCase() + type?.slice(1) || 'Transaction';
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.item}>
      <View style={styles.header}>
        <View style={styles.row}>
          <FontAwesome5
            name={getTypeIcon(item.type)}
            size={20}
            color="#FFD700"
            style={{ marginRight: 10 }}
          />
          <Text style={styles.type}>{getTypeDisplayName(item.type)}</Text>
        </View>
        
        <Text style={styles.amount}>₦{Number(item.amount || 0).toLocaleString()}</Text>
      </View>

      <View style={styles.details}>
        <Text style={styles.date}>{formatDate(item.date || item.createdAt)}</Text>
        
        <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
          ● {(item.status || 'Unknown').charAt(0).toUpperCase() + (item.status || 'unknown').slice(1)}
        </Text>
      </View>

      {item.reference && (
        <Text style={styles.reference}>Ref: {item.reference}</Text>
      )}
    </View>
  );

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
      setLoading(true);
    }
  };

  // Effect to fetch more data when page changes
  useEffect(() => {
    if (page > 1) {
      fetchHistory();
    }
  }, [page]);

  if (loading && page === 1) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Loading billing history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Billing History</Text>

      {/* Filters */}
      <View style={styles.filterRow}>
        {filters.map(f => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterBtn,
              statusFilter === f && { backgroundColor: '#FFD700' },
            ]}
            onPress={() => setStatusFilter(f)}
          >
            <Text
              style={[
                styles.filterText,
                statusFilter === f && { color: '#000' },
              ]}
            >
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome5 name="receipt" size={60} color="#333" />
          <Text style={styles.empty}>No billing records yet</Text>
          <Text style={styles.emptySubtext}>
            Your payment history will appear here
          </Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, index) => item._id || item.id || index.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 30 }}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1}
          ListFooterComponent={
            loading && page > 1 ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator color="#FFD700" />
                <Text style={styles.loadingMoreText}>Loading more...</Text>
              </View>
            ) : hasMore ? (
              <TouchableOpacity style={styles.loadMore} onPress={handleLoadMore}>
                <Text style={styles.loadMoreText}>Load More</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0d0d0d',
  },
  loadingText: {
    color: '#FFD700',
    marginTop: 10,
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 20,
    textAlign: 'center',
  },
  item: {
    backgroundColor: '#1a1a1a',
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
    flex: 1,
  },
  type: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  amount: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  date: {
    color: '#999',
    fontSize: 14,
  },
  status: {
    fontSize: 14,
    fontWeight: '500',
  },
  reference: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  filterBtn: {
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  filterText: {
    color: '#FFD700',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  empty: {
    color: '#777',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#555',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 8,
  },
  refreshBtn: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 20,
  },
  refreshText: {
    color: '#000',
    fontWeight: 'bold',
  },
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingMoreText: {
    color: '#FFD700',
    marginLeft: 10,
  },
  loadMore: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 15,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  loadMoreText: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
});

export default BillingHistoryScreen;