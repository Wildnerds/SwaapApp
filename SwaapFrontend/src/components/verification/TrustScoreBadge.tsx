// components/verification/TrustScoreBadge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import COLORS from '@/constants/colors';

interface TrustScoreBadgeProps {
  user: any; // Using any for now since ExtendedUser type might not exist yet
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  style?: any;
}

// Updated verification steps without BVN
const verificationSteps = {
  email: { weight: 25 },
  phone: { weight: 25 },
  address: { weight: 25 },
  identity: { weight: 25 }
};

export const TrustScoreBadge: React.FC<TrustScoreBadgeProps> = ({ 
  user, 
  size = 'medium',
  showLabel = true,
  style
}) => {
  // Calculate trust score based on completed verifications
  const calculateTrustScore = (userData: any): number => {
    if (!userData) return 0;
    
    let totalScore = 0;
    
    // Check each verification step
    Object.keys(verificationSteps).forEach(step => {
      const isCompleted = userData[`${step}Verified`] || 
                         userData.verifications?.[step]?.completed || 
                         userData[step]?.verified || 
                         false;
      
      if (isCompleted) {
        totalScore += verificationSteps[step as keyof typeof verificationSteps].weight;
      }
    });
    
    return Math.min(totalScore, 100); // Cap at 100
  };

  const trustScore = user?.trustScore || calculateTrustScore(user);

  const getTrustScoreColor = (score: number) => {
    if (score >= 100) return COLORS.gold; // Perfect score
    if (score >= 75) return '#4CAF50';     // High trust (green)
    if (score >= 50) return '#FF9800';     // Medium trust (orange)
    if (score >= 25) return '#FF5722';     // Low trust (red-orange)
    return '#9E9E9E';                      // No verification (gray)
  };

  const getTrustScoreLabel = (score: number) => {
    if (score >= 100) return 'Verified';
    if (score >= 75) return 'High Trust';
    if (score >= 50) return 'Medium Trust';
    if (score >= 25) return 'Low Trust';
    return 'Unverified';
  };

  const getContainerSize = () => {
    switch (size) {
      case 'small': return { width: 50, height: 30 };
      case 'large': return { width: 90, height: 55 };
      default: return { width: 70, height: 40 };
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'small': return { score: 11, label: 8 };
      case 'large': return { score: 16, label: 12 };
      default: return { score: 13, label: 10 };
    }
  };

  const containerSize = getContainerSize();
  const textSize = getTextSize();
  const scoreColor = getTrustScoreColor(trustScore);

  // Get verification status for tooltip/additional info
  const getVerificationStatus = () => {
    if (!user) return { completed: 0, total: 4 };
    
    let completed = 0;
    Object.keys(verificationSteps).forEach(step => {
      const isCompleted = user[`${step}Verified`] || 
                         user.verifications?.[step]?.completed || 
                         user[step]?.verified || 
                         false;
      if (isCompleted) completed++;
    });
    
    return { completed, total: 4 };
  };

  const verificationStatus = getVerificationStatus();

  return (
    <View style={[styles.container, style]}>
      {showLabel && (
        <Text style={[styles.label, { fontSize: textSize.label }]}>
          {getTrustScoreLabel(trustScore)}
        </Text>
      )}
      
      <View style={[
        styles.badge,
        containerSize,
        { 
          borderColor: scoreColor,
          backgroundColor: trustScore >= 100 ? `${scoreColor}15` : '#2A2A2A'
        }
      ]}>
        <Text style={[
          styles.scoreText,
          { fontSize: textSize.score, color: scoreColor }
        ]}>
          {trustScore >= 100 ? '✅' : '🛡️'} {trustScore}
        </Text>
        
        {size !== 'small' && (
          <Text style={[
            styles.progressText,
            { fontSize: textSize.label - 1, color: scoreColor }
          ]}>
            {verificationStatus.completed}/{verificationStatus.total}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 4,
  },
  label: {
    color: '#AAAAAA',
    fontWeight: '500',
    textAlign: 'center',
  },
  badge: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1.5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 3,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  scoreText: {
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 18,
  },
  progressText: {
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.8,
    marginTop: -2,
  },
});