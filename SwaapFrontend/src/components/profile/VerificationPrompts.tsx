// components/profile/VerificationPrompts.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { InfoCard } from '../common/InfoCard';
import COLORS from '@/constants/colors';

interface VerificationPromptsProps {
  user: any;
  onVerificationPress: () => void;
  onSocialPress: () => void;
}

export const VerificationPrompts: React.FC<VerificationPromptsProps> = ({
  user,
  onVerificationPress,
  onSocialPress
}) => {
  const coreVerificationComplete = user?.verificationLevel === 4;
  
  // Get social verification status
  const getSocialStatus = () => {
    const socialVerifications = user?.socialVerifications || [];
    return socialVerifications.some(v => v.status === 'verified');
  };

  const hasSocialVerification = getSocialStatus();

  // Show core verification prompt if not complete
  const showCorePrompt = !coreVerificationComplete;
  
  // Show social prompt if core is complete but no social verification
  const showSocialPrompt = coreVerificationComplete && !hasSocialVerification;

  if (!showCorePrompt && !showSocialPrompt) {
    return null; // User is fully verified
  }

  return (
    <>
      {/* Core Verification Prompt */}
      {showCorePrompt && (
        <InfoCard style={styles.verificationProgressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>🎯 Complete Your Verification</Text>
            <Text style={styles.progressSubtitle}>
              {4 - (user?.verificationLevel || 0)} more step{4 - (user?.verificationLevel || 0) !== 1 ? 's' : ''} to unlock full benefits
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.progressButton}
            onPress={onVerificationPress}
          >
            <Text style={styles.progressButtonText}>Continue Verification →</Text>
          </TouchableOpacity>
        </InfoCard>
      )}

      {/* Social Media Prompt */}
      {showSocialPrompt && (
        <InfoCard style={styles.socialPromptCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>🚀 Boost Your Trust Score</Text>
            <Text style={styles.progressSubtitle}>
              Connect any social media account to reach the maximum 100 trust points
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.socialPromptButton}
            onPress={onSocialPress}
          >
            <Text style={styles.socialPromptButtonText}>Connect Social Media →</Text>
          </TouchableOpacity>
        </InfoCard>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  verificationProgressCard: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderColor: 'rgba(255, 193, 7, 0.3)',
    borderWidth: 1,
  },
  socialPromptCard: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: 'rgba(76, 175, 80, 0.3)',
    borderWidth: 1,
  },
  progressHeader: {
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  progressSubtitle: {
    fontSize: 12,
    color: '#CCCCCC',
  },
  progressButton: {
    backgroundColor: COLORS.gold,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  progressButtonText: {
    color: '#121212',
    fontSize: 14,
    fontWeight: 'bold',
  },
  socialPromptButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  socialPromptButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});