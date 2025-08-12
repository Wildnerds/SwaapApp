// components/verification/VerificationBadge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import COLORS from '@/constants/colors';

interface VerificationBadgeProps {
  user: any; // Using any for now since ExtendedUser type might not exist yet
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  style?: any;
}

// Updated verification steps without BVN
const verificationSteps = {
  email: { weight: 25 },
  phone: { weight: 25 },
  address: { weight: 25 },
  identity: { weight: 25 }
};

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({ 
  user, 
  size = 'medium',
  showText = false,
  style
}) => {
  // Calculate verification level based on completed steps
  const getVerificationLevel = (userData: any) => {
    if (!userData) return { level: 'UNVERIFIED', count: 0, trustScore: 0 };
    
    let completedCount = 0;
    let trustScore = 0;
    
    // Check each verification step
    Object.keys(verificationSteps).forEach(step => {
      const isCompleted = userData[`${step}Verified`] || 
                         userData.verifications?.[step]?.completed || 
                         userData[step]?.verified || 
                         false;
      
      if (isCompleted) {
        completedCount++;
        trustScore += verificationSteps[step as keyof typeof verificationSteps].weight;
      }
    });
    
    // Determine verification level based on completed steps
    let level = 'UNVERIFIED';
    if (completedCount === 4) {
      level = 'FULLY_VERIFIED'; // All 4 steps completed = 100% trust score
    } else if (completedCount >= 3) {
      level = 'ADVANCED'; // 3 steps = 75% trust score
    } else if (completedCount >= 2) {
      level = 'INTERMEDIATE'; // 2 steps = 50% trust score
    } else if (completedCount >= 1) {
      level = 'BASIC'; // 1 step = 25% trust score
    }
    
    return { level, count: completedCount, trustScore };
  };

  const verificationData = getVerificationLevel(user);
  const { level, count, trustScore } = verificationData;
  
  // Don't show badge for unverified users
  if (level === 'UNVERIFIED') {
    return null;
  }

  const getBadgeColor = () => {
    switch (level) {
      case 'FULLY_VERIFIED': return COLORS.gold; // 100% - Gold
      case 'ADVANCED': return '#4CAF50';         // 75% - Green
      case 'INTERMEDIATE': return '#FF9800';     // 50% - Orange
      case 'BASIC': return '#2196F3';           // 25% - Blue
      default: return '#9E9E9E';
    }
  };

  const getBadgeIcon = () => {
    switch (level) {
      case 'FULLY_VERIFIED': return '🏆'; // Trophy for full verification
      case 'ADVANCED': return '✅';       // Check mark for advanced
      case 'INTERMEDIATE': return '⭐';   // Star for intermediate
      case 'BASIC': return '✓';          // Simple check for basic
      default: return '✓';
    }
  };

  const getVerificationText = () => {
    switch (level) {
      case 'FULLY_VERIFIED': return 'Fully Verified';
      case 'ADVANCED': return 'Advanced';
      case 'INTERMEDIATE': return 'Intermediate';
      case 'BASIC': return 'Basic';
      default: return 'Unverified';
    }
  };

  const getBadgeSize = () => {
    switch (size) {
      case 'small': return 18;
      case 'large': return 32;
      default: return 24;
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'small': return 10;
      case 'large': return 14;
      default: return 12;
    }
  };

  const badgeSize = getBadgeSize();
  const badgeColor = getBadgeColor();
  const textSize = getTextSize();
  const badgeIcon = getBadgeIcon();
  const verificationText = getVerificationText();

  return (
    <View style={[styles.container, style]}>
      <View style={[
        styles.badge, 
        { 
          width: badgeSize, 
          height: badgeSize, 
          backgroundColor: badgeColor,
          borderRadius: badgeSize / 2,
          // Add special styling for fully verified users
          ...(level === 'FULLY_VERIFIED' && {
            shadowColor: COLORS.gold,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 5,
          })
        }
      ]}>
        <Text style={[
          styles.icon, 
          { 
            fontSize: level === 'FULLY_VERIFIED' ? badgeSize * 0.5 : badgeSize * 0.6,
            color: level === 'FULLY_VERIFIED' ? '#FFFFFF' : '#FFFFFF'
          }
        ]}>
          {badgeIcon}
        </Text>
      </View>
      
      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.levelText, { fontSize: textSize }]}>
            {verificationText}
          </Text>
          <Text style={[styles.progressText, { fontSize: textSize - 2 }]}>
            {count}/4 steps
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 4,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  icon: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  textContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  levelText: {
    color: '#CCCCCC',
    fontWeight: '600',
    lineHeight: 14,
  },
  progressText: {
    color: '#888888',
    fontWeight: '400',
    lineHeight: 12,
  },
});

// Export utility functions for use in other components
export const getUserVerificationLevel = (userData: any) => {
  if (!userData) return { level: 'UNVERIFIED', count: 0, trustScore: 0 };
  
  let completedCount = 0;
  let trustScore = 0;
  
  Object.keys(verificationSteps).forEach(step => {
    const isCompleted = userData[`${step}Verified`] || 
                       userData.verifications?.[step]?.completed || 
                       userData[step]?.verified || 
                       false;
    
    if (isCompleted) {
      completedCount++;
      trustScore += verificationSteps[step as keyof typeof verificationSteps].weight;
    }
  });
  
  let level = 'UNVERIFIED';
  if (completedCount === 4) {
    level = 'FULLY_VERIFIED';
  } else if (completedCount >= 3) {
    level = 'ADVANCED';
  } else if (completedCount >= 2) {
    level = 'INTERMEDIATE';
  } else if (completedCount >= 1) {
    level = 'BASIC';
  }
  
  return { level, count: completedCount, trustScore };
};

export const isUserVerified = (userData: any): boolean => {
  const { level } = getUserVerificationLevel(userData);
  return level !== 'UNVERIFIED';
};