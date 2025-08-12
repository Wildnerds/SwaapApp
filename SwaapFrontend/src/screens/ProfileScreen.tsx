// screens/ProfileScreen.tsx - COMPLETE UPDATED VERSION WITH AUTO-HIDE AND AUTH FIXES
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '@/store/redux/hooks';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';
import { useAuth } from '@context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Safe imports with fallbacks
let COLORS;
try {
  COLORS = require('@constants/colors').default;
} catch (error) {
  console.log('⚠️ COLORS import failed, using fallback');
  COLORS = {
    gold: '#FFC107',
    background: '#121212',
    text: '#FFFFFF',
  };
}

// Component imports with safety checks
let ProfileAvatar, WalletCard, InfoCard, InfoRow, VirtualAccountSection, 
    ProfileMenuSection, createMenuItems, LogoutButton, LoadingOverlay, 
    ErrorState, VerificationStatusCard, VerificationBadge, SocialVerificationCard, 
    TrustScoreSection, VerificationPrompts;

try {
  ({ ProfileAvatar } = require('@/components/profile/ProfileAvatar'));
} catch (error) {
  console.log('⚠️ ProfileAvatar import failed');
  ProfileAvatar = ({ photoURL, email, onChangePhoto }: any) => (
    <TouchableOpacity onPress={onChangePhoto} style={styles.fallbackAvatar}>
      <Text style={styles.fallbackAvatarText}>
        {email ? email.charAt(0).toUpperCase() : 'U'}
      </Text>
    </TouchableOpacity>
  );
}

try {
  ({ WalletCard } = require('@/components/profile/WalletCard'));
} catch (error) {
  console.log('⚠️ WalletCard import failed');
  WalletCard = ({ balance, onPress }: any) => (
    <TouchableOpacity onPress={onPress} style={styles.fallbackCard}>
      <Text style={styles.fallbackCardTitle}>Wallet Balance</Text>
      <Text style={styles.fallbackCardValue}>₦{balance.toLocaleString()}</Text>
    </TouchableOpacity>
  );
}

try {
  ({ InfoCard } = require('@/components/common/InfoCard'));
} catch (error) {
  console.log('⚠️ InfoCard import failed');
  InfoCard = ({ children, style }: any) => (
    <View style={[styles.fallbackCard, style]}>{children}</View>
  );
}

try {
  ({ InfoRow } = require('@/components/profile/InfoRow'));
} catch (error) {
  console.log('⚠️ InfoRow import failed');
  InfoRow = ({ label, value, customContent, onPress, showChevron }: any) => (
    <TouchableOpacity onPress={onPress} style={styles.fallbackRow}>
      <Text style={styles.fallbackRowLabel}>{label}</Text>
      {customContent || <Text style={styles.fallbackRowValue}>{value}</Text>}
      {showChevron && <Text style={styles.chevron}>›</Text>}
    </TouchableOpacity>
  );
}

try {
  ({ VirtualAccountSection } = require('@/components/profile/VirtualAccountSection'));
} catch (error) {
  console.log('⚠️ VirtualAccountSection import failed');
  VirtualAccountSection = ({ hasVirtualAccount, virtualAccount, loading, onCheckStatus }: any) => (
    <TouchableOpacity onPress={onCheckStatus} style={styles.fallbackCard}>
      <Text style={styles.fallbackCardTitle}>Virtual Account</Text>
      <Text style={styles.fallbackCardValue}>
        {loading ? 'Checking...' : hasVirtualAccount ? 'Available' : 'Not Setup'}
      </Text>
      {virtualAccount?.accountNumber && (
        <Text style={styles.fallbackCardSubtext}>
          Account: {virtualAccount.accountNumber}
        </Text>
      )}
    </TouchableOpacity>
  );
}

