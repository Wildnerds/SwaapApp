import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@config/index';
import COLORS from '@constants/colors';

interface Dispute {
  _id: string;
  disputeId: string;
  category: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  complainant: {
    _id: string;
    fullName: string;
    profileImage?: string;
  };
  respondent: {
    _id: string;
    fullName: string;
    profileImage?: string;
  };
  orderId: {
    _id: string;
    orderNumber: string;
    totalAmount: number;
  };
  messages: any[];
}

const STATUS_CONFIG = {
  'open': { 
    color: '#FF9500', 
    icon: 'time-outline', 
    label: 'Open',
    description: 'Recently filed'
  },
  'under_review': { 
    color: '#007AFF', 
    icon: 'search-outline', 
    label: 'Under Review',
    description: 'Being reviewed by our team'
  },
  'awaiting_response': { 
    color: '#FF6B6B', 
    icon: 'mail-outline', 
    label: 'Awaiting Response',
    description: 'Waiting for other party'
  },
  'in_mediation': { 
    color: '#4ECDC4', 
    icon: 'people-outline', 
    label: 'In Mediation',
    description: 'Active discussion'
  },
  'escalated': { 
    color: '#9B59B6', 
    icon: 'trending-up-outline', 
    label: 'Escalated',
    description: 'Assigned to arbitrator'
  },
  'resolved': { 
    color: '#2ECC71', 
    icon: 'checkmark-circle-outline', 
    label: 'Resolved',
    description: 'Successfully resolved'
  },
  'closed': { 
    color: '#95A5A6', 
    icon: 'close-circle-outline', 
    label: 'Closed',
    description: 'Case closed'
  }
};

const PRIORITY_CONFIG = {
  'low': { color: '#95A5A6', icon: 'arrow-down' },
  'medium': { color: '#F39C12', icon: 'remove' },
  'high': { color: '#E74C3C', icon: 'arrow-up' },
  'urgent': { color: '#C0392B', icon: 'warning' }
};

const FILTER_OPTIONS = [
  { key: 'all', label: 'All Disputes' },
  { key: 'open', label: 'Open' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'in_mediation', label: 'In Mediation' },
  { key: 'escalated', label: 'Escalated' },
  { key: 'resolved', label: 'Resolved' }
];

