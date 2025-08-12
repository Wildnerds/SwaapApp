// screens/BasicVerificationScreen.tsx - UPDATED FOR 4-STEP + SOCIAL SYSTEM
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector, useAppDispatch } from '@store/redux/hooks';
import { RootState } from '@store';
import { setUser } from '@store/redux/slices/authSlice';
import { VerificationStatusCard } from '@/components/profile/VerificationStatusCard';
import { VerificationBadge } from '@/components/verification/VerificationBadge';
import COLORS from '@/constants/colors';

export const BasicVerificationScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { user, token } = useAppSelector((state: RootState) => state.auth);

  // ✅ UPDATED: Simplified trust score system (100 points total)
  const getVerificationSteps = () => {
    return [
      {
        id: 'email',
        title: 'Email Verification',
        subtitle: 'Confirm your email address',
        points: 20, // Updated from 25 to 20
        completed: user?.emailVerified || user?.verified || false,
        action: (user?.emailVerified || user?.verified) ? null : 'Verify Email',
        onPress: () => handleEmailVerification(),
        icon: '📧',
        description: 'We\'ll send a verification link to your email',
        available: true,
        type: 'core'
      },
      {
        id: 'phone',
        title: 'Phone Verification',
        subtitle: 'Verify your mobile number',
        points: 20, // Updated from 25 to 20
        completed: user?.phoneVerified || false,
        action: user?.phoneVerified ? 'Update Phone' : (user?.mobile ? 'Verify Phone' : 'Add Phone'),
        onPress: () => handlePhoneVerification(),
        icon: '📱',
        description: user?.mobile 
          ? `Verify ${user.mobile}` 
          : 'Add and verify your phone number',
        available: true,
        type: 'core'
      },
      {
        id: 'address',
        title: 'Address Verification',
        subtitle: 'Confirm your location',
        points: 25, // Kept at 25
        completed: user?.addressVerified || user?.address?.verified || false,
        action: (user?.addressVerified || user?.address?.verified) ? 'Update Address' : 'Add Address',
        onPress: () => handleAddressVerification(),
        icon: '🏠',
        description: user?.address?.street 
          ? `${user.address.city}, ${user.address.state}` 
          : 'Add your address in your profile',
        available: true,
        type: 'core'
      },
      {
        id: 'identity',
        title: 'Identity Verification',
        subtitle: 'Upload government ID',
        points: 25, // Kept at 25
        completed: user?.identityVerified || false,
        action: user?.identityVerified ? 'Update ID' : 'Upload ID',
        onPress: () => handleIdentityVerification(),
        icon: '🆔',
        description: 'NIN, Driver\'s License, or Passport',
        available: true,
        type: 'core'
      },
    ];
  };

  // ✅ UPDATED: Simplified social media verification (single 10-point step)
  const getSocialVerificationSteps = () => {
    const socialVerifications = user?.socialVerifications || [];
    const hasVerifiedSocial = socialVerifications.some(v => v.status === 'verified');
    const hasPendingSocial = socialVerifications.some(v => v.status === 'pending');
    
    return [
      {
        id: 'social',
        title: 'Social Media Verification',
        subtitle: 'Connect any social media account',
        points: 10, // Single 10-point step
        completed: hasVerifiedSocial,
        pending: hasPendingSocial && !hasVerifiedSocial,
        action: hasVerifiedSocial ? 'Verified' : hasPendingSocial ? 'Pending' : 'Connect',
        onPress: () => handleSocialVerification(),
        icon: '🔗',
        description: hasVerifiedSocial 
          ? `Connected: ${socialVerifications.filter(v => v.status === 'verified').map(v => v.platform).join(', ')}` 
          : hasPendingSocial 
          ? 'Verification in progress'
          : 'Connect Twitter, Instagram, Facebook, LinkedIn, or TikTok',
        available: true,
        type: 'social'
      }
    ];
  };

  // ✅ UPDATED: Simplified trust score calculation (100 points total)
  const getTrustScoreData = () => {
    const coreSteps = getVerificationSteps();
    const socialSteps = getSocialVerificationSteps();
    
    // Use server values (don't calculate locally)
    const currentTrustScore = user?.trustScore || 0;
    const verificationLevel = user?.verificationLevel || 0;
    
    // Calculate what the score breakdown should be for display
    const completedCoreSteps = coreSteps.filter(step => step.completed);
    const completedSocialSteps = socialSteps.filter(step => step.completed);
    
    const corePoints = completedCoreSteps.reduce((sum, step) => sum + step.points, 0); // 20+20+25+25 = 90
    const socialPoints = completedSocialSteps.length > 0 ? 10 : 0; // Single 10-point bonus
    const maxPossibleScore = 100; // Total: 90 core + 10 social = 100

    return {
      current: currentTrustScore,
      core: corePoints,
      social: socialPoints,
      max: maxPossibleScore,
      percentage: Math.round((currentTrustScore / maxPossibleScore) * 100),
      level: verificationLevel,
      completedCore: completedCoreSteps.length,
      totalCore: coreSteps.length,
      completedSocial: completedSocialSteps.length,
      maxSocial: 1 // Only one social verification needed
    };
  };

  // ✅ UPDATED: Verification level display using backend enum
  const getVerificationLevelDisplay = (level: number) => {
    switch (level) {
      case 4: return { text: 'Fully Verified', color: '#4CAF50', emoji: '🏆' };
      case 3: return { text: 'Advanced', color: '#2196F3', emoji: '🥉' };
      case 2: return { text: 'Intermediate', color: '#FF9800', emoji: '🥈' };
      case 1: return { text: 'Basic', color: '#FFC107', emoji: '🥇' };
      case 0: return { text: 'Unverified', color: '#f44336', emoji: '⚠️' };
      default: return { text: 'Unverified', color: '#f44336', emoji: '⚠️' };
    }
  };

  // ✅ UPDATED: Simplified social media verification handler
  const handleSocialVerification = () => {
    const socialVerifications = user?.socialVerifications || [];
    const hasVerifiedSocial = socialVerifications.some(v => v.status === 'verified');
    
    if (hasVerifiedSocial) {
      Alert.alert(
        'Social Media Already Verified',
        'You\'ve already verified a social media account! ✅\n\nYou can add more platforms, but you\'ll still get the same 10 trust points.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Connect Social Media',
      'Verify any social media account to earn +10 trust points.\n\nSupported platforms:\n• Twitter\n• Instagram\n• Facebook\n• LinkedIn\n• TikTok',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start Verification', onPress: () => navigation.navigate('SocialVerification') },
      ]
    );
  };

  // Existing handlers (unchanged)
  const handleEmailVerification = () => {
    if (user?.emailVerified || user?.verified) {
      Alert.alert(
        'Email Already Verified',
        'Your email address is already verified! ✅',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Email Verification',
      'Check your email for a verification link. If you haven\'t received it, contact support.',
      [
        { text: 'OK' },
        { text: 'Contact Support', onPress: () => navigation.navigate('SupportChat') },
      ]
    );
  };

  const handlePhoneVerification = () => {
    if (user?.phoneVerified) {
      Alert.alert(
        'Phone Already Verified',
        `Your phone number ${user.mobile} is already verified! ✅\n\nWould you like to update it?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Update Phone', onPress: () => navigation.navigate('EditProfile') },
        ]
      );
      return;
    }

    if (user?.mobile) {
      Alert.alert(
        'Verify Phone Number',
        `Ready to verify ${user.mobile}?\n\nWe'll send you a verification code via SMS.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Verify Now', onPress: () => navigation.navigate('EditProfile', { focusPhone: true }) },
        ]
      );
    } else {
      Alert.alert(
        'Add Phone Number',
        'You need to add a phone number first before you can verify it.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add Phone', onPress: () => navigation.navigate('EditProfile', { focusPhone: true }) },
        ]
      );
    }
  };

  const handleAddressVerification = () => {
    const hasAddress = user?.address?.street && user?.address?.city && user?.address?.state;
    
    if (user?.addressVerified) {
      Alert.alert(
        'Address Already Verified',
        'Your address is already verified! ✅\n\nWould you like to update it?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Update Address', onPress: () => navigation.navigate('EditProfile') },
        ]
      );
      return;
    }

    if (hasAddress) {
      Alert.alert(
        'Verify Address',
        `Ready to verify your address in ${user.address?.city}, ${user.address?.state}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Verify Now', onPress: () => navigation.navigate('EditProfile') },
        ]
      );
    } else {
      Alert.alert(
        'Add Address',
        'You need to add your address first before you can verify it.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add Address', onPress: () => navigation.navigate('EditProfile') },
        ]
      );
    }
  };

  const handleIdentityVerification = () => {
    if (user?.identityVerified) {
      Alert.alert(
        'Identity Already Verified',
        'Your identity is already verified! ✅\n\nWould you like to update your ID?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Update ID', onPress: () => navigation.navigate('IdentityVerification') },
        ]
      );
      return;
    }

    Alert.alert(
      'Identity Verification',
      'Ready to verify your identity?\n\nYou can upload:\n• National Identity Number (NIN)\n• Driver\'s License\n• International Passport\n\nThe process takes 2-5 minutes.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start Verification', onPress: () => navigation.navigate('IdentityVerification') },
      ]
    );
  };

  const renderVerificationStep = (step: any, index: number) => {
    const canComplete = step.available && !step.completed && !step.pending;
    
    return (
      <TouchableOpacity
        key={step.id}
        style={[
          styles.stepCard,
          step.completed && styles.completedStepCard,
          step.pending && styles.pendingStepCard,
          !step.available && styles.disabledStepCard,
        ]}
        onPress={step.available ? step.onPress : undefined}
        disabled={!step.available}
        activeOpacity={0.8}
      >
        <View style={styles.stepHeader}>
          <View style={styles.stepIconContainer}>
            <Text style={[
              styles.stepIcon,
              !step.available && styles.disabledStepIcon
            ]}>
              {step.icon}
            </Text>
            {step.completed && (
              <View style={styles.completedBadge}>
                <Text style={styles.completedBadgeText}>✓</Text>
              </View>
            )}
            {step.pending && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>⏳</Text>
              </View>
            )}
          </View>
          
          <View style={styles.stepInfo}>
            <View style={styles.stepTitleRow}>
              <Text style={[
                styles.stepTitle,
                !step.available && styles.disabledStepTitle,
                step.completed && styles.completedStepTitle,
                step.pending && styles.pendingStepTitle
              ]}>
                {step.title}
              </Text>
              <View style={[
                styles.pointsBadge,
                step.completed && styles.earnedPointsBadge,
                step.type === 'social' && styles.socialPointsBadge
              ]}>
                <Text style={[
                  styles.pointsText,
                  step.completed && styles.earnedPointsText,
                  step.type === 'social' && styles.socialPointsText
                ]}>
                  +{step.points}
                </Text>
              </View>
            </View>
            
            <Text style={[
              styles.stepSubtitle,
              !step.available && styles.disabledStepSubtitle,
              step.completed && styles.completedStepSubtitle,
              step.pending && styles.pendingStepSubtitle
            ]}>
              {step.subtitle}
            </Text>
            
            <Text style={[
              styles.stepDescription,
              !step.available && styles.disabledStepDescription,
              step.completed && styles.completedStepDescription,
              step.pending && styles.pendingStepDescription
            ]}>
              {step.description}
            </Text>
          </View>
        </View>
        
        <View style={styles.stepActions}>
          {step.completed ? (
            <View style={styles.completedIndicator}>
              <Text style={styles.completedText}>✓ Completed</Text>
            </View>
          ) : step.pending ? (
            <View style={styles.pendingIndicator}>
              <Text style={styles.pendingText}>⏳ Pending</Text>
            </View>
          ) : step.action ? (
            <View style={[
              styles.actionButton,
              step.type === 'social' && styles.socialActionButton
            ]}>
              <Text style={[
                styles.actionButtonText,
                step.type === 'social' && styles.socialActionButtonText
              ]}>
                {step.action} →
              </Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const coreSteps = getVerificationSteps();
  const socialSteps = getSocialVerificationSteps();
  const trustData = getTrustScoreData();
  const levelDisplay = getVerificationLevelDisplay(trustData.level);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>Account Verification</Text>
        <Text style={styles.subtitle}>
          Complete 4 core steps (90 points) + social media (10 points) = 100 total
        </Text>
      </View>

      {/* Current Status */}
      <View style={styles.statusSection}>
        <VerificationStatusCard
          user={user!}
          onPress={() => {}} // Disable tap since we're already on this screen
        />
        
        {/* ✅ UPDATED: New progress summary with social media */}
        <View style={styles.progressSummary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{trustData.completedCore}</Text>
            <Text style={styles.summaryLabel}>Core Complete</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{trustData.completedSocial > 0 ? '1' : '0'}</Text>
            <Text style={styles.summaryLabel}>Social Verified</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={[
              styles.summaryNumber,
              trustData.current >= 100 && styles.perfectScore
            ]}>
              {trustData.current}
            </Text>
            <Text style={styles.summaryLabel}>Trust Score</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={[
              styles.summaryNumber,
              trustData.level === 4 && styles.perfectScore
            ]}>
              {levelDisplay.emoji}
            </Text>
            <Text style={styles.summaryLabel}>{levelDisplay.text}</Text>
          </View>
        </View>

        {/* ✅ UPDATED: Enhanced progress bar with social bonus */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            {/* Core progress (0-90 points) */}
            <View style={[
              styles.progressBarFill,
              { width: `${Math.min((trustData.core / 90) * 90, 90)}%` }, // 90% of bar = 90 points
              styles.coreProgressBar
            ]} />
            {/* Social bonus progress (90-100 points) */}
            <View style={[
              styles.progressBarFill,
              { 
                width: `${Math.min((trustData.social / 10) * 10, 10)}%`, // 10% of bar = 10 bonus points
                left: `${Math.min((trustData.core / 90) * 90, 90)}%`
              },
              styles.socialProgressBar
            ]} />
          </View>
          <Text style={[
            styles.progressText,
            trustData.level === 4 && styles.perfectProgressText
          ]}>
            {trustData.level === 4 ? '🎉 Fully Verified!' : 
             `${trustData.current}/100 points • ${levelDisplay.text} Level`}
          </Text>
          
          {/* Progress breakdown */}
          <View style={styles.progressBreakdown}>
            <Text style={styles.progressBreakdownText}>
              Core: {trustData.core}/90 • Social Bonus: {trustData.social}/10
            </Text>
          </View>
        </View>
      </View>

      {/* Core Verification Steps */}
      <View style={styles.stepsSection}>
        <Text style={styles.sectionTitle}>Core Verification Steps</Text>
        <Text style={styles.sectionSubtitle}>
          Complete all 4 steps to reach 90 trust points and unlock full platform access
        </Text>
        
        {coreSteps.map(renderVerificationStep)}
      </View>

      {/* ✅ NEW: Social Media Verification Section */}
      <View style={styles.stepsSection}>
        <Text style={styles.sectionTitle}>Social Media Verification</Text>
        <Text style={styles.sectionSubtitle}>
          Connect any social media account to earn +10 bonus trust points
        </Text>
        
        {socialSteps.map(renderVerificationStep)}
        
        <View style={styles.socialBonusInfo}>
          <Text style={styles.socialBonusTitle}>🎯 Why verify social accounts?</Text>
          <Text style={styles.socialBonusText}>
            • Boost your trust score to the maximum 100 points{'\n'}
            • Show other users you're authentic{'\n'}
            • Get priority in search results{'\n'}
            • Access to premium features
          </Text>
        </View>
      </View>

      {/* Benefits Section */}
      <View style={styles.benefitsSection}>
        <Text style={styles.sectionTitle}>Verification Benefits</Text>
        
        <View style={styles.benefit}>
          <Text style={styles.benefitIcon}>🛡️</Text>
          <View style={styles.benefitContent}>
            <Text style={styles.benefitTitle}>Build Maximum Trust</Text>
            <Text style={styles.benefitText}>
              Reach 100 trust points to become a fully verified user
            </Text>
          </View>
        </View>
        
        <View style={styles.benefit}>
          <Text style={styles.benefitIcon}>⚡</Text>
          <View style={styles.benefitContent}>
            <Text style={styles.benefitTitle}>Unlock Premium Features</Text>
            <Text style={styles.benefitText}>
              Access advanced trading tools and higher limits
            </Text>
          </View>
        </View>
        
        <View style={styles.benefit}>
          <Text style={styles.benefitIcon}>🎯</Text>
          <View style={styles.benefitContent}>
            <Text style={styles.benefitTitle}>Priority Support & Visibility</Text>
            <Text style={styles.benefitText}>
              Get faster support and appear first in search results
            </Text>
          </View>
        </View>
        
        <View style={styles.benefit}>
          <Text style={styles.benefitIcon}>💰</Text>
          <View style={styles.benefitContent}>
            <Text style={styles.benefitTitle}>Better Trading Terms</Text>
            <Text style={styles.benefitText}>
              Enjoy lower fees and better rates with higher trust scores
            </Text>
          </View>
        </View>

        {/* Special message for fully verified users */}
        {trustData.level === 4 && (
          <View style={styles.fullyVerifiedMessage}>
            <Text style={styles.fullyVerifiedIcon}>🏆</Text>
            <View style={styles.fullyVerifiedContent}>
              <Text style={styles.fullyVerifiedTitle}>
                {trustData.current >= 100 ? 'Perfect Verification!' : 'Core Verification Complete!'}
              </Text>
              <Text style={styles.fullyVerifiedText}>
                {trustData.current >= 100
                  ? 'You\'ve achieved the maximum 100 trust score! You\'re now a fully verified Swaap user.'
                  : 'You\'ve completed all core verification steps! Connect a social media account to reach the maximum 100 trust score.'
                }
              </Text>
            </View>
          </View>
        )}
      </View>
      
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
  },
  backButtonText: {
    color: COLORS.gold,
    fontSize: 16,
    fontWeight: '500',
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
  statusSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  progressSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.gold,
    marginBottom: 4,
  },
  perfectScore: {
    color: '#4CAF50',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#AAAAAA',
    textAlign: 'center',
  },
  progressBarContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    position: 'absolute',
    top: 0,
  },
  coreProgressBar: {
    backgroundColor: COLORS.gold,
  },
  socialProgressBar: {
    backgroundColor: '#4CAF50',
  },
  progressText: {
    marginTop: 8,
    fontSize: 12,
    color: '#AAAAAA',
  },
  perfectProgressText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  progressBreakdown: {
    marginTop: 4,
  },
  progressBreakdownText: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  stepsSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 20,
  },
  stepCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  completedStepCard: {
    borderColor: COLORS.gold,
    backgroundColor: '#1A1A0F',
  },
  pendingStepCard: {
    borderColor: '#FF9800',
    backgroundColor: '#1A1406',
  },
  disabledStepCard: {
    opacity: 0.6,
  },
  stepHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  stepIconContainer: {
    position: 'relative',
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIcon: {
    fontSize: 32,
  },
  disabledStepIcon: {
    opacity: 0.5,
  },
  completedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: COLORS.gold,
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedBadgeText: {
    color: '#121212',
    fontSize: 10,
    fontWeight: 'bold',
  },
  pendingBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FF9800',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBadgeText: {
    color: '#121212',
    fontSize: 10,
    fontWeight: 'bold',
  },
  stepInfo: {
    flex: 1,
  },
  stepTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  completedStepTitle: {
    color: COLORS.gold,
  },
  pendingStepTitle: {
    color: '#FF9800',
  },
  disabledStepTitle: {
    color: '#666',
  },
  pointsBadge: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  earnedPointsBadge: {
    backgroundColor: COLORS.gold,
  },
  socialPointsBadge: {
    backgroundColor: '#2A3A2A',
  },
  pointsText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#CCCCCC',
  },
  earnedPointsText: {
    color: '#121212',
  },
  socialPointsText: {
    color: '#4CAF50',
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 6,
  },
  completedStepSubtitle: {
    color: '#E8E8E8',
  },
  pendingStepSubtitle: {
    color: '#FFB366',
  },
  disabledStepSubtitle: {
    color: '#666',
  },
  stepDescription: {
    fontSize: 12,
    color: '#AAAAAA',
  },
  completedStepDescription: {
    color: '#CCCC99',
  },
  pendingStepDescription: {
    color: '#E6CC99',
  },
  disabledStepDescription: {
    color: '#555',
  },
  stepActions: {
    alignItems: 'flex-end',
  },
  completedIndicator: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  completedText: {
    fontSize: 12,
    color: COLORS.gold,
    fontWeight: 'bold',
  },
  pendingIndicator: {
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  pendingText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: 'bold',
  },
  actionButton: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  socialActionButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: '#4CAF50',
  },
  actionButtonText: {
    fontSize: 12,
    color: COLORS.gold,
    fontWeight: 'bold',
  },
  socialActionButtonText: {
    color: '#4CAF50',
  },
  socialBonusInfo: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  socialBonusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  socialBonusText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  benefitsSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
  },
  benefitIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  benefitText: {
    fontSize: 12,
    color: '#AAAAAA',
    lineHeight: 16,
  },
  fullyVerifiedMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    padding: 20,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  fullyVerifiedIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  fullyVerifiedContent: {
    flex: 1,
  },
  fullyVerifiedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 6,
  },
  fullyVerifiedText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 18,
  },
  bottomPadding: {
    height: 40,
  },
});

export default BasicVerificationScreen;