try {
  ({ ProfileMenuSection, createMenuItems } = require('@/components/profile/ProfileMenuSection'));
} catch (error) {
  console.log('⚠️ ProfileMenuSection import failed');
  ProfileMenuSection = ({ menuItems }: any) => (
    <View style={styles.fallbackCard}>
      <Text style={styles.fallbackCardTitle}>Menu</Text>
      {menuItems?.map((item: any, index: number) => (
        <TouchableOpacity key={index} onPress={item.onPress} style={styles.fallbackMenuItem}>
          <Text style={styles.fallbackRowLabel}>{item.label}</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
  createMenuItems = (navigation: any) => [
    { label: 'Settings', onPress: () => console.log('Settings pressed') },
    { label: 'Help & Support', onPress: () => console.log('Help pressed') },
    { label: 'Privacy Policy', onPress: () => console.log('Privacy pressed') },
  ];
}

try {
  ({ LogoutButton } = require('@/components/profile/LogoutButton'));
} catch (error) {
  console.log('⚠️ LogoutButton import failed');
  LogoutButton = ({ onPress, loading }: any) => (
    <TouchableOpacity onPress={onPress} style={styles.fallbackLogoutButton}>
      <Text style={styles.fallbackLogoutText}>
        {loading ? 'Logging out...' : 'Log Out'}
      </Text>
    </TouchableOpacity>
  );
}

try {
  ({ VerificationStatusCard } = require('@/components/profile/VerificationStatusCard'));
} catch (error) {
  console.log('⚠️ VerificationStatusCard import failed');
  VerificationStatusCard = ({ user, onPress, style, verificationSummary }: any) => (
    <TouchableOpacity onPress={onPress} style={[styles.fallbackCard, style]}>
      <Text style={styles.fallbackCardTitle}>Verification Status</Text>
      <Text style={styles.fallbackCardValue}>
        {verificationSummary?.completed || 0}/{verificationSummary?.total || 5} completed
      </Text>
      <Text style={styles.fallbackCardSubtext}>
        Trust Score: {user?.trustScore || 0}/100
      </Text>
    </TouchableOpacity>
  );
}

try {
  ({ VerificationBadge } = require('@/components/verification/VerificationBadge'));
} catch (error) {
  console.log('⚠️ VerificationBadge import failed');
  VerificationBadge = ({ user, size, showText, style }: any) => (
    <View style={[styles.fallbackBadge, style]}>
      <Text style={[styles.fallbackBadgeText, size === 'small' && { fontSize: 10 }]}>
        {showText ? `Level ${user?.verificationLevel || 0}` : '✓'}
      </Text>
    </View>
  );
}

try {
  ({ SocialVerificationCard } = require('@/components/profile/SocialVerificationCard'));
} catch (error) {
  console.log('⚠️ SocialVerificationCard import failed');
  SocialVerificationCard = ({ user, onPress, trustScoreBonus }: any) => (
    <TouchableOpacity onPress={onPress} style={styles.fallbackCard}>
      <Text style={styles.fallbackCardTitle}>Social Verification</Text>
      <Text style={styles.fallbackCardValue}>
        {user?.socialVerifications?.length || 0} connected
      </Text>
      <Text style={styles.fallbackCardSubtext}>
        +{trustScoreBonus} trust score bonus
      </Text>
    </TouchableOpacity>
  );
}

try {
  ({ TrustScoreSection } = require('@/components/profile/TrustScoreSection'));
} catch (error) {
  console.log('⚠️ TrustScoreSection import failed');
  TrustScoreSection = ({ user, verificationSummary, onVerificationPress, onSocialPress }: any) => (
    <View style={styles.fallbackCard}>
      <Text style={styles.fallbackCardTitle}>Trust Score</Text>
      <Text style={styles.fallbackCardValue}>{user?.trustScore || 0}/100</Text>
      <Text style={styles.fallbackCardSubtext}>
        {verificationSummary?.completed || 0} verifications completed
      </Text>
    </View>
  );
}

try {
  ({ VerificationPrompts } = require('@/components/profile/VerificationPrompts'));
} catch (error) {
  console.log('⚠️ VerificationPrompts import failed');
  VerificationPrompts = ({ user, verificationSummary, onVerificationPress, onSocialPress }: any) => (
    <View style={styles.fallbackCard}>
      <Text style={styles.fallbackCardTitle}>Complete Your Verification</Text>
      <Text style={styles.fallbackCardSubtext}>
        {verificationSummary?.nextStep?.name || 'All verifications complete'}
      </Text>
      <View style={styles.fallbackPromptActions}>
        <TouchableOpacity onPress={onVerificationPress} style={styles.fallbackPromptButton}>
          <Text style={styles.fallbackPromptButtonText}>Verify Identity</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onSocialPress} style={styles.fallbackPromptButton}>
          <Text style={styles.fallbackPromptButtonText}>Link Social</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Safe utilities
const getUserLevel = (swaps: number) => {
  if (swaps >= 100) return { level: 'Expert', badge: '🏆' };
  if (swaps >= 50) return { level: 'Advanced', badge: '⭐' };
  if (swaps >= 20) return { level: 'Intermediate', badge: '🥉' };
  if (swaps >= 5) return { level: 'Novice', badge: '🥈' };
  return { level: 'Beginner', badge: '🥇' };
};

function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const dispatch = useAppDispatch();
  
  // ✅ AUTH CONTEXT AS PRIMARY SOURCE
  const { user: authUser, logout, refreshUser } = useAuth();
  
  // Safe Redux state access (keep as fallback)
  const reduxUser = useAppSelector(state => state?.auth?.user);
  const isAuthenticated = useAppSelector(state => state?.auth?.isAuthenticated);
  
  // ✅ Use authUser as primary source, Redux as fallback
  const user = authUser || reduxUser;
  
  // Basic state
  const [loadingUser, setLoadingUser] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [virtualAccountLoading, setVirtualAccountLoading] = useState(false);
  
  // ✅ AUTO-HIDE VERIFICATION STATE
  const [showVerificationPrompts, setShowVerificationPrompts] = useState(true);
  const [completionTimestamp, setCompletionTimestamp] = useState<number | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [hasShownCongrats, setHasShownCongrats] = useState(false);


  // Safe user level calculation
  const { level, badge } = getUserLevel(user?.successfulSwaps || 0);

  // Safe verification summary calculation
  const getVerificationSummary = () => {
    if (!user) return { completed: 0, total: 5, percentage: 0, nextStep: null };

    const verifications = [
      { name: 'Email', completed: user.emailVerified || false, points: 20 },
      { name: 'Phone', completed: user.phoneVerified || false, points: 20 },
      { name: 'Address', completed: user.addressVerified || false, points: 20 },
      { name: 'Identity', completed: user.identityVerified || false, points: 20 },
      { 
        name: 'Social Media', 
        completed: user.socialVerifications?.some((v: any) => v.status === 'verified') || false, 
        points: 20 
      }
    ];

    const completed = verifications.filter(v => v.completed).length;
    const percentage = Math.round((completed / 5) * 100);
    const nextStep = verifications.find(v => !v.completed);

    return {
      completed,
      total: 5,
      percentage,
      nextStep,
      verifications,
      trustScore: user.trustScore || 0,
      maxTrustScore: 100
    };
  };

  // ✅ AUTO-HIDE LOGIC FOR COMPLETED VERIFICATIONS
  useEffect(() => {
    const checkVerificationCompletion = async () => {
      if (!user) return;
      
      const isFullyVerified = user.trustScore >= 100;
      const hasSocialVerification = user.socialVerifications?.some((v: any) => v.status === 'verified');
      const isCompletelyMaxed = isFullyVerified && hasSocialVerification;
      
      if (isCompletelyMaxed) {
        try {
          // Check if we already have a completion timestamp
          const savedTimestamp = await AsyncStorage.getItem('verification_completion_time');
          const hasShownCongratsStorage = await AsyncStorage.getItem('has_shown_verification_congrats');
          
          if (!completionTimestamp && !savedTimestamp) {
            // First time reaching max - save timestamp
            const now = Date.now();
            setCompletionTimestamp(now);
            await AsyncStorage.setItem('verification_completion_time', now.toString());
            
            
            // Show congratulations only if not shown before
            if (!hasShownCongrats && !hasShownCongratsStorage) {
              Alert.alert(
                '🎉 Congratulations!',
                'You\'ve achieved maximum trust score and verification level! You\'re now a fully verified Swaaper.',
                [{ text: 'Awesome!' }]
              );
              
              // Mark as shown
              setHasShownCongrats(true);
              await AsyncStorage.setItem('has_shown_verification_congrats', 'true');
            }
            
            // Auto-hide after 5 minutes (300,000 ms)
            setTimeout(() => {
              setShowVerificationPrompts(false);
            }, 300000);
            
          } else {
            // Load completion timestamp but don't show alert again
            if (savedTimestamp && !completionTimestamp) {
              setCompletionTimestamp(parseInt(savedTimestamp));
            }
            
            // Check existing timestamp
            const timestamp = completionTimestamp || parseInt(savedTimestamp || '0');
            const fiveMinutesAgo = Date.now() - 300000; // 5 minutes in milliseconds
            
            if (timestamp && timestamp < fiveMinutesAgo) {
              setShowVerificationPrompts(false);
            } else {
              setShowVerificationPrompts(true);
            }
          }
        } catch (error) {
          console.error('Error managing completion timestamp:', error);
        }
      } else {
        // Reset if user somehow loses verification
        setShowVerificationPrompts(true);
        setCompletionTimestamp(null);
        try {
          await AsyncStorage.removeItem('verification_completion_time');
        } catch (error) {
          console.error('Error removing completion timestamp:', error);
        }
      }
    };
    
    checkVerificationCompletion();
  }, [user?.trustScore, user?.socialVerifications]); // Remove completionTimestamp from dependencies

  // Safe handlers
  const confirmLogout = useCallback(() => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: handleLogout },
      ],
      { cancelable: true }
    );
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      setLogoutLoading(true);
      console.log('📄 ProfileScreen: Starting logout...');
      
      // AuthContext logout now handles both AsyncStorage and Redux cleanup
      await logout();
      
      console.log('✅ ProfileScreen: Logout completed, navigation should happen automatically');
      
    } catch (error) {
      console.error('❌ ProfileScreen: Logout failed:', error);
      Alert.alert('Logout Error', 'Failed to log out properly. Please try again.');
    } finally {
      setLogoutLoading(false);
    }
  }, [logout]);

  // ✅ UPDATED FETCHUSER WITH BETTER AUTH HANDLING
  const fetchUser = useCallback(async () => {
    try {
      // Debounce: Don't fetch if we just fetched recently (within 2 seconds)
      const now = Date.now();
      if (now - lastFetchTime < 2000) {
        console.log('📄 ProfileScreen: Debouncing fetch request (too recent)');
        return;
      }
      
      setLoadingUser(true);
      setError(null);
      setLastFetchTime(now);
      
      // Check if user is authenticated first
      if (!isAuthenticated && !authUser) {
        setError('Please log in to view your profile');
        return;
      }

      // Check for valid token before making API call
      const token = await AsyncStorage.getItem('@auth_token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      // Call refreshUser with better error handling
      if (refreshUser) {
        await refreshUser();
      }
      
    } catch (err: any) {
      
      // Handle specific error types
      if (err?.message?.includes('Authentication expired') || 
          err?.message?.includes('No authentication token')) {
        setError('Please log in to view your profile');
        // Don't show alert here as AuthContext already handles it
      } else if (err?.status === 404) {
        setError('User profile not found');
      } else {
        setError(err?.message || 'Failed to load profile');
      }
    } finally {
      setLoadingUser(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, authUser, refreshUser, lastFetchTime]);

  const checkVirtualAccountStatus = useCallback(async () => {
    try {
      setVirtualAccountLoading(true);
      
      setTimeout(() => {
        setVirtualAccountLoading(false);
      }, 1000);
      
    } catch (err: any) {
      Alert.alert('Error', 'Failed to check virtual account status.');
    } finally {
      setVirtualAccountLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUser();
  }, [fetchUser]);

  // Safe navigation handlers
  const handleEditProfile = useCallback(() => {
    try {
      navigation.navigate('EditProfile' as never);
    } catch (error) {
      console.error('Navigation to EditProfile failed:', error);
    }
  }, [navigation]);

  const handleWalletPress = useCallback(() => {
    try {
      navigation.navigate('Wallet');
    } catch (error) {
      console.error('Navigation to Wallet failed:', error);
    }
  }, [navigation]);

  const handleVerificationPress = useCallback(() => {
    try {
      navigation.navigate('BasicVerification');
    } catch (error) {
      console.error('Navigation to BasicVerification failed:', error);
    }
  }, [navigation]);

  const handleSocialVerificationPress = useCallback(() => {
    try {
      console.log('📄 ProfileScreen: Navigating to social verification...');
      navigation.navigate('SocialVerification');
    } catch (error) {
      console.error('Navigation to SocialVerification failed:', error);
    }
  }, [navigation]);

  // Safe menu items creation
  const menuItems = (() => {
    try {
      return createMenuItems ? createMenuItems(navigation) : [];
    } catch (error) {
      console.error('Error creating menu items:', error);
      return [];
    }
  })();

  // ✅ UPDATED FOCUS EFFECT - Only refresh if authenticated and not already loading
  useFocusEffect(
    useCallback(() => {
      try {
        // Only refresh if user is authenticated and not already loading
        if (authUser && !loadingUser && !logoutLoading) {
          console.log('📄 ProfileScreen: Screen focused, refreshing user data...');
          fetchUser();
        } else {
          console.log('📄 ProfileScreen: Skipping focus refresh - not authenticated or already loading');
        }
      } catch (error) {
        console.error('Error in useFocusEffect:', error);
      }
    }, [fetchUser, authUser, loadingUser, logoutLoading])
  );

  // Get verification summary safely
  // Initialize hasShownCongrats from storage
  useEffect(() => {
    const initializeCongratsState = async () => {
      try {
        const hasShownCongratsStorage = await AsyncStorage.getItem('has_shown_verification_congrats');
        if (hasShownCongratsStorage === 'true') {
          setHasShownCongrats(true);
        }
      } catch (error) {
        console.error('Error loading congrats state:', error);
      }
    };
    
    initializeCongratsState();
  }, []);

  const verificationSummary = getVerificationSummary();

 

  // ✅ DYNAMIC VERIFICATION SECTIONS RENDERER
  const renderVerificationSections = () => {
    if (!user) return null;
    
    const isFullyVerified = user.trustScore >= 100;
    const hasSocialVerification = user.socialVerifications?.some((v: any) => v.status === 'verified');
    const isCompletelyMaxed = isFullyVerified && hasSocialVerification;
    
    // Show minimal completed card if fully verified and past timer
    if (isCompletelyMaxed && !showVerificationPrompts) {
      return (
        <TouchableOpacity 
          style={styles.completedVerificationCard}
          onPress={() => {
            Alert.alert(
              'Verification Complete! 🎉',
              'You have achieved maximum trust score and verification level. Tap "Show Details" if you want to see verification sections again.',
              [
                { text: 'Keep Hidden', style: 'cancel' },
                { 
                  text: 'Show Details', 
                  onPress: () => setShowVerificationPrompts(true)
                }
              ]
            );
          }}
        >
          <View style={styles.completedVerificationContent}>
            <Text style={styles.completedVerificationTitle}>✅ Fully Verified Swaaper</Text>
            <Text style={styles.completedVerificationSubtitle}>
              Trust Score: {user.trustScore}/100 • Level {user.verificationLevel}/4 • Social Verified
            </Text>
            <Text style={styles.completedVerificationNote}>
              Tap to show verification details
            </Text>
          </View>
        </TouchableOpacity>
      );
    }
    
    // Show normal verification sections
    return (
      <>
        {/* Verification Status Card */}
        <VerificationStatusCard
          user={user}
          onPress={handleVerificationPress}
          style={styles.verificationCard}
          verificationSummary={verificationSummary}
        />

        {/* Social Media Verification - Hide if already verified and past timer */}
        {(!hasSocialVerification || showVerificationPrompts) && (
          <SocialVerificationCard
            user={user}
            onPress={handleSocialVerificationPress}
            trustScoreBonus={20}
          />
        )}

        {/* Trust Score Section */}
        <TrustScoreSection
          user={user}
          verificationSummary={verificationSummary}
          onVerificationPress={handleVerificationPress}
          onSocialPress={handleSocialVerificationPress}
        />

        {/* Verification Prompts - Hide if fully verified and past timer */}
        {(!isFullyVerified || showVerificationPrompts) && (
          <VerificationPrompts
            user={user}
            verificationSummary={verificationSummary}
            onVerificationPress={handleVerificationPress}
            onSocialPress={handleSocialVerificationPress}
            onSyncPress={() => console.log('Sync pressed')}
          />
        )}
      </>
    );
  };

  // Loading state
  if ((!user && loadingUser) || refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.gold} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  // Error state with better messaging
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Profile Error</Text>
        <Text style={styles.errorText}>{error}</Text>
        
        {error.includes('Authentication') || error.includes('log in') ? (
          <View style={styles.authErrorActions}>
            <Text style={styles.authErrorMessage}>
              You need to log in to view your profile
            </Text>
            <TouchableOpacity 
              style={styles.loginButton}
              onPress={() => {
                try {
                  navigation.navigate('Login' as never);
                } catch (navError) {
                  console.error('Navigation to Login failed:', navError);
                  Alert.alert('Error', 'Cannot navigate to login screen');
                }
              }}
            >
              <Text style={styles.loginButtonText}>Go to Login</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.retryButton} onPress={fetchUser}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scrollContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={COLORS.gold}
        />
      }
    >
      <View style={styles.container}>
       

        {/* Profile Header with Avatar and Badge */}
        <View style={styles.avatarSection}>
          <ProfileAvatar
            photoURL={user?.photoURL}
            email={user?.email}
            onChangePhoto={handleEditProfile}
          />
          
          {user && (
            <View style={styles.verificationBadgeContainer}>
              <VerificationBadge 
                user={user} 
                size="large" 
                showText={true}
                style={styles.profileVerificationBadge}
              />
              
              <Text style={styles.trustScoreText}>
                Trust Score: {user.trustScore || 0}/100
              </Text>
            </View>
          )}
        </View>

        {/* ✅ DYNAMIC VERIFICATION SECTIONS */}
        {renderVerificationSections()}

        {/* Virtual Account Section */}
        <VirtualAccountSection
          hasVirtualAccount={user?.hasVirtualAccount || false}
          virtualAccount={user?.virtualAccount}
          loading={virtualAccountLoading}
          onCheckStatus={checkVirtualAccountStatus}
        />

        {/* Wallet Card */}
        <WalletCard
          balance={user?.walletBalance || 0}
          onPress={handleWalletPress}
        />

        {/* User Details */}
        <InfoCard>
          <InfoRow
            label="Full Name"
            customContent={
              <View style={styles.nameWithBadge}>
                <Text style={styles.nameText}>
                  {user?.fullName || user?.displayName || 'Unnamed User'}
                </Text>
                {user && <VerificationBadge user={user} size="small" />}
              </View>
            }
            onPress={handleEditProfile}
            showChevron
          />
          
          <InfoRow
            label="Email"
            customContent={
              <View style={styles.emailWithStatus}>
                <Text style={styles.emailText}>{user?.email}</Text>
                <View style={styles.verificationStatusContainer}>
                  {user?.emailVerified ? (
                    <Text style={styles.verifiedStatus}>✓ Verified (+20 pts)</Text>
                  ) : (
                    <Text style={styles.unverifiedStatus}>⚠ Unverified</Text>
                  )}
                </View>
              </View>
            }
            onPress={handleEditProfile}
            showChevron
          />
          
          <InfoRow
            label="Phone"
            customContent={
              <View style={styles.emailWithStatus}>
                <Text style={styles.emailText}>
                  {user?.mobile || 'Not provided'}
                </Text>
                <View style={styles.verificationStatusContainer}>
                  {user?.phoneVerified ? (
                    <Text style={styles.verifiedStatus}>✓ Verified (+20 pts)</Text>
                  ) : (
                    <Text style={styles.unverifiedStatus}>⚠ Unverified</Text>
                  )}
                </View>
              </View>
            }
            onPress={handleVerificationPress}
            showChevron
          />
          
          <InfoRow label="Successful Swaps" value={user?.successfulSwaps || 0} />
          <InfoRow label="Successful Sales" value={user?.successfulSales || 0} />
          
          <InfoRow 
            label="Verification Level" 
            customContent={
              <Text style={styles.verificationLevelText}>
                Level {user?.verificationLevel || 0}/4 
                {user?.socialVerifications?.some((v: any) => v.status === 'verified') && (
                  <Text style={styles.socialBonusText}> (+Social)</Text>
                )}
              </Text>
            }
          />
        </InfoCard>

        {/* User Reviews Section */}
        {user && (
          <TouchableOpacity
            style={styles.userReviewsCard}
            onPress={() => {
              try {
                navigation.navigate('UserReviews', {
                  userId: user._id || user.id,
                  userName: user.fullName || user.displayName || 'User'
                });
              } catch (error) {
                console.error('Navigation to UserReviews failed:', error);
              }
            }}
          >
            <View style={styles.userReviewsHeader}>
              <Text style={styles.userReviewsTitle}>User Reviews</Text>
              <View style={styles.userReviewsStats}>
                <Text style={styles.userReviewsRating}>
                  ★ {user.averageRating?.toFixed(1) || '0.0'}
                </Text>
                <Text style={styles.userReviewsCount}>
                  ({user.totalReviews || 0} review{user.totalReviews === 1 ? '' : 's'})
                </Text>
              </View>
            </View>
            <Text style={styles.userReviewsSubtext}>
              {user.totalReviews > 0 
                ? 'View all reviews from other users' 
                : 'No reviews yet - complete transactions to receive reviews'}
            </Text>
            <View style={styles.userReviewsChevron}>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Navigation Menu */}
        <ProfileMenuSection menuItems={menuItems} />

        {/* Logout Button */}
        <LogoutButton onPress={confirmLogout} loading={logoutLoading} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    backgroundColor: '#121212',
  },
  container: {
    backgroundColor: '#121212',
    flex: 1,
    padding: 20,
    paddingTop: 60,
    minHeight: '100%',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    color: '#FF4444',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorText: {
    color: '#FF4444',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  authErrorActions: {
    alignItems: 'center',
  },
  authErrorMessage: {
    color: '#CCCCCC',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  loginButton: {
    backgroundColor: '#FFC107',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: 'bold',
  },
  retryButton: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  avatarSection: {
    alignItems: 'center',
    position: 'relative',
    marginBottom: 20,
  },
  verificationBadgeContainer: {
    position: 'absolute',
    bottom: -20,
    alignItems: 'center',
  },
  profileVerificationBadge: {
    backgroundColor: '#121212',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  trustScoreText: {
    fontSize: 12,
    color: '#FFC107',
    fontWeight: 'bold',
    marginTop: 4,
  },
  verificationCard: {
    marginBottom: 16,
  },
  nameWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  nameText: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
  },
  emailWithStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  emailText: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
  },
  verificationStatusContainer: {
    alignItems: 'flex-end',
  },
  verifiedStatus: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  unverifiedStatus: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: 'bold',
  },
  verificationLevelText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  socialBonusText: {
    fontSize: 12,
    color: '#FFC107',
    fontWeight: 'bold',
  },
  // User Reviews Card Styles
  userReviewsCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
    position: 'relative',
  },
  userReviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userReviewsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userReviewsStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userReviewsRating: {
    color: '#FFC107',
    fontSize: 14,
    fontWeight: 'bold',
  },
  userReviewsCount: {
    color: '#aaa',
    fontSize: 12,
  },
  userReviewsSubtext: {
    color: '#ccc',
    fontSize: 12,
    lineHeight: 16,
  },
  userReviewsChevron: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  // ✅ COMPLETED VERIFICATION STYLES
  completedVerificationCard: {
    backgroundColor: '#1B5E20', // Dark green
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  completedVerificationContent: {
    alignItems: 'center',
  },
  completedVerificationTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  completedVerificationSubtitle: {
    color: '#A5D6A7',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
    textAlign: 'center',
  },
  completedVerificationNote: {
    color: '#81C784',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  // ✅ DEBUG SECTION STYLES
  debugSection: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  debugTitle: {
    color: '#FFC107',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  debugText: {
    color: '#CCCCCC',
    fontSize: 12,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  debugRefreshButton: {
    backgroundColor: '#FFC107',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    marginRight: 8,
    alignSelf: 'flex-start',
  },
  debugRefreshText: {
    color: '#121212',
    fontSize: 12,
    fontWeight: 'bold',
  },
  debugToggleButton: {
    backgroundColor: '#2196F3',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  debugToggleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Fallback component styles
  fallbackAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFC107',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  fallbackAvatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#121212',
  },
  fallbackCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  fallbackCardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  fallbackCardValue: {
    color: '#FFC107',
    fontSize: 14,
    fontWeight: 'bold',
  },
  fallbackCardSubtext: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 4,
  },
  fallbackRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  fallbackRowLabel: {
    color: '#fff',
    fontSize: 14,
  },
  fallbackRowValue: {
    color: '#aaa',
    fontSize: 14,
  },
  chevron: {
    color: '#aaa',
    fontSize: 18,
    marginLeft: 8,
  },
  fallbackMenuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  fallbackBadge: {
    backgroundColor: '#FFC107',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  fallbackBadgeText: {
    color: '#121212',
    fontSize: 12,
    fontWeight: 'bold',
  },
  fallbackLogoutButton: {
    backgroundColor: '#E53935',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  fallbackLogoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fallbackPromptActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  fallbackPromptButton: {
    backgroundColor: '#FFC107',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
  },
  fallbackPromptButtonText: {
    color: '#121212',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default ProfileScreen;