// screens/SocialVerificationScreen.tsx - PROPER VERSION (NO AUTO-100)
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector, useAppDispatch } from '@store/redux/hooks';
import { RootState } from '@store';
import { updateSocialVerificationStatus, setUser } from '@/store/redux/slices/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import COLORS from '@/constants/colors';
import { apiClient } from '@/config';

// Types
interface VerificationInstructions {
  title: string;
  instructions: string[];
  estimatedTime: string;
}

interface VerificationData {
  platform: string;
  username: string;
  profileUrl: string;
  verificationMethod: string;
  verificationCode: string;
  instructions: VerificationInstructions;
  expiresIn: string;
}

interface SocialVerification {
  platform: string;
  username: string;
  profileUrl?: string;
  verificationMethod: string;
  verificationCode: string;
  verifiedAt?: string;
  status: 'pending' | 'verified' | 'failed';
  attempts: number;
  lastAttemptAt: string;
}

export const SocialVerificationScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { user, token } = useAppSelector((state: RootState) => state.auth);
  
  // State
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [verificationMethod, setVerificationMethod] = useState<'bio_link' | 'post_mention' | 'username_match'>('bio_link');
  const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState<boolean>(false);
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [userVerifications, setUserVerifications] = useState<SocialVerification[]>([]);

  console.log('🔍 Current user trust score:', user?.trustScore);

  const platforms = [
    { id: 'twitter', name: 'Twitter', icon: '🐦', color: '#1DA1F2' },
    { id: 'instagram', name: 'Instagram', icon: '📷', color: '#E4405F' },
    { id: 'facebook', name: 'Facebook', icon: '📘', color: '#1877F2' },
    { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: '#0A66C2' },
    { id: 'tiktok', name: 'TikTok', icon: '🎵', color: '#000000' },
  ];

  const verificationMethods = [
    {
      id: 'bio_link' as const,
      title: 'Add to Bio/Description',
      description: 'Add verification code to your profile bio',
      icon: '📝',
      difficulty: 'Easy',
    },
    {
      id: 'post_mention' as const,
      title: 'Create a Post',
      description: 'Post about Swaap with verification code',
      icon: '📮',
      difficulty: 'Easy',
    },
    {
      id: 'username_match' as const,
      title: 'Username Match',
      description: 'Verify your profile name matches',
      icon: '👤',
      difficulty: 'Easiest',
    },
  ];

  useEffect(() => {
    fetchSocialVerifications();
    // ✅ REMOVED: Auto-fix trust score - let it show actual values
  }, []);

  // ✅ FIXED: Calculate trust score properly based on actual verifications
  const calculateTrustScore = (userData: any) => {
    let score = 0;
    
    // Email verification (20 points)
    if (userData?.emailVerified || userData?.email) {
      score += 20;
    }
    
    // Phone verification (20 points) 
    if (userData?.phoneVerified || userData?.mobile) {
      score += 20;
    }
    
    // Address verification (20 points)
    if (userData?.addressVerified) {
      score += 20;
    }
    
    // Identity verification (20 points)
    if (userData?.identityVerified) {
      score += 20;
    }
    
    // Social media verification (20 points)
    if (userData?.socialVerifications?.some((v: any) => v.status === 'verified')) {
      score += 20;
    }
    
    console.log('📊 Trust score calculation:', {
      email: userData?.emailVerified || userData?.email ? 20 : 0,
      phone: userData?.phoneVerified || userData?.mobile ? 20 : 0,
      address: userData?.addressVerified ? 20 : 0,
      identity: userData?.identityVerified ? 20 : 0,
      social: userData?.socialVerifications?.some((v: any) => v.status === 'verified') ? 20 : 0,
      total: score
    });
    
    return score;
  };

  const refreshUserData = async () => {
    try {
      console.log('🔄 Refreshing user data from server...');
      const userResponse = await apiClient.get('/api/auth/me');
      let updatedUser = userResponse.data.user || userResponse.data;
      
      if (!updatedUser) {
        const altResponse = await apiClient.get('/api/users/me');
        updatedUser = altResponse.data.user || altResponse.data;
      }
      
      if (updatedUser) {
        // ✅ FIXED: Calculate trust score properly instead of forcing 100
        const calculatedScore = calculateTrustScore(updatedUser);
        updatedUser.trustScore = calculatedScore;
        
        console.log('📥 Updated user data:', {
          trustScore: updatedUser.trustScore,
          socialVerifications: updatedUser.socialVerifications?.length || 0,
        });
        
        dispatch(setUser(updatedUser));
        await AsyncStorage.setItem('@user_data', JSON.stringify(updatedUser));
        
        console.log('✅ User data refreshed successfully');
        return updatedUser;
      } else {
        throw new Error('No user data received from server');
      }
    } catch (refreshError) {
      console.error('❌ Failed to refresh user data:', refreshError);
      throw refreshError;
    }
  };

  const fetchSocialVerifications = async () => {
    try {
      const data = await apiClient.get('/api/verification/social');
      if (data.success) {
        setUserVerifications(data.data.verifications || []);
      }
    } catch (error) {
      console.error('Error fetching social verifications:', error);
    }
  };

  // ✅ FIXED: Only recalculate trust score, don't force to 100
  const recalculateTrustScore = async () => {
    try {
      console.log('🔧 Recalculating trust score...');
      setLoading(true);
      
      if (!user) {
        Alert.alert('Error', 'No user data available');
        return;
      }
      
      const calculatedScore = calculateTrustScore(user);
      const updatedUser = { ...user, trustScore: calculatedScore };
      
      dispatch(setUser(updatedUser));
      await AsyncStorage.setItem('@user_data', JSON.stringify(updatedUser));
      
      Alert.alert(
        'Trust Score Updated! 🎯',
        `Your trust score is: ${calculatedScore}/100\n\n` +
        `Based on your current verifications:\n` +
        `${user?.emailVerified || user?.email ? '✅' : '❌'} Email (20 pts)\n` +
        `${user?.phoneVerified || user?.mobile ? '✅' : '❌'} Phone (20 pts)\n` +
        `${user?.addressVerified ? '✅' : '❌'} Address (20 pts)\n` +
        `${user?.identityVerified ? '✅' : '❌'} Identity (20 pts)\n` +
        `${user?.socialVerifications?.some((v: any) => v.status === 'verified') ? '✅' : '❌'} Social Media (20 pts)`
      );
    } catch (error) {
      console.error('❌ Recalculation failed:', error);
      Alert.alert('Error', 'Failed to recalculate trust score');
    } finally {
      setLoading(false);
    }
  };

  const handlePlatformSelect = (platformId: string, platformName: string) => {
    const verification = getVerificationStatus(platformId);
    
    if (verification?.status === 'verified') {
      Alert.alert(
        'Already Verified',
        `Your ${platformName} account is already verified!`,
        [{ text: 'OK' }]
      );
      return;
    }

    if (verification?.status === 'pending') {
      Alert.alert(
        'Verification in Progress',
        `You have a pending ${platformName} verification. Would you like to continue with it or start over?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Continue Verification', 
            onPress: () => checkPendingVerification(platformId)
          },
          { 
            text: 'Start Over', 
            onPress: () => startNewVerification(platformId, platformName)
          },
        ]
      );
      return;
    }

    startNewVerification(platformId, platformName);
  };

  const startNewVerification = (platformId: string, platformName: string) => {
    setSelectedPlatform(platformId);
    setUsername('');
    setVerificationMethod('bio_link');
    setShowSetupModal(true);
  };

  const checkPendingVerification = async (platformId: string) => {
    const verification = userVerifications.find(v => v.platform === platformId && v.status === 'pending');
    if (verification) {
      const mockData: VerificationData = {
        platform: verification.platform,
        username: verification.username,
        profileUrl: verification.profileUrl || '',
        verificationMethod: verification.verificationMethod,
        verificationCode: verification.verificationCode,
        instructions: {
          title: 'Continue Verification',
          instructions: ['Follow the previous instructions', 'Click verify when ready'],
          estimatedTime: '1 minute'
        },
        expiresIn: '24 hours'
      };
      setVerificationData(mockData);
      setShowInstructionsModal(true);
    }
  };

  const initiateVerification = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter your username');
      return;
    }

    setLoading(true);
    try {
      const data = await apiClient.post('/api/verification/social/initiate', {
        platform: selectedPlatform,
        username: username.trim(),
        verificationMethod,
      });
      
      if (data.success) {
        setVerificationData(data.data);
        setShowSetupModal(false);
        setShowInstructionsModal(true);
        await fetchSocialVerifications();
      } else {
        Alert.alert('Error', data.message || 'Failed to initiate verification');
      }
    } catch (error: any) {
      console.error('Error initiating verification:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const completeVerification = async () => {
    if (!verificationData) return;

    setVerifying(true);
    try {
      console.log('🔄 Starting verification completion for:', verificationData.platform);
      
      const data = await apiClient.post('/api/verification/social/complete', {
        platform: verificationData.platform,
      });
      
      if (data.success) {
        console.log('✅ Social verification completed:', {
          platform: verificationData.platform,
          trustScoreIncrease: data.data.trustScoreIncrease,
          newTrustScore: data.data.newTrustScore
        });

        // Update Redux store with the verified social platform
        dispatch(updateSocialVerificationStatus({
          platform: verificationData.platform,
          status: 'verified',
          verifiedAt: new Date().toISOString()
        }));

        // ✅ FIXED: Properly update trust score with actual increase
        const updatedUser = { 
          ...user, 
          trustScore: data.data.newTrustScore,
          socialVerifications: [
            ...(user?.socialVerifications || []),
            {
              platform: verificationData.platform,
              status: 'verified',
              username: verificationData.username,
              verifiedAt: new Date().toISOString()
            }
          ]
        };
        dispatch(setUser(updatedUser));
        await AsyncStorage.setItem('@user_data', JSON.stringify(updatedUser));

        Alert.alert(
          'Success! 🎉',
          `${verificationData.platform} verification completed!\n\n+${data.data.trustScoreIncrease} trust points earned\nNew trust score: ${data.data.newTrustScore}/100`,
          [
            {
              text: 'Great!',
              onPress: () => {
                setShowInstructionsModal(false);
                setVerificationData(null);
                fetchSocialVerifications();
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Verification Failed',
          data.message + '\n\n' + (data.data?.nextSteps?.join('\n') || ''),
          [
            { text: 'OK' },
            ...(data.data?.canRetry ? [{
              text: 'Try Again',
              onPress: () => completeVerification()
            }] : [])
          ]
        );
      }
    } catch (error: any) {
      console.error('Error completing verification:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const openProfileUrl = (url: string) => {
    Linking.openURL(url).catch(err => {
      console.error('Error opening URL:', err);
      Alert.alert('Error', 'Could not open profile URL');
    });
  };

  const getVerificationStatus = (platformId: string): SocialVerification | undefined => {
    return userVerifications.find(v => v.platform === platformId);
  };

  const getPlatformDisplayName = (platformId: string): string => {
    return platforms.find(p => p.id === platformId)?.name || platformId;
  };

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          
          <Text style={styles.title}>Social Media Verification</Text>
          <Text style={styles.subtitle}>
            Connect any social media account to earn +20 trust points
          </Text>
          
          {/* ✅ FIXED: Trust Score Display (shows actual score) */}
          <View style={styles.trustScoreCard}>
            <Text style={styles.trustScoreLabel}>Current Trust Score:</Text>
            <Text style={styles.trustScoreValue}>{user?.trustScore || 0}/100</Text>
          </View>
        </View>

        {/* ✅ FIXED: Recalculate Button (not force to 100) */}
        <View style={styles.debugSection}>
          <TouchableOpacity 
            style={[styles.debugButton, loading && styles.disabledButton]}
            onPress={recalculateTrustScore}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text style={styles.debugButtonText}>Recalculate Trust Score</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>🎯 Why Verify Social Media?</Text>
          <View style={styles.benefitsList}>
            <Text style={styles.benefit}>• Earn +20 bonus trust points</Text>
            <Text style={styles.benefit}>• Show other users you're authentic</Text>
            <Text style={styles.benefit}>• Get priority in search results</Text>
            <Text style={styles.benefit}>• Access to premium features</Text>
          </View>
        </View>

        {/* Platforms List */}
        <View style={styles.platformsSection}>
          <Text style={styles.sectionTitle}>Choose a Platform</Text>
          <Text style={styles.sectionSubtitle}>
            You only need to verify one platform to get the bonus points
          </Text>
          
          {platforms.map((platform) => {
            const verification = getVerificationStatus(platform.id);
            const status = verification?.status || 'not_started';
            
            return (
              <TouchableOpacity
                key={platform.id}
                style={[
                  styles.platformCard,
                  status === 'verified' && styles.verifiedCard,
                  status === 'pending' && styles.pendingCard,
                ]}
                onPress={() => handlePlatformSelect(platform.id, platform.name)}
              >
                <View style={styles.platformHeader}>
                  <View style={styles.platformInfo}>
                    <Text style={styles.platformIcon}>{platform.icon}</Text>
                    <View style={styles.platformDetails}>
                      <Text style={styles.platformName}>{platform.name}</Text>
                      <Text style={styles.platformDescription}>
                        {status === 'verified' 
                          ? `@${verification?.username} - Verified` 
                          : status === 'pending'
                          ? `@${verification?.username} - Verification pending`
                          : `Verify your ${platform.name} account`
                        }
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.platformStatus}>
                    {status === 'verified' ? (
                      <View style={styles.statusBadge}>
                        <Text style={styles.verifiedText}>✓ Verified</Text>
                      </View>
                    ) : status === 'pending' ? (
                      <View style={[styles.statusBadge, styles.pendingBadge]}>
                        <Text style={styles.pendingText}>⏳ Pending</Text>
                      </View>
                    ) : status === 'failed' ? (
                      <View style={[styles.statusBadge, styles.failedBadge]}>
                        <Text style={styles.failedText}>❌ Failed</Text>
                      </View>
                    ) : (
                      <View style={styles.pointsBadge}>
                        <Text style={styles.pointsText}>+20 pts</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Setup Modal */}
      <Modal
        visible={showSetupModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSetupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              Verify {getPlatformDisplayName(selectedPlatform)}
            </Text>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Username</Text>
              <TextInput
                style={styles.textInput}
                placeholder={`Enter your ${getPlatformDisplayName(selectedPlatform)} username`}
                placeholderTextColor="#888"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.inputHint}>
                Enter without @ symbol (e.g., "johndoe")
              </Text>
            </View>

            <View style={styles.methodSection}>
              <Text style={styles.inputLabel}>Verification Method</Text>
              {verificationMethods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.methodCard,
                    verificationMethod === method.id && styles.selectedMethodCard
                  ]}
                  onPress={() => setVerificationMethod(method.id)}
                >
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodIcon}>{method.icon}</Text>
                    <View style={styles.methodDetails}>
                      <Text style={styles.methodTitle}>{method.title}</Text>
                      <Text style={styles.methodDescription}>{method.description}</Text>
                    </View>
                  </View>
                  <Text style={styles.methodDifficulty}>{method.difficulty}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowSetupModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.continueButton, (!username.trim() || loading) && styles.disabledButton]}
                onPress={initiateVerification}
                disabled={!username.trim() || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={styles.continueButtonText}>Continue</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Instructions Modal */}
      <Modal
        visible={showInstructionsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInstructionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {verificationData && (
              <>
                <Text style={styles.modalTitle}>
                  {verificationData.instructions.title}
                </Text>

                <View style={styles.codeSection}>
                  <Text style={styles.codeLabel}>Your Verification Code:</Text>
                  <View style={styles.codeContainer}>
                    <Text style={styles.verificationCode}>
                      {verificationData.verificationCode}
                    </Text>
                  </View>
                  <Text style={styles.codeHint}>
                    Expires in {verificationData.expiresIn}
                  </Text>
                </View>

                <View style={styles.instructionsSection}>
                  <Text style={styles.instructionsTitle}>Instructions:</Text>
                  {verificationData.instructions.instructions.map((instruction, index) => (
                    <Text key={index} style={styles.instructionItem}>
                      {index + 1}. {instruction}
                    </Text>
                  ))}
                  <Text style={styles.estimatedTime}>
                    ⏱️ Estimated time: {verificationData.instructions.estimatedTime}
                  </Text>
                </View>

                {verificationData.profileUrl && (
                  <TouchableOpacity
                    style={styles.openProfileButton}
                    onPress={() => openProfileUrl(verificationData.profileUrl)}
                  >
                    <Text style={styles.openProfileButtonText}>
                      🔗 Open {getPlatformDisplayName(verificationData.platform)} Profile
                    </Text>
                  </TouchableOpacity>
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowInstructionsModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.verifyButton, verifying && styles.disabledButton]}
                    onPress={completeVerification}
                    disabled={verifying}
                  >
                    {verifying ? (
                      <ActivityIndicator color="#000" size="small" />
                    ) : (
                      <Text style={styles.verifyButtonText}>✓ Verify Now</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
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
    marginBottom: 16,
  },
  trustScoreCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  trustScoreLabel: {
    fontSize: 16,
    color: '#CCCCCC',
    fontWeight: '500',
  },
  trustScoreValue: {
    fontSize: 24,
    color: COLORS.gold,
    fontWeight: 'bold',
  },
  debugSection: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  debugButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  debugButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoSection: {
    backgroundColor: '#1E1E1E',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  benefitsList: {
    gap: 8,
  },
  benefit: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
  },
  platformsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
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
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
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
  bottomPadding: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#404040',
  },
  inputHint: {
    fontSize: 12,
    color: '#AAAAAA',
    marginTop: 4,
  },
  methodSection: {
    marginBottom: 20,
  },
  methodCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#404040',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedMethodCard: {
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
  },
  methodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  methodDetails: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  methodDescription: {
    fontSize: 12,
    color: '#AAAAAA',
  },
  methodDifficulty: {
    fontSize: 12,
    color: COLORS.gold,
    fontWeight: 'bold',
  },
  codeSection: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 14,
    color: '#AAAAAA',
    marginBottom: 8,
  },
  codeContainer: {
    backgroundColor: '#404040',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  verificationCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.gold,
    fontFamily: 'monospace',
  },
  codeHint: {
    fontSize: 12,
    color: '#AAAAAA',
  },
  instructionsSection: {
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  instructionItem: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 8,
    lineHeight: 20,
  },
  estimatedTime: {
    fontSize: 12,
    color: COLORS.gold,
    marginTop: 8,
    fontStyle: 'italic',
  },
  openProfileButton: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  openProfileButtonText: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#404040',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  continueButton: {
    flex: 1,
    backgroundColor: COLORS.gold,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  verifyButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default SocialVerificationScreen;