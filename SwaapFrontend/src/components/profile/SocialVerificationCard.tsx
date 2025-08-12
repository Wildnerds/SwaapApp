// components/profile/SocialVerificationCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface SocialVerificationCardProps {
  user: any;
  onPress: () => void;
}

export const SocialVerificationCard: React.FC<SocialVerificationCardProps> = ({
  user,
  onPress
}) => {
  // Get social verification summary (simplified for 100-point system)
  const getSocialSummary = () => {
    const socialVerifications = user?.socialVerifications || [];
    const hasVerified = socialVerifications.some(v => v.status === 'verified');
    const hasPending = socialVerifications.some(v => v.status === 'pending');
    
    return {
      hasVerified,
      hasPending,
      platforms: socialVerifications.filter(v => v.status === 'verified').map(v => v.platform)
    };
  };

  const socialSummary = getSocialSummary();

  const getPlatformIcon = (platform: string) => {
    const icons = {
      twitter: '🐦',
      instagram: '📷',
      facebook: '📘',
      linkedin: '💼',
      tiktok: '🎵'
    };
    return icons[platform] || '🔗';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔗 Social Media Verification</Text>
        <Text style={styles.subtitle}>
          {socialSummary.hasVerified 
            ? 'Social media verified • +10 bonus points'
            : 'Connect any social account for +10 bonus points'
          }
        </Text>
      </View>
      
      {socialSummary.hasVerified ? (
        <View style={styles.platformsContainer}>
          {socialSummary.platforms.map((platform, index) => (
            <View key={platform} style={styles.platformBadge}>
              <Text style={styles.platformIcon}>
                {getPlatformIcon(platform)}
              </Text>
              <Text style={styles.platformName}>
                {platform.charAt(0).toUpperCase() + platform.slice(1)}
              </Text>
            </View>
          ))}
          {socialSummary.hasPending && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>+ pending</Text>
            </View>
          )}
        </View>
      ) : (
        <TouchableOpacity style={styles.addButton} onPress={onPress}>
          <Text style={styles.addButtonText}>+ Connect Social Media</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#AAAAAA',
  },
  platformsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  platformIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  platformName: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  pendingBadge: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.3)',
  },
  pendingText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
  },
});