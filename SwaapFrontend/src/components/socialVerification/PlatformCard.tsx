import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import COLORS from '@/constants/colors';

interface Platform {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface SocialVerification {
  platform: string;
  username: string;
  status: 'pending' | 'verified' | 'failed';
}

interface PlatformCardProps {
  platform: Platform;
  verification?: SocialVerification;
  onPress: (platformId: string, platformName: string) => void;
}

export const PlatformCard: React.FC<PlatformCardProps> = ({ 
  platform, 
  verification, 
  onPress 
}) => {
  const status = verification?.status || 'not_started';
  
  const getStatusBadge = () => {
    switch (status) {
      case 'verified':
        return (
          <View style={[styles.statusBadge, styles.verifiedBadge]}>
            <Text style={styles.verifiedText}>✓ Verified</Text>
          </View>
        );
      case 'pending':
        return (
          <View style={[styles.statusBadge, styles.pendingBadge]}>
            <Text style={styles.pendingText}>⏳ Pending</Text>
          </View>
        );
      case 'failed':
        return (
          <View style={[styles.statusBadge, styles.failedBadge]}>
            <Text style={styles.failedText}>❌ Failed</Text>
          </View>
        );
      default:
        return (
          <View style={styles.pointsBadge}>
            <Text style={styles.pointsText}>+20 pts</Text>
          </View>
        );
    }
  };

  const getDescription = () => {
    switch (status) {
      case 'verified':
        return `@${verification?.username} - Verified`;
      case 'pending':
        return `@${verification?.username} - Verification pending`;
      default:
        return `Verify your ${platform.name} account`;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.platformCard,
        status === 'verified' && styles.verifiedCard,
        status === 'pending' && styles.pendingCard,
        status === 'failed' && styles.failedCard,
      ]}
      onPress={() => onPress(platform.id, platform.name)}
    >
      <View style={styles.platformHeader}>
        <View style={styles.platformInfo}>
          <Text style={styles.platformIcon}>{platform.icon}</Text>
          <View style={styles.platformDetails}>
            <Text style={styles.platformName}>{platform.name}</Text>
            <Text style={styles.platformDescription}>
              {getDescription()}
            </Text>
          </View>
        </View>
        <View style={styles.platformStatus}>
          {getStatusBadge()}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  platformCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  verifiedCard: {
    borderColor: '#4CAF50',
    backgroundColor: '#0F1F0F',
  },
  pendingCard: {
    borderColor: '#FF9800',
    backgroundColor: '#1F1A0F',
  },
  failedCard: {
    borderColor: '#f44336',
    backgroundColor: '#1F0F0F',
  },
  platformHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  platformInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  platformIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  platformDetails: {
    flex: 1,
  },
  platformName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  platformDescription: {
    fontSize: 12,
    color: '#AAAAAA',
  },
  platformStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  verifiedBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderColor: '#4CAF50',
  },
  pendingBadge: {
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    borderColor: '#FF9800',
  },
  failedBadge: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    borderColor: '#f44336',
  },
  verifiedText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  pendingText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: 'bold',
  },
  failedText: {
    fontSize: 12,
    color: '#f44336',
    fontWeight: 'bold',
  },
  pointsBadge: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  pointsText: {
    fontSize: 12,
    color: COLORS.gold,
    fontWeight: 'bold',
  },
});

// // Hook the styles to the component
// Object.assign(PlatformCard, { styles: platformStyles });