import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@config/index';
import COLORS from '@constants/colors';

const { width: screenWidth } = Dimensions.get('window');

interface DisputeStats {
  totalDisputes: number;
  resolvedDisputes: number;
  resolutionRate: number;
  activeDisputes: number;
  averageResolutionTime: number;
}

interface AdminDispute {
  _id: string;
  disputeId: string;
  category: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  complainant: {
    fullName: string;
    email: string;
    trustScore: number;
  };
  respondent: {
    fullName: string;
    email: string;
    trustScore: number;
  };
  orderId: {
    orderNumber: string;
    totalAmount: number;
  };
  assignedArbitrator?: {
    fullName: string;
    email: string;
  };
}

const STATUS_COLORS = {
  'open': '#FF9500',
  'under_review': '#007AFF',
  'awaiting_response': '#FF6B6B',
  'in_mediation': '#4ECDC4',
  'escalated': '#9B59B6',
  'resolved': '#2ECC71',
  'closed': '#95A5A6'
};

const PRIORITY_COLORS = {
  'low': '#95A5A6',
  'medium': '#F39C12',
  'high': '#E74C3C',
  'urgent': '#C0392B'
};

export default function AdminDisputeDashboard() {
  const navigation = useNavigation();
  
  const [stats, setStats] = useState<DisputeStats | null>(null);
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [timeframe, setTimeframe] = useState('30d');

  // Fetch dashboard data
  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [analyticsResponse, disputesResponse] = await Promise.all([
        apiClient.get(`/api/disputes/admin/analytics/summary?timeframe=${timeframe}`),
        apiClient.get(`/api/disputes/admin/all?status=${selectedFilter === 'all' ? '' : selectedFilter}&limit=50`)
      ]);

      if (analyticsResponse.success) {
        setStats(analyticsResponse.analytics.summary);
      }

      if (disputesResponse.success) {
        setDisputes(disputesResponse.disputes);
      }

    } catch (error: any) {
      console.error('Fetch dashboard data error:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedFilter, timeframe]);

  const onRefresh = () => {
    fetchDashboardData(true);
  };

  // Quick actions
  const handleQuickAction = (action: string, disputeId?: string) => {
    switch (action) {
      case 'assign_arbitrator':
        if (disputeId) {
          navigation.navigate('AssignArbitrator', { disputeId });
        }
        break;
      case 'bulk_update':
        navigation.navigate('BulkUpdateDisputes');
        break;
      case 'export_report':
        handleExportReport();
        break;
      case 'create_arbitrator':
        navigation.navigate('CreateArbitrator');
        break;
    }
  };

  const handleExportReport = async () => {
    try {
      Alert.alert('Export Report', 'Generating dispute analytics report...');
      // Implementation for exporting reports
    } catch (error) {
      Alert.alert('Error', 'Failed to export report');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const renderStatsCard = (title: string, value: string | number, icon: string, color: string, subtitle?: string) => (
    <View style={[styles.statsCard, { borderLeftColor: color }]}>
      <View style={styles.statsHeader}>
        <Ionicons name={icon as any} size={24} color={color} />
        <Text style={styles.statsTitle}>{title}</Text>
      </View>
      <Text style={[styles.statsValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.statsSubtitle}>{subtitle}</Text>}
    </View>
  );

  const renderDisputeItem = ({ item }: { item: AdminDispute }) => (
    <TouchableOpacity
      style={styles.disputeCard}
      onPress={() => navigation.navigate('AdminDisputeDetails', { disputeId: item.disputeId })}
    >
      {/* Header */}
      <View style={styles.disputeHeader}>
        <View style={styles.disputeIdRow}>
          <Text style={styles.disputeId}>#{item.disputeId}</Text>
          <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLORS[item.priority] + '30' }]}>
            <Text style={[styles.priorityText, { color: PRIORITY_COLORS[item.priority] }]}>
              {item.priority.toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={styles.disputeDate}>{formatDate(item.createdAt)}</Text>
      </View>

      {/* Status */}
      <View style={styles.statusRow}>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '20' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
            {item.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
        <Text style={styles.categoryText}>{item.category.replace('_', ' ')}</Text>
      </View>

      {/* Subject */}
      <Text style={styles.subjectText} numberOfLines={2}>{item.subject}</Text>

      {/* Order Info */}
      <View style={styles.orderRow}>
        <Text style={styles.orderText}>
          Order #{item.orderId.orderNumber} • ₦{item.orderId.totalAmount.toLocaleString()}
        </Text>
      </View>

      {/* Parties */}
      <View style={styles.partiesRow}>
        <View style={styles.partyInfo}>
          <Text style={styles.partyLabel}>Complainant:</Text>
          <Text style={styles.partyName}>{item.complainant.fullName}</Text>
          <Text style={styles.trustScore}>Trust: {item.complainant.trustScore}</Text>
        </View>
        <View style={styles.partyInfo}>
          <Text style={styles.partyLabel}>Respondent:</Text>
          <Text style={styles.partyName}>{item.respondent.fullName}</Text>
          <Text style={styles.trustScore}>Trust: {item.respondent.trustScore}</Text>
        </View>
      </View>

      {/* Arbitrator */}
      {item.assignedArbitrator ? (
        <View style={styles.arbitratorRow}>
          <Ionicons name="person-outline" size={14} color={COLORS.gold} />
          <Text style={styles.arbitratorText}>
            Assigned to: {item.assignedArbitrator.fullName}
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.assignButton}
          onPress={() => handleQuickAction('assign_arbitrator', item.disputeId)}
        >
          <Ionicons name="person-add-outline" size={14} color={COLORS.gold} />
          <Text style={styles.assignButtonText}>Assign Arbitrator</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  const renderFilterButton = (filter: string, label: string) => (
    <TouchableOpacity
      key={filter}
      style={[
        styles.filterButton,
        selectedFilter === filter && styles.activeFilterButton
      ]}
      onPress={() => setSelectedFilter(filter)}
    >
      <Text style={[
        styles.filterButtonText,
        selectedFilter === filter && styles.activeFilterButtonText
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.gold} />
        <Text style={styles.loadingText}>Loading dispute dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dispute Management</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => handleQuickAction('bulk_update')}
          >
            <Ionicons name="layers-outline" size={20} color={COLORS.gold} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => handleQuickAction('export_report')}
          >
            <Ionicons name="download-outline" size={20} color={COLORS.gold} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          {['7d', '30d', '90d'].map(range => (
            <TouchableOpacity
              key={range}
              style={[
                styles.timeRangeButton,
                timeframe === range && styles.activeTimeRangeButton
              ]}
              onPress={() => setTimeframe(range)}
            >
              <Text style={[
                styles.timeRangeText,
                timeframe === range && styles.activeTimeRangeText
              ]}>
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Cards */}
        {stats && (
          <View style={styles.statsContainer}>
            {renderStatsCard('Total Disputes', stats.totalDisputes, 'document-text-outline', '#007AFF')}
            {renderStatsCard('Active Cases', stats.activeDisputes, 'time-outline', '#FF9500')}
            {renderStatsCard('Resolution Rate', `${stats.resolutionRate}%`, 'checkmark-circle-outline', '#2ECC71')}
            {renderStatsCard('Avg Resolution', `${stats.averageResolutionTime.toFixed(1)}h`, 'speedometer-outline', '#9B59B6')}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => handleQuickAction('create_arbitrator')}
            >
              <Ionicons name="person-add-outline" size={24} color={COLORS.gold} />
              <Text style={styles.quickActionText}>Add Arbitrator</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => handleQuickAction('bulk_update')}
            >
              <Ionicons name="layers-outline" size={24} color={COLORS.gold} />
              <Text style={styles.quickActionText}>Bulk Actions</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('DisputeAnalytics')}
            >
              <Ionicons name="analytics-outline" size={24} color={COLORS.gold} />
              <Text style={styles.quickActionText}>Analytics</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('ArbitratorManagement')}
            >
              <Ionicons name="people-outline" size={24} color={COLORS.gold} />
              <Text style={styles.quickActionText}>Arbitrators</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Buttons */}
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filtersRow}>
              {renderFilterButton('all', 'All Disputes')}
              {renderFilterButton('open', 'Open')}
              {renderFilterButton('under_review', 'Under Review')}
              {renderFilterButton('in_mediation', 'In Mediation')}
              {renderFilterButton('escalated', 'Escalated')}
              {renderFilterButton('resolved', 'Resolved')}
            </View>
          </ScrollView>
        </View>

        {/* Recent Disputes */}
        <View style={styles.disputesContainer}>
          <Text style={styles.sectionTitle}>
            {selectedFilter === 'all' ? 'Recent Disputes' : `${selectedFilter.replace('_', ' ')} Disputes`}
          </Text>
          
          <FlatList
            data={disputes}
            keyExtractor={(item) => item._id}
            renderItem={renderDisputeItem}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="document-outline" size={48} color="#666" />
                <Text style={styles.emptyStateText}>No disputes found</Text>
              </View>
            }
          />
        </View>
      </ScrollView>
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
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 8,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  timeRangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
  },
  activeTimeRangeButton: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
  },
  timeRangeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  activeTimeRangeText: {
    color: '#121212',
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  statsCard: {
    flex: 1,
    minWidth: (screenWidth - 48) / 2,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderColor: '#333',
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statsTitle: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 8,
  },
  statsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statsSubtitle: {
    color: '#666',
    fontSize: 11,
  },
  quickActionsContainer: {
    padding: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    minWidth: (screenWidth - 48) / 2,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  quickActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  filtersContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    fontSize: 12,
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: '#121212',
    fontWeight: 'bold',
  },
  disputesContainer: {
    padding: 16,
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
    marginBottom: 8,
  },
  disputeIdRow: {
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
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  priorityText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  disputeDate: {
    color: '#666',
    fontSize: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  categoryText: {
    color: '#4ECDC4',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  subjectText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    lineHeight: 20,
  },
  orderRow: {
    marginBottom: 8,
  },
  orderText: {
    color: '#666',
    fontSize: 12,
  },
  partiesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  partyInfo: {
    flex: 1,
  },
  partyLabel: {
    color: '#666',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  partyName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  trustScore: {
    color: COLORS.gold,
    fontSize: 10,
  },
  arbitratorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arbitratorText: {
    color: '#ccc',
    fontSize: 11,
    marginLeft: 6,
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  assignButtonText: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    color: '#666',
    fontSize: 14,
    marginTop: 12,
  },
});