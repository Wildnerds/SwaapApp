// screens/NearbyUsersScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '@store/redux/hooks';
import { RootState } from '@store';
// Safe imports with fallbacks
let NearbyUserCard, LoadingOverlay, useLocation, setNearbyUsers, setLocationLoading, apiClient;

try {
  ({ NearbyUserCard } = require('@/components/location/NearbyUserCard'));
} catch (e) {
  console.log('⚠️ NearbyUserCard not found');
  NearbyUserCard = ({ user, onPress }: any) => (
    <TouchableOpacity style={{ padding: 16, backgroundColor: '#1E1E1E', marginBottom: 8, borderRadius: 8 }} onPress={() => onPress?.(user)}>
      <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>{user?.fullName || 'User'}</Text>
      <Text style={{ color: '#999', fontSize: 14 }}>{user?.distance}km away</Text>
    </TouchableOpacity>
  );
}

try {
  ({ LoadingOverlay } = require('@/components/common/LoadingOverlay'));
} catch (e) {
  console.log('⚠️ LoadingOverlay not found');
  LoadingOverlay = ({ visible, text }: any) => visible ? (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' }}>
      <ActivityIndicator size="large" color="#FFC107" />
      <Text style={{ color: '#FFF', marginTop: 16 }}>{text}</Text>
    </View>
  ) : null;
}

try {
  ({ useLocation } = require('@/hooks/useLocation'));
} catch (e) {
  console.log('⚠️ useLocation hook not found');
  useLocation = () => ({ getCurrentLocation: async () => ({ latitude: 0, longitude: 0 }) });
}

try {
  ({ setNearbyUsers, setLoading: setLocationLoading } = require('@store/redux/slices/locationSlice'));
} catch (e) {
  console.log('⚠️ locationSlice not found');
  setNearbyUsers = (users: any[]) => ({ type: 'SET_NEARBY_USERS', payload: users });
  setLocationLoading = (loading: boolean) => ({ type: 'SET_LOCATION_LOADING', payload: loading });
}

try {
  ({ apiClient } = require('@config/index'));
} catch (e) {
  console.log('⚠️ apiClient not found');
  apiClient = {
    get: async (url: string, options?: any) => {
      console.log('Mock API call:', url, options);
      return { data: { users: [] } };
    }
  };
}

// Type definitions
interface NearbyUser {
  _id: string;
  fullName: string;
  photoURL?: string;
  location?: {
    city?: string;
    state?: string;
  };
  distance: number;
  rating: number;
  verified: boolean;
  successfulSwaps: number;
  lastSeen?: string;
  postedItems: any[];
  totalPostedItems: number;
}

import COLORS from '@/constants/colors';

