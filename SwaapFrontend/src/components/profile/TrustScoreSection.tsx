// components/profile/TrustScoreSection.tsx - UPDATED FOR 20-POINT SYSTEM
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { InfoCard } from '../common/InfoCard';
import { InfoRow } from './InfoRow';
import { TrustScoreBadge } from '../verification/TrustScoreBadge';
import COLORS from '@/constants/colors';

interface TrustScoreSectionProps {
  user: any;
  verificationSummary?: {
    completed: number;
    total: number;
    percentage: number;
    nextStep: any;
    verifications: any[];
    trustScore: number;
    maxTrustScore: number;
  };
  onVerificationPress: () => void;
  onSocialPress?: () => void;
}

export const TrustScoreSection: React.FC<TrustScoreSectionProps> = ({
  user,
  verificationSummary,
  onVerificationPress,
  onSocialPress
}) => {
  // Get verification level display text
  const getVerificationLevelText = (level: number) => {
    switch (level) {
      case 4: return 'Fully Verified';
      case 3: return 'Advanced';
      case 2: return 'Intermediate';
      case 1: return 'Basic';
      case 0: return 'Unverified';
      default: return 'Unverified';
    }
  };

  // ✅ UPDATED: Get social verification summary (20-point system)
  const getSocialSummary = () => {
    const socialVerifications = user?.socialVerifications || [];
    const hasVerified = socialVerifications.some((v: any) => v.status === 'verified');
    const verifiedPlatforms = socialVerifications.filter((v: any) => v.status === 'verified');
    
    return {
      hasVerified,
      verifiedCount: verifiedPlatforms.length,
      totalPlatforms: socialVerifications.length,
      bonusPoints: hasVerified ? 20 : 0, // ✅ UPDATED: 20 points if any verified
      platforms: verifiedPlatforms.map((v: any) => v.platform)
    };
  };

  // ✅ UPDATED: Calculate verification breakdown (20-point system)
  const getVerificationBreakdown = () => {
    return {
      email: { completed: user?.emailVerified || false, points: 20 },
      phone: { completed: user?.phoneVerified || false, points: 20 },
      address: { completed: user?.addressVerified || false, points: 20 },
      identity: { completed: user?.identityVerified || false, points: 20 },
      social: { completed: getSocialSummary().hasVerified, points: 20 }
    };
  };

  const socialSummary = getSocialSummary();
  const verificationBreakdown = getVerificationBreakdown();
  const coreVerificationComplete = user?.verificationLevel === 4;
  const maxTrustScore = user?.trustScore === 100;
  
  // ✅ UPDATED: Calculate actual core points (4 × 20 = 80 max)
  const corePoints = Object.entries(verificationBreakdown)
    .filter(([key]) => key !== 'social')
    .reduce((sum, [, data]) => sum + (data.completed ? data.points : 0), 0);

  // Get next recommended action
  const getNextAction = () => {
    if (!user?.emailVerified) return { action: 'Verify Email', points: 20, type: 'core' };
    if (!user?.phoneVerified) return { action: 'Verify Phone', points: 20, type: 'core' };
    if (!socialSummary.hasVerified) return { action: 'Connect Social Media', points: 20, type: 'social' };
    if (!user?.addressVerified) return { action: 'Verify Address', points: 20, type: 'core' };
    if (!user?.identityVerified) return { action: 'Upload ID Document', points: 20, type: 'core' };
    return null;
  };

  const nextAction = getNextAction();

  return (
    <InfoCard>
      {/* Account Tier Row */}
      <InfoRow
        label="Account Tier"
        customContent={
          <View style={styles.tierContainer}>
            <Text style={styles.tierBadge}>
              {user?.level || 'Bronze'} Level
            </Text>
            {user && (
              <View style={styles.trustScoreContainer}>
                <TrustScoreBadge 
                  user={user} 
                  size="small" 
                  showLabel={false}
                />
                {maxTrustScore && (
                  <Text style={styles.maxScoreBadge}>MAX</Text>
                )}
              </View>
            )}
          </View>
        }
        showChevron
        onPress={onVerificationPress}
      />
      
      {/* Verification Level Row */}
      <InfoRow
        label="Verification Level"
        customContent={
          <View style={styles.verificationLevelContainer}>
            <Text style={[
              styles.verificationLevelText,
              { color: coreVerificationComplete ? '#4CAF50' : '#FF9800' }
            ]}>
              {getVerificationLevelText(user?.verificationLevel || 0)}
            </Text>
            <View style={styles.verificationLevelDetails}>
              <Text style={styles.verificationLevelProgress}>
                {user?.verificationLevel || 0}/4
              </Text>
              {socialSummary.hasVerified && (
                <Text style={styles.socialBonusIndicator}>+Social</Text>
              )}
            </View>
          </View>
        }
        showChevron
        onPress={onVerificationPress}
      />

      {/* ✅ UPDATED: Trust Score Row (20-point system) */}
      <InfoRow
        label="Trust Score"
        customContent={
          <View style={styles.trustScoreRow}>
            <View style={styles.trustScoreMain}>
              <Text style={styles.trustScoreText}>
                {user?.trustScore || 0}/100
              </Text>
              <View style={styles.trustScoreBreakdown}>
                <Text style={styles.corePointsText}>
                  Core: {corePoints}/80
                </Text>
                {socialSummary.bonusPoints > 0 && (
                  <Text style={styles.socialPointsText}>
                    Social: +{socialSummary.bonusPoints}
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.trustScoreRight}>
              <Text style={styles.trustScorePercentage}>
                {Math.round(((user?.trustScore || 0) / 100) * 100)}%
              </Text>
              {nextAction && (
                <Text style={styles.nextActionHint}>
                  +{nextAction.points} pts available
                </Text>
              )}
            </View>
          </View>
        }
        onPress={onVerificationPress}
        showChevron
      />

      {/* ✅ NEW: Detailed Verification Breakdown */}
      <View style={styles.verificationBreakdownSection}>
        <Text style={styles.breakdownTitle}>Verification Progress</Text>
        <View style={styles.breakdownGrid}>
          {Object.entries(verificationBreakdown).map(([key, data]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.breakdownItem,
                data.completed && styles.breakdownItemCompleted
              ]}
              onPress={key === 'social' ? onSocialPress : onVerificationPress}
            >
              <View style={styles.breakdownItemContent}>
                <Text style={[
                  styles.breakdownItemIcon,
                  data.completed && styles.breakdownItemIconCompleted
                ]}>
                  {key === 'email' ? '📧' : 
                   key === 'phone' ? '📱' : 
                   key === 'address' ? '🏠' : 
                   key === 'identity' ? '🆔' : '🔗'}
                </Text>
                <Text style={[
                  styles.breakdownItemText,
                  data.completed && styles.breakdownItemTextCompleted
                ]}>
                  {key === 'email' ? 'Email' : 
                   key === 'phone' ? 'Phone' : 
                   key === 'address' ? 'Address' : 
                   key === 'identity' ? 'Identity' : 'Social'}
                </Text>
                <Text style={[
                  styles.breakdownItemPoints,
                  data.completed && styles.breakdownItemPointsCompleted
                ]}>
                  {data.completed ? `+${data.points}` : `${data.points}pts`}
                </Text>
              </View>
              {data.completed && (
                <View style={styles.checkmarkOverlay}>
                  <Text style={styles.checkmark}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ✅ NEW: Next Action Recommendation */}
      {nextAction && (
        <TouchableOpacity 
          style={styles.nextActionContainer}
          onPress={nextAction.type === 'social' ? onSocialPress : onVerificationPress}
        >
          <Text style={styles.nextActionTitle}>
            🎯 Next: {nextAction.action}
          </Text>
          <Text style={styles.nextActionReward}>
            Earn +{nextAction.points} points
          </Text>
        </TouchableOpacity>
      )}

      {/* ✅ NEW: Social Media Summary (if verified) */}
      {socialSummary.hasVerified && (
        <TouchableOpacity 
          style={styles.socialSummaryContainer}
          onPress={onSocialPress}
        >
          <Text style={styles.socialSummaryTitle}>
            🔗 Social Media Verified
          </Text>
          <Text style={styles.socialSummaryDetails}>
            {socialSummary.platforms.join(', ')} • +{socialSummary.bonusPoints} points
          </Text>
        </TouchableOpacity>
      )}
    </InfoCard>
  );
};

const styles = StyleSheet.create({
  tierContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tierBadge: {
    backgroundColor: COLORS.gold,
    color: '#121212',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
  trustScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  maxScoreBadge: {
    backgroundColor: '#4CAF50',
    color: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    fontSize: 10,
    fontWeight: 'bold',
  },
  verificationLevelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  verificationLevelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  verificationLevelDetails: {
    alignItems: 'flex-end',
  },
  verificationLevelProgress: {
    fontSize: 12,
    color: '#AAAAAA',
    fontWeight: '500',
  },
  socialBonusIndicator: {
    fontSize: 10,
    color: COLORS.gold,
    fontWeight: 'bold',
    marginTop: 2,
  },
  trustScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  trustScoreMain: {
    flex: 1,
  },
  trustScoreText: {
    fontSize: 16,
    color: COLORS.gold,
    fontWeight: 'bold',
  },
  trustScoreBreakdown: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  corePointsText: {
    fontSize: 10,
    color: '#CCCCCC',
    fontWeight: '500',
  },
  socialPointsText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '500',
  },
  trustScoreRight: {
    alignItems: 'flex-end',
  },
  trustScorePercentage: {
    fontSize: 12,
    color: '#CCCCCC',
    fontWeight: '500',
  },
  nextActionHint: {
    fontSize: 10,
    color: COLORS.gold,
    fontWeight: 'bold',
    marginTop: 2,
  },

  // ✅ NEW: Verification breakdown styles
  verificationBreakdownSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  breakdownTitle: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 12,
  },
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  breakdownItem: {
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    padding: 8,
    minWidth: '18%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    position: 'relative',
  },
  breakdownItemCompleted: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: '#4CAF50',
  },
  breakdownItemContent: {
    alignItems: 'center',
  },
  breakdownItemIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  breakdownItemIconCompleted: {
    opacity: 0.7,
  },
  breakdownItemText: {
    fontSize: 10,
    color: '#CCCCCC',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 2,
  },
  breakdownItemTextCompleted: {
    color: '#4CAF50',
  },
  breakdownItemPoints: {
    fontSize: 8,
    color: '#AAAAAA',
    fontWeight: 'bold',
  },
  breakdownItemPointsCompleted: {
    color: '#4CAF50',
  },
  checkmarkOverlay: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // ✅ NEW: Next action styles
  nextActionContainer: {
    marginTop: 12,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  nextActionTitle: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  nextActionReward: {
    fontSize: 12,
    color: COLORS.gold,
    fontWeight: '500',
  },

  // ✅ NEW: Social summary styles
  socialSummaryContainer: {
    marginTop: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  socialSummaryTitle: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  socialSummaryDetails: {
    fontSize: 11,
    color: '#CCCCCC',
    fontWeight: '500',
  },
});