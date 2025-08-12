// components/profile/VerificationStatusCard.tsx - UPDATED FOR 20-POINT SYSTEM
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TrustScoreBadge } from '@/components/verification/TrustScoreBadge';
import COLORS from '@/constants/colors';

interface VerificationStatusCardProps {
  user: any; // Using any for now since ExtendedUser type might not exist yet
  onPress: () => void;
  onSocialPress?: () => void;
  verificationSummary?: {
    completed: number;
    total: number;
    percentage: number;
    nextStep: any;
    verifications: any[];
    trustScore: number;
    maxTrustScore: number;
  };
  style?: any;
}

export const VerificationStatusCard: React.FC<VerificationStatusCardProps> = ({ 
  user, 
  onPress,
  onSocialPress,
  verificationSummary,
  style 
}) => {
  // ✅ UPDATED: 5-step verification system (Email, Phone, Address, Identity, Social)
  const getVerificationProgress = () => {
    const checks = [
      { 
        id: 'email',
        label: 'Email', 
        verified: user?.emailVerified || user?.verified || false,
        points: 20,
        icon: '📧',
        type: 'core'
      },
      { 
        id: 'phone',
        label: 'Phone', 
        verified: user?.phoneVerified || false,
        points: 20,
        icon: '📱',
        type: 'core'
      },
      { 
        id: 'address',
        label: 'Address', 
        verified: user?.addressVerified || user?.address?.verified || false,
        points: 20,
        icon: '🏠',
        type: 'core'
      },
      { 
        id: 'identity',
        label: 'Identity', 
        verified: user?.identityVerified || false,
        points: 20,
        icon: '🆔',
        type: 'core'
      },
      { 
        id: 'social',
        label: 'Social', 
        verified: user?.socialVerifications?.some((v: any) => v.status === 'verified') || false,
        points: 20,
        icon: '🔗',
        type: 'social'
      },
    ];
    
    const verified = checks.filter(check => check.verified).length;
    const coreVerified = checks.filter(check => check.type === 'core' && check.verified).length;
    const socialVerified = checks.filter(check => check.type === 'social' && check.verified).length;
    const totalPoints = verified * 20; // Each verification = 20 points
    
    return { 
      verified, 
      total: checks.length, 
      checks, 
      totalPoints, 
      coreVerified,
      socialVerified 
    };
  };

  // ✅ UPDATED: Verification level calculation based on 5 steps
  const getVerificationLevel = () => {
    const { verified } = getVerificationProgress();
    
    if (verified === 5) return 'FULLY_VERIFIED'; // All 5 steps = 100%
    if (verified >= 4) return 'ADVANCED';        // 4 steps = 80%
    if (verified >= 3) return 'INTERMEDIATE';    // 3 steps = 60%
    if (verified >= 2) return 'BASIC';           // 2 steps = 40%
    if (verified >= 1) return 'STARTED';         // 1 step = 20%
    return 'UNVERIFIED';                         // 0 steps
  };

  const getVerificationColor = (level: string) => {
    switch (level) {
      case 'FULLY_VERIFIED': return COLORS.gold;   // Gold for 100%
      case 'ADVANCED': return '#4CAF50';           // Green for 80%
      case 'INTERMEDIATE': return '#2196F3';       // Blue for 60%
      case 'BASIC': return '#FF9800';             // Orange for 40%
      case 'STARTED': return '#9C27B0';          // Purple for 20%
      default: return '#9E9E9E';                   // Gray for unverified
    }
  };

  const getVerificationDisplayText = (level: string) => {
    switch (level) {
      case 'FULLY_VERIFIED': return 'FULLY VERIFIED';
      case 'ADVANCED': return 'ADVANCED LEVEL';
      case 'INTERMEDIATE': return 'INTERMEDIATE LEVEL';
      case 'BASIC': return 'BASIC LEVEL';
      case 'STARTED': return 'GETTING STARTED';
      default: return 'UNVERIFIED';
    }
  };

  const getActionText = (level: string, verifiedCount: number, totalCount: number) => {
    if (level === 'FULLY_VERIFIED') {
      return 'Manage verifications →';
    }
    
    const remaining = totalCount - verifiedCount;
    if (level === 'UNVERIFIED') {
      return 'Start verification →';
    }
    
    return `Complete ${remaining} more step${remaining > 1 ? 's' : ''} →`;
  };

  // ✅ NEW: Get next recommended step
  const getNextStep = () => {
    const { checks } = getVerificationProgress();
    const unverified = checks.filter(check => !check.verified);
    
    if (unverified.length === 0) return null;
    
    // Prioritize: Email → Phone → Social → Address → Identity
    const priority = ['email', 'phone', 'social', 'address', 'identity'];
    const nextStep = priority.find(id => unverified.some(check => check.id === id));
    
    return checks.find(check => check.id === nextStep);
  };

  const { verified, total, checks, totalPoints, coreVerified, socialVerified } = getVerificationProgress();
  const verificationLevel = getVerificationLevel();
  const progressPercentage = (verified / total) * 100;
  const levelColor = getVerificationColor(verificationLevel);
  const displayText = getVerificationDisplayText(verificationLevel);
  const actionText = getActionText(verificationLevel, verified, total);
  const nextStep = getNextStep();

  // Use server trust score if available, otherwise calculate
  const trustScore = user?.trustScore || totalPoints;

  // ✅ NEW: Handle click based on verification type
  const handleVerificationClick = (check: any) => {
    if (check.type === 'social' && onSocialPress) {
      onSocialPress();
    } else {
      onPress();
    }
  };

  return (
    <TouchableOpacity style={[styles.card, style]} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>Account Verification</Text>
          <Text style={[styles.level, { color: levelColor }]}>
            {displayText}
          </Text>
        </View>
        
        <TrustScoreBadge user={user} size="medium" />
      </View>

      {/* ✅ UPDATED: Trust Score Display (20-point system) */}
      <View style={styles.trustScoreContainer}>
        <View style={styles.trustScoreInfo}>
          <Text style={styles.trustScoreLabel}>Trust Score</Text>
          <Text style={[styles.trustScoreValue, { color: levelColor }]}>
            {trustScore}/100
          </Text>
        </View>
        
        {/* ✅ NEW: Score breakdown */}
        <View style={styles.scoreBreakdown}>
          <Text style={styles.scoreBreakdownText}>
            Core: {coreVerified * 20}/80 • Social: {socialVerified * 20}/20
          </Text>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${progressPercentage}%`,
                  backgroundColor: levelColor
                }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {verified}/{total} verifications complete ({Math.round(progressPercentage)}%)
          </Text>
        </View>
      </View>

      {/* ✅ UPDATED: Verification Steps (5 steps with icons) */}
      <View style={styles.checksContainer}>
        {checks.map((check, index) => (
          <TouchableOpacity
            key={check.id}
            style={styles.checkItem}
            onPress={() => handleVerificationClick(check)}
            activeOpacity={0.7}
          >
            <View style={[
              styles.checkIcon,
              { 
                backgroundColor: check.verified ? levelColor : '#444',
                borderColor: check.verified ? levelColor : '#666',
              }
            ]}>
              {check.verified ? (
                <Text style={styles.checkIconText}>✓</Text>
              ) : (
                <Text style={styles.checkEmoji}>{check.icon}</Text>
              )}
            </View>
            <Text style={[
              styles.checkLabel,
              { color: check.verified ? '#FFFFFF' : '#888' }
            ]}>
              {check.label}
            </Text>
            <Text style={[
              styles.checkPoints,
              { color: check.verified ? levelColor : '#666' }
            ]}>
              {check.verified ? `+${check.points}` : `${check.points}pts`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ✅ NEW: Next Step Recommendation */}
      {nextStep && (
        <TouchableOpacity 
          style={styles.nextStepContainer}
          onPress={() => handleVerificationClick(nextStep)}
        >
          <Text style={styles.nextStepTitle}>
            🎯 Next: {nextStep.label} Verification
          </Text>
          <Text style={styles.nextStepReward}>
            Earn +{nextStep.points} points
          </Text>
        </TouchableOpacity>
      )}

      {/* ✅ UPDATED: Special message for fully verified users */}
      {verificationLevel === 'FULLY_VERIFIED' && (
        <View style={styles.fullyVerifiedBanner}>
          <Text style={styles.fullyVerifiedIcon}>🏆</Text>
          <Text style={styles.fullyVerifiedText}>
            Perfect! You've achieved maximum verification status with all 5 steps completed.
          </Text>
        </View>
      )}

      {/* ✅ NEW: Social Media Verification Highlight */}
      {socialVerified > 0 && (
        <View style={styles.socialVerificationBanner}>
          <Text style={styles.socialVerificationIcon}>🔗</Text>
          <Text style={styles.socialVerificationText}>
            Social media verified • +20 bonus points earned
          </Text>
        </View>
      )}

      {/* Action Button */}
      <View style={styles.actionContainer}>
        <Text style={[
          styles.actionText,
          verificationLevel === 'FULLY_VERIFIED' && styles.fullyVerifiedActionText
        ]}>
          {actionText}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  level: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  trustScoreContainer: {
    marginBottom: 16,
  },
  trustScoreInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  trustScoreLabel: {
    fontSize: 14,
    color: '#CCCCCC',
    fontWeight: '500',
  },
  trustScoreValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  scoreBreakdown: {
    marginBottom: 8,
  },
  scoreBreakdownText: {
    fontSize: 11,
    color: '#AAAAAA',
    textAlign: 'center',
    fontWeight: '500',
  },
  progressContainer: {},
  progressBar: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#AAAAAA',
    textAlign: 'center',
  },
  checksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 8,
  },
  checkItem: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  checkIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIconText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  checkEmoji: {
    fontSize: 14,
  },
  checkLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  checkPoints: {
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  nextStepContainer: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  nextStepTitle: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  nextStepReward: {
    fontSize: 11,
    color: COLORS.gold,
    fontWeight: '500',
  },
  fullyVerifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  fullyVerifiedIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  fullyVerifiedText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.gold,
    fontWeight: '500',
  },
  socialVerificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  socialVerificationIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  socialVerificationText: {
    flex: 1,
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '500',
  },
  actionContainer: {
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  actionText: {
    fontSize: 14,
    color: COLORS.gold,
    fontWeight: '500',
  },
  fullyVerifiedActionText: {
    color: '#4CAF50',
  },
});