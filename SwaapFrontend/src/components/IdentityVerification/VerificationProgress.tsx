// components/IdentityVerification/VerificationProgress.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import COLORS from '@/constants/colors';

interface VerificationProgressProps {
  onBackToVerification: () => void;
}

export const VerificationProgress: React.FC<VerificationProgressProps> = ({
  onBackToVerification,
}) => {
  return (
    <View style={styles.verificationContainer}>
      <View style={styles.verificationIcon}>
        <Text style={styles.successIcon}>📄</Text>
      </View>
      
      <Text style={styles.verificationTitle}>
        Documents Uploaded Successfully!
      </Text>
      
      <Text style={styles.verificationSubtitle}>
        Your documents have been securely uploaded and are now in the review queue. Our verification team will manually review them within 24-48 hours.
      </Text>
      
      <View style={styles.verificationSteps}>
        <View style={[styles.step, styles.stepCompleted]}>
          <Text style={styles.stepText}>✓ Documents uploaded</Text>
        </View>
        
        <View style={[styles.step, styles.stepActive]}>
          <Text style={styles.stepText}>👤 Manual review in progress</Text>
        </View>
        
        <View style={styles.step}>
          <Text style={styles.stepText}>📧 Notification when complete</Text>
        </View>
      </View>

      <View style={styles.reviewTimelineContainer}>
        <Text style={styles.timelineTitle}>What happens next?</Text>
        <View style={styles.timelineItem}>
          <Text style={styles.timelineIcon}>🔍</Text>
          <Text style={styles.timelineText}>Our team reviews your documents for authenticity</Text>
        </View>
        <View style={styles.timelineItem}>
          <Text style={styles.timelineIcon}>⏰</Text>
          <Text style={styles.timelineText}>Review typically takes 24-48 hours</Text>
        </View>
        <View style={styles.timelineItem}>
          <Text style={styles.timelineIcon}>📱</Text>
          <Text style={styles.timelineText}>You'll receive a push notification with results</Text>
        </View>
        <View style={styles.timelineItem}>
          <Text style={styles.timelineIcon}>🎉</Text>
          <Text style={styles.timelineText}>+25 trust score points upon approval</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.backToVerificationButton}
        onPress={onBackToVerification}
      >
        <Text style={styles.backToVerificationButtonText}>Back to Verification</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  verificationContainer: {
    paddingHorizontal: 20,
    alignItems: 'center',
    paddingVertical: 40,
  },
  verificationIcon: {
    marginBottom: 24,
  },
  verificationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  verificationSubtitle: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  verificationSteps: {
    width: '100%',
    maxWidth: 300,
    marginBottom: 24,
  },
  step: {
    paddingVertical: 12,
  },
  stepCompleted: {
    opacity: 1,
  },
  stepActive: {
    opacity: 1,
  },
  stepText: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
  },
  successIcon: {
    fontSize: 48,
    color: COLORS.gold,
  },
  reviewTimelineContainer: {
    width: '100%',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  timelineIcon: {
    fontSize: 16,
    marginRight: 12,
    width: 20,
    marginTop: 2,
  },
  timelineText: {
    flex: 1,
    fontSize: 13,
    color: '#CCCCCC',
    lineHeight: 18,
  },
  backToVerificationButton: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backToVerificationButtonText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: 'bold',
  },
});