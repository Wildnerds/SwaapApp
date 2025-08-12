
import { useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '@store/redux/hooks';
import { setUser } from '@/store/redux/slices/authSlice';
import { apiClient } from '@/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export const useTrustScoreFix = () => {
  const { user } = useAppSelector(state => state.auth);
  const dispatch = useAppDispatch();

  const fixTrustScore = useCallback(async () => {
    try {
      console.log('🔧 Attempting trust score fix...');
      
      // Get current user data
      const currentUser = user;
      if (!currentUser) {
        throw new Error('No user data available');
      }

      // Calculate what the trust score SHOULD be
      let correctTrustScore = 0;
      
      // Check each verification (20 points each)
      const verificationStatus = {
        email: currentUser.emailVerified || false,
        phone: currentUser.phoneVerified || false,
        address: currentUser.addressVerified || false,
        identity: currentUser.identityVerified || false,
        social: currentUser.socialVerifications?.some(v => v.status === 'verified') || false
      };

      if (verificationStatus.email) correctTrustScore += 20;
      if (verificationStatus.phone) correctTrustScore += 20;
      if (verificationStatus.address) correctTrustScore += 20;
      if (verificationStatus.identity) correctTrustScore += 20;
      if (verificationStatus.social) correctTrustScore += 20;

      console.log('🧮 Trust score calculation:', {
        current: currentUser.trustScore,
        correct: correctTrustScore,
        verifications: verificationStatus
      });

      // If scores don't match, fix it
      if (currentUser.trustScore !== correctTrustScore) {
        console.log('⚠️ Trust score mismatch detected, fixing...');
        
        // Create updated user object
        const updatedUser = {
          ...currentUser,
          trustScore: correctTrustScore
        };

        // Update Redux store
        dispatch(setUser(updatedUser));
        
        // Update AsyncStorage
        await AsyncStorage.multiSet([
          ['@user_data', JSON.stringify(updatedUser)],
          ['@user', JSON.stringify(updatedUser)]
        ]);

        console.log('✅ Trust score fixed:', correctTrustScore);
        
        Alert.alert(
          'Trust Score Fixed! 🎉',
          `Updated from ${currentUser.trustScore} to ${correctTrustScore}\n\n` +
          `Breakdown:\n` +
          `Email: ${verificationStatus.email ? '✅ 20pts' : '❌ 0pts'}\n` +
          `Phone: ${verificationStatus.phone ? '✅ 20pts' : '❌ 0pts'}\n` +
          `Address: ${verificationStatus.address ? '✅ 20pts' : '❌ 0pts'}\n` +
          `Identity: ${verificationStatus.identity ? '✅ 20pts' : '❌ 0pts'}\n` +
          `Social: ${verificationStatus.social ? '✅ 20pts' : '❌ 0pts'}`
        );

        return correctTrustScore;
      } else {
        Alert.alert('Trust Score OK ✅', `Your trust score is already correct: ${correctTrustScore}/100`);
        return correctTrustScore;
      }
    } catch (error) {
      console.error('❌ Trust score fix failed:', error);
      Alert.alert('Error', 'Failed to fix trust score: ' + error.message);
      return null;
    }
  }, [user, dispatch]);

  const addSocialVerification = useCallback(async (platform: string) => {
    try {
      console.log('🔄 Adding social verification:', platform);
      
      if (!user) return;

      // Add social verification to user data
      const socialVerifications = user.socialVerifications || [];
      
      // Remove existing verification for this platform
      const filteredVerifications = socialVerifications.filter(v => v.platform !== platform);
      
      // Add new verified social verification
      const newVerification = {
        platform,
        username: 'test_user',
        profileUrl: `https://${platform}.com/test_user`,
        verificationMethod: 'bio_link',
        status: 'verified' as const,
        verifiedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      const updatedUser = {
        ...user,
        socialVerifications: [...filteredVerifications, newVerification]
      };

      // Update Redux
      dispatch(setUser(updatedUser));
      
      // Update AsyncStorage
      await AsyncStorage.setItem('@user_data', JSON.stringify(updatedUser));
      
      console.log('✅ Social verification added');
      
      // Now fix the trust score
      setTimeout(() => fixTrustScore(), 500);
      
    } catch (error) {
      console.error('❌ Failed to add social verification:', error);
    }
  }, [user, dispatch, fixTrustScore]);

  return {
    fixTrustScore,
    addSocialVerification,
    currentTrustScore: user?.trustScore || 0
  };
};