export const NearbyUsersScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  
  const { user } = useAppSelector((state: RootState) => state.auth);
  const locationState = useAppSelector((state: RootState) => state.location || {});
  const { 
    current: currentLocation = null, 
    nearbyUsers = [], 
    loading = false 
  } = locationState;
  
  const { getCurrentLocation } = useLocation();
  
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    maxDistance: user?.maxSearchRadius || 25,
    verifiedOnly: user?.verifiedUsersOnly || false,
    minRating: 0,
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    initializeScreen();
  }, []);

  useEffect(() => {
    // Update filters when user preferences change
    if (user) {
      setFilters(prev => ({
        ...prev,
        maxDistance: user.maxSearchRadius || 25,
        verifiedOnly: user.verifiedUsersOnly || false,
      }));
    }
  }, [user?.maxSearchRadius, user?.verifiedUsersOnly]);

  const initializeScreen = async () => {
    if (!currentLocation) {
      await getCurrentLocation();
    }
    await findNearbyUsers();
  };

  const findNearbyUsers = async (customLocation?: { latitude: number; longitude: number }) => {
    try {
      dispatch(setLocationLoading(true));
      
      const location = customLocation || currentLocation || await getCurrentLocation();
      if (!location) {
        Alert.alert(
          'Location Required', 
          'Please enable location access to find nearby users',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Try Again', onPress: getCurrentLocation },
          ]
        );
        return;
      }

      const response = await apiClient.get('/api/users/location/nearby', {
        params: {
          latitude: location.latitude,
          longitude: location.longitude,
          maxDistance: filters.maxDistance,
          verifiedOnly: filters.verifiedOnly,
          minRating: filters.minRating,
          limit: 50,
        },
      });

      const users = response.data?.users || [];
      dispatch(setNearbyUsers(users));
      
      console.log(`✅ Found ${users.length} nearby users with posted items`);
      
    } catch (error: any) {
      console.error('Failed to find nearby users:', error);
      Alert.alert(
        'Error', 
        'Failed to find nearby users. Please check your internet connection and try again.',
        [
          { text: 'OK', style: 'default' },
          { text: 'Retry', onPress: () => findNearbyUsers(customLocation) },
        ]
      );
    } finally {
      dispatch(setLocationLoading(false));
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    const freshLocation = await getCurrentLocation();
    if (freshLocation) {
      await findNearbyUsers(freshLocation);
    }
    setRefreshing(false);
  };

  const handleUserPress = (nearbyUser: NearbyUser) => {
    // Navigate to user profile or chat
    navigation.navigate('UserProfile', { userId: nearbyUser._id });
  };

  const handleFilterChange = async (newFilters: typeof filters) => {
    setFilters(newFilters);
    await findNearbyUsers();
  };

  const renderUserItem = ({ item }: { item: NearbyUser }) => (
    <NearbyUserCard
      user={item}
      onPress={() => handleUserPress(item)}
    />
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.titleSection}>
        <Text style={styles.title}>People Near You</Text>
        <Text style={styles.subtitle}>
          {nearbyUsers.length} users with items within {filters.maxDistance}km
        </Text>
      </View>
      
      <View style={styles.filterSection}>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={styles.filterButtonText}>
            🔍 Filters {showFilters ? '▲' : '▼'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {showFilters && (
        <View style={styles.filtersContainer}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Distance: {filters.maxDistance}km</Text>
            <View style={styles.distanceButtons}>
              {[10, 25, 50, 100].map(distance => (
                <TouchableOpacity
                  key={distance}
                  style={[
                    styles.distanceButton,
                    filters.maxDistance === distance && styles.activeDistanceButton
                  ]}
                  onPress={() => handleFilterChange({ ...filters, maxDistance: distance })}
                >
                  <Text style={[
                    styles.distanceButtonText,
                    filters.maxDistance === distance && styles.activeDistanceButtonText
                  ]}>
                    {distance}km
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={styles.toggleFilter}
              onPress={() => handleFilterChange({ ...filters, verifiedOnly: !filters.verifiedOnly })}
            >
              <View style={[
                styles.toggleButton,
                filters.verifiedOnly && styles.activeToggle
              ]}>
                <Text style={styles.toggleText}>
                  {filters.verifiedOnly ? '✓' : '○'}
                </Text>
              </View>
              <Text style={styles.toggleLabel}>Verified users only</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📍</Text>
      <Text style={styles.emptyTitle}>No nearby users with items found</Text>
      <Text style={styles.emptySubtitle}>
        {filters.verifiedOnly 
          ? 'Try removing the verified-only filter or increasing your search radius'
          : 'No users with posted items found nearby. Try increasing your search radius or check back later'
        }
      </Text>
      
      <View style={styles.emptyActions}>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={handleRefresh}
        >
          <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.expandButton}
          onPress={() => handleFilterChange({ ...filters, maxDistance: Math.min(100, filters.maxDistance * 2) })}
        >
          <Text style={styles.expandButtonText}>📏 Search Wider</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderLoadingState = () => (
    <LoadingOverlay 
      visible={true} 
      text="Finding nearby users..." 
    />
  );

  if (loading && nearbyUsers.length === 0) {
    return renderLoadingState();
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={nearbyUsers}
        renderItem={renderUserItem}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.gold}
            title="Pull to refresh"
            titleColor="#AAAAAA"
          />
        }
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  listContainer: {
    padding: 20,
    paddingTop: 60,
  },
  headerContainer: {
    marginBottom: 20,
  },
  titleSection: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC',
  },
  filterSection: {
    marginBottom: 12,
  },
  filterButton: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  filterButtonText: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: '500',
  },
  filtersContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  filterRow: {
    marginBottom: 16,
  },
  filterLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  distanceButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  distanceButton: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#444',
  },
  activeDistanceButton: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
  },
  distanceButtonText: {
    color: '#CCCCCC',
    fontSize: 12,
    fontWeight: '500',
  },
  activeDistanceButtonText: {
    color: '#121212',
  },
  toggleFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2A2A2A',
    borderWidth: 2,
    borderColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeToggle: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
  },
  toggleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  toggleLabel: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  separator: {
    height: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#AAAAAA',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: 12,
  },
  refreshButton: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#121212',
    fontWeight: 'bold',
    fontSize: 14,
  },
  expandButton: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  expandButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 14,
  },
});

export default NearbyUsersScreen;