export default function DisputesListScreen() {
  const navigation = useNavigation();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [unreadCounts, setUnreadCounts] = useState<{[key: string]: number}>({});

  // Fetch disputes
  const fetchDisputes = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const params = new URLSearchParams();
      if (selectedFilter !== 'all') {
        params.append('status', selectedFilter);
      }

      const response = await apiClient.get(`/api/disputes/my-disputes?${params.toString()}`);
      
      if (response.success) {
        setDisputes(response.disputes);
        
        // Calculate unread message counts
        const counts: {[key: string]: number} = {};
        response.disputes.forEach((dispute: Dispute) => {
          const unreadCount = dispute.messages?.filter((msg: any) => 
            !msg.readBy?.some((read: any) => read.user === 'current_user_id') // Replace with actual user ID
          ).length || 0;
          counts[dispute._id] = unreadCount;
        });
        setUnreadCounts(counts);
      } else {
        throw new Error(response.error);
      }
    } catch (error: any) {
      console.error('Fetch disputes error:', error);
      Alert.alert('Error', 'Failed to load disputes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDisputes();
    }, [selectedFilter])
  );

  const onRefresh = () => {
    fetchDisputes(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));

    if (diffDays === 0) {
      if (diffHours === 0) return 'Just now';
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getCategoryDisplayName = (category: string) => {
    const categoryMap: {[key: string]: string} = {
      'item_not_received': 'Item Not Received',
      'item_damaged': 'Item Damaged',
      'item_not_as_described': 'Not As Described',
      'payment_not_received': 'Payment Issues',
      'swap_item_mismatch': 'Swap Mismatch',
      'delivery_issues': 'Delivery Issues',
      'communication_issues': 'Communication',
      'fraud_suspected': 'Fraud Suspected',
      'other': 'Other'
    };
    return categoryMap[category] || category;
  };

  const renderDisputeItem = ({ item }: { item: Dispute }) => {
    const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG['open'];
    const priorityConfig = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG['medium'];
    const unreadCount = unreadCounts[item._id] || 0;

    return (
      <TouchableOpacity
        style={styles.disputeCard}
        onPress={() => navigation.navigate('DisputeDetails', { disputeId: item.disputeId })}
      >
        {/* Header */}
        <View style={styles.disputeHeader}>
          <View style={styles.disputeIdContainer}>
            <Text style={styles.disputeId}>#{item.disputeId}</Text>
            <View style={[styles.priorityBadge, { backgroundColor: `${priorityConfig.color}20` }]}>
              <Ionicons name={priorityConfig.icon as any} size={10} color={priorityConfig.color} />
              <Text style={[styles.priorityText, { color: priorityConfig.color }]}>
                {item.priority.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.disputeDate}>{formatDate(item.createdAt)}</Text>
        </View>

        {/* Status */}
        <View style={styles.statusContainer}>
          <Ionicons name={statusConfig.icon as any} size={16} color={statusConfig.color} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
          <Text style={styles.statusDescription}>• {statusConfig.description}</Text>
        </View>

        {/* Category and Subject */}
        <Text style={styles.category}>{getCategoryDisplayName(item.category)}</Text>
        <Text style={styles.subject} numberOfLines={2}>{item.subject}</Text>

        {/* Order Info */}
        <View style={styles.orderInfo}>
          <Ionicons name="receipt-outline" size={14} color="#666" />
          <Text style={styles.orderText}>
            Order #{item.orderId.orderNumber} • ₦{item.orderId.totalAmount.toLocaleString()}
          </Text>
        </View>

        {/* Parties */}
        <View style={styles.partiesInfo}>
          <Text style={styles.partiesText}>
            You ↔ {item.complainant._id === 'current_user_id' ? item.respondent.fullName : item.complainant.fullName}
          </Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unreadCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderFilterButton = (filter: { key: string; label: string }) => (
    <TouchableOpacity
      key={filter.key}
      style={[
        styles.filterButton,
        selectedFilter === filter.key && styles.activeFilterButton
      ]}
      onPress={() => setSelectedFilter(filter.key)}
    >
      <Text style={[
        styles.filterButtonText,
        selectedFilter === filter.key && styles.activeFilterButtonText
      ]}>
        {filter.label}
      </Text>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="document-outline" size={64} color="#666" />
      <Text style={styles.emptyStateTitle}>No Disputes Found</Text>
      <Text style={styles.emptyStateText}>
        {selectedFilter === 'all' 
          ? "You haven't filed any disputes yet"
          : `No disputes with status: ${selectedFilter}`
        }
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.gold} />
        <Text style={styles.loadingText}>Loading disputes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.gold} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Disputes</Text>
        <TouchableOpacity 
          onPress={() => navigation.navigate('DisputeHelp')}
          style={styles.helpButton}
        >
          <Ionicons name="help-circle-outline" size={24} color={COLORS.gold} />
        </TouchableOpacity>
      </View>

      {/* Filter Buttons */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContentContainer}
      >
        {FILTER_OPTIONS.map(renderFilterButton)}
      </ScrollView>

      {/* Disputes List */}
      <FlatList
        data={disputes}
        keyExtractor={(item) => item._id}
        renderItem={renderDisputeItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.gold}
          />
        }
        contentContainerStyle={[
          styles.listContainer,
          disputes.length === 0 && styles.emptyListContainer
        ]}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  loadingText: {
    color: '#666',
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  helpButton: {
    padding: 8,
  },
  filterContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  filterContentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
  },
  activeFilterButton: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: '#121212',
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  disputeCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  disputeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  disputeIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  disputeId: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 8,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 2,
  },
  priorityText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  disputeDate: {
    color: '#666',
    fontSize: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  statusDescription: {
    color: '#666',
    fontSize: 12,
    marginLeft: 4,
  },
  category: {
    color: '#4ECDC4',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  subject: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
    marginBottom: 12,
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderText: {
    color: '#666',
    fontSize: 12,
    marginLeft: 6,
  },
  partiesInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  partiesText: {
    color: '#ccc',
    fontSize: 12,
  },
  unreadBadge: {
    backgroundColor: COLORS.gold,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#121212',
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});