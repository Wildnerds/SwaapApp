// src/components/location/NearbyUserCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PostedItem {
  _id: string;
  title: string;
  price?: number;
  type: 'sale' | 'swap' | 'both';
  category: string;
  images?: string;
  createdAt: string;
}

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
  postedItems: PostedItem[];
  totalPostedItems: number;
}

interface NearbyUserCardProps {
  user: NearbyUser;
  onPress?: (user: NearbyUser) => void;
}

export const NearbyUserCard: React.FC<NearbyUserCardProps> = ({ user, onPress }) => {
  const formatDistance = (distance: number): string => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m away`;
    }
    return `${distance}km away`;
  };

  const getTimeSinceLastSeen = (lastSeen?: string): string => {
    if (!lastSeen) return 'Recently active';
    
    const now = new Date().getTime();
    const lastSeenTime = new Date(lastSeen).getTime();
    const diffMinutes = Math.floor((now - lastSeenTime) / (1000 * 60));
    
    if (diffMinutes < 5) return 'Online';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
  };

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => onPress?.(user)}
      activeOpacity={0.7}
    >
      {/* User Header */}
      <View style={styles.headerContainer}>
        <View style={styles.avatarContainer}>
          {user.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {user.fullName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          
          {user.verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark" size={10} color="#121212" />
            </View>
          )}
        </View>
        
        <View style={styles.userInfoContainer}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{user.fullName}</Text>
            {user.rating > 0 && (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={12} color="#FFC107" />
                <Text style={styles.rating}>{user.rating.toFixed(1)}</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.distance}>{formatDistance(user.distance)}</Text>
          
          {user.location?.city && (
            <Text style={styles.location}>
              📍 {user.location.city}{user.location.state ? `, ${user.location.state}` : ''}
            </Text>
          )}
        </View>
        
        <View style={styles.statusContainer}>
          <Text style={styles.lastSeen}>{getTimeSinceLastSeen(user.lastSeen)}</Text>
          {user.successfulSwaps > 0 && (
            <Text style={styles.swapsCount}>
              {user.successfulSwaps} successful swaps
            </Text>
          )}
        </View>
      </View>

      {/* Posted Items Preview */}
      {user.postedItems && user.postedItems.length > 0 && (
        <View style={styles.itemsContainer}>
          <Text style={styles.itemsTitle}>
            Recent Items ({user.totalPostedItems || user.postedItems.length})
          </Text>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.itemsScrollView}
          >
            {user.postedItems.map((item, index) => (
              <View key={item._id} style={styles.itemCard}>
                {item.images ? (
                  <Image source={{ uri: item.images }} style={styles.itemImage} />
                ) : (
                  <View style={styles.itemImagePlaceholder}>
                    <Ionicons name="image" size={16} color="#666" />
                  </View>
                )}
                
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  
                  <View style={styles.itemDetails}>
                    <View style={[
                      styles.typeBadge,
                      item.type === 'sale' && styles.saleBadge,
                      item.type === 'swap' && styles.swapBadge,
                      item.type === 'both' && styles.bothBadge,
                    ]}>
                      <Text style={styles.typeText}>{item.type.toUpperCase()}</Text>
                    </View>
                    
                    {item.price && (
                      <Text style={styles.itemPrice}>
                        ₦{item.price.toLocaleString()}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  
  // Header Section
  headerContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#333',
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFC107',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#121212',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFC107',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1E1E1E',
  },
  
  // User Info
  userInfoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  rating: {
    fontSize: 12,
    color: '#FFC107',
    marginLeft: 2,
    fontWeight: '600',
  },
  distance: {
    fontSize: 14,
    color: '#999',
    marginBottom: 2,
  },
  location: {
    fontSize: 12,
    color: '#AAAAAA',
  },
  
  // Status
  statusContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  lastSeen: {
    fontSize: 12,
    color: '#4CAF50',
    marginBottom: 4,
    fontWeight: '500',
  },
  swapsCount: {
    fontSize: 11,
    color: '#FFC107',
    textAlign: 'right',
  },
  
  // Posted Items Section
  itemsContainer: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  itemsScrollView: {
    flexGrow: 0,
  },
  itemCard: {
    width: 120,
    marginRight: 12,
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: 80,
    backgroundColor: '#333',
  },
  itemImagePlaceholder: {
    width: '100%',
    height: 80,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    padding: 8,
  },
  itemTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  itemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#444',
  },
  saleBadge: {
    backgroundColor: '#FF4444',
  },
  swapBadge: {
    backgroundColor: '#4CAF50',
  },
  bothBadge: {
    backgroundColor: '#9C27B0',
  },
  typeText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  itemPrice: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFC107',
  },
});