// store/redux/slices/authSlice.ts - FRONTEND ONLY (20-point trust score system)
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// ✅ UPDATED ExtendedUser TYPE - 5-step system (Email, Phone, Address, Identity, Social)
interface ExtendedUser {
  _id: string;
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  photoURL?: string;
  role: 'user' | 'admin';
  successfulSwaps: number;
  plan: 'free' | 'pro';
  proSince?: string;
  createdAt?: string;
  updatedAt?: string;
  
  walletBalance: number;
  
  // Virtual Account fields
  virtualAccountNumber?: string;
  virtualAccountName?: string;
  virtualBankName?: string;
  virtualAccountActive: boolean;
  
  verified: boolean;
  
  // Address
  address: {
    country: string;
    state: string;
    city: string;
    street: string;
    verified: boolean;
  };
  
  // Location fields
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  locationUpdatedAt?: string;
  maxSearchRadius: number;
  locationSharing: boolean;
  
  // ✅ UPDATED: 5-step verification fields (Email, Phone, Address, Identity, Social)
  phoneVerified: boolean;
  emailVerified: boolean;
  identityVerified: boolean;
  addressVerified: boolean;
  verificationLevel: number; // 0-4 scale (core only, excludes social)
  trustScore: number; // 0-100 scale (5 × 20 points)
  
  // ✅ UPDATED: Social media verifications (20 points if ANY platform verified)
  socialVerifications?: {
    platform: 'twitter' | 'facebook' | 'instagram' | 'linkedin' | 'tiktok';
    username: string;
    profileUrl?: string;
    verificationMethod: 'bio_link' | 'post_mention' | 'username_match';
    status: 'pending' | 'verified' | 'failed';
    verifiedAt?: string;
    createdAt: string;
  }[];
  
  // ✅ NEW: Verification tracking object
  verifications?: {
    email?: {
      completed: boolean;
      verifiedAt?: string;
      verificationToken?: string;
    };
    phone?: {
      completed: boolean;
      verifiedAt?: string;
      phoneNumber?: string;
    };
    address?: {
      completed: boolean;
      verifiedAt?: string;
      addressDetails?: any;
    };
    identity?: {
      completed: boolean;
      verifiedAt?: string;
      documentType?: string;
      uploadId?: string;
    };
  };
  
  // Activity fields
  lastSeen?: string;
  isActive: boolean;
  rating: number;
  successfulSales: number;
  
  // Preference fields
  nearbyNotifications: boolean;
  verifiedUsersOnly: boolean;
  
  // Virtual fields
  level?: string;
  isPro: boolean;
  isAdmin: boolean;
  isVerified: boolean;
}

interface AuthState {
  user: ExtendedUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

// ✅ UPDATED: New 20-point trust score calculation (5 categories × 20 points = 100)
const calculateTrustScore = (user: ExtendedUser): number => {
  let score = 0;
  
  // 🔧 NEW SYSTEM: Each category worth 20 points
  if (user.emailVerified) score += 20;         // Email verification: 20 points
  if (user.phoneVerified) score += 20;        // Phone verification: 20 points  
  if (user.addressVerified) score += 20;      // Address verification: 20 points
  if (user.identityVerified) score += 20;     // Identity verification: 20 points
  
  // Social media verification: 20 points (any verified social platform)
  if (user.socialVerifications && user.socialVerifications.some(v => v.status === 'verified')) {
    score += 20;
  }
  
  return Math.min(score, 100); // Max 100 (5 × 20)
};

// ✅ UPDATED: 4-step verification level calculation (excludes social)
const calculateVerificationLevel = (user: ExtendedUser): number => {
  let level = 0;
  
  // Count completed core verification steps (0-4, excludes social)
  if (user.emailVerified) level++;
  if (user.phoneVerified) level++;
  if (user.addressVerified) level++;
  if (user.identityVerified) level++;
  
  return level;
};

// ✅ UPDATED: Helper to normalize user data - 20-point system
const normalizeUser = (rawUser: any): ExtendedUser | null => {
  try {
    console.log('🔄 normalizeUser called with:', {
      hasRawUser: !!rawUser,
      rawUserType: typeof rawUser,
      rawUserKeys: rawUser ? Object.keys(rawUser) : 'no keys'
    });
    
    if (!rawUser) return null;
    
    if (typeof rawUser !== 'object') {
      console.warn('⚠️ normalizeUser: rawUser is not an object:', typeof rawUser);
      return null;
    }
    
    // Handle nested user objects
    if ('user' in rawUser) {
      console.log('🔄 normalizeUser: Found nested user object, recursing...');
      return normalizeUser(rawUser.user);
    }
  
  // Ensure all required fields exist with defaults
  const user: ExtendedUser = {
    _id: rawUser._id || rawUser.id,
    id: rawUser.id || rawUser._id,
    fullName: rawUser.fullName || '',
    email: rawUser.email || '',
    mobile: rawUser.mobile || '',
    photoURL: rawUser.photoURL,
    role: rawUser.role || 'user',
    successfulSwaps: rawUser.successfulSwaps || 0,
    plan: rawUser.plan || 'free',
    proSince: rawUser.proSince,
    createdAt: rawUser.createdAt,
    updatedAt: rawUser.updatedAt,
    
    walletBalance: rawUser.walletBalance || 0,
    
    // Virtual Account fields
    virtualAccountNumber: rawUser.virtualAccountNumber,
    virtualAccountName: rawUser.virtualAccountName,
    virtualBankName: rawUser.virtualBankName,
    virtualAccountActive: rawUser.virtualAccountActive || false,
    
    verified: rawUser.verified || false,
    
    // Address - safe property access
    address: (rawUser.address && typeof rawUser.address === 'object') ? {
      country: rawUser.address.country || '',
      state: rawUser.address.state || '',
      city: rawUser.address.city || '',
      street: rawUser.address.street || '',
      verified: rawUser.address.verified || false,
    } : {
      country: '',
      state: '',
      city: '',
      street: '',
      verified: false,
    },
    
    // Location fields with defaults
    location: rawUser.location,
    locationUpdatedAt: rawUser.locationUpdatedAt,
    maxSearchRadius: rawUser.maxSearchRadius || 25,
    locationSharing: rawUser.locationSharing !== undefined ? rawUser.locationSharing : true,
    
    // ✅ UPDATED: 5-step verification fields (Email, Phone, Address, Identity, Social)
    phoneVerified: rawUser.phoneVerified || false,
    emailVerified: rawUser.emailVerified || false,
    identityVerified: rawUser.identityVerified || false,
    addressVerified: rawUser.addressVerified || (rawUser.address && rawUser.address.verified) || false,
    verificationLevel: rawUser.verificationLevel || 0,
    trustScore: rawUser.trustScore || 0,
    
    // ✅ NEW: Social media verifications
    socialVerifications: rawUser.socialVerifications || [],
    
    // ✅ NEW: Verification tracking
    verifications: rawUser.verifications,
    
    // Activity fields with defaults
    lastSeen: rawUser.lastSeen,
    isActive: rawUser.isActive !== undefined ? rawUser.isActive : true,
    rating: rawUser.rating || 0,
    successfulSales: rawUser.successfulSales || 0,
    
    // Preference fields with defaults
    nearbyNotifications: rawUser.nearbyNotifications !== undefined ? rawUser.nearbyNotifications : true,
    verifiedUsersOnly: rawUser.verifiedUsersOnly || false,
    
    // Virtual fields
    level: rawUser.level,
    isPro: rawUser.isPro || rawUser.plan === 'pro',
    isAdmin: rawUser.isAdmin || rawUser.role === 'admin',
    isVerified: rawUser.isVerified || (rawUser.verificationLevel || 0) > 0,
  };
  
  // ✅ Use server values if available, otherwise calculate
  if (rawUser.trustScore !== undefined) {
    user.trustScore = rawUser.trustScore;
  } else {
    user.trustScore = calculateTrustScore(user);
  }
  
  if (rawUser.verificationLevel !== undefined) {
    user.verificationLevel = rawUser.verificationLevel;
  } else {
    user.verificationLevel = calculateVerificationLevel(user);
  }
  
  user.isVerified = user.verificationLevel > 0;
  
  console.log('✅ normalizeUser completed successfully');
  return user;
  
  } catch (error) {
    console.error('❌ normalizeUser error:', error);
    console.error('❌ normalizeUser error details:', {
      errorMessage: error?.message,
      errorStack: error?.stack,
      rawUserProvided: !!rawUser,
      rawUserType: typeof rawUser
    });
    return null;
  }
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Authentication actions
    setAuth: (
      state,
      action: PayloadAction<{ user: any; token: string }>
    ) => {
      console.log('🔄 Redux setAuth called with user:', action.payload.user);
      state.user = normalizeUser(action.payload.user);
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
      console.log('✅ Redux setAuth completed, verification data:', {
        phoneVerified: state.user?.phoneVerified,
        trustScore: state.user?.trustScore,
        verificationLevel: state.user?.verificationLevel,
        socialVerifications: state.user?.socialVerifications?.length || 0,
        hasSocialVerified: state.user?.socialVerifications?.some(v => v.status === 'verified') || false
      });
    },
    
    setUser: (state, action: PayloadAction<any>) => {
      try {
        console.log('🔄 Redux setUser called with verification data:', {
          hasPayload: !!action.payload,
          payloadType: typeof action.payload,
          phoneVerified: action.payload?.phoneVerified,
          trustScore: action.payload?.trustScore,
          verificationLevel: action.payload?.verificationLevel,
          socialVerifications: action.payload?.socialVerifications?.length || 0
        });
        
        const normalizedUser = normalizeUser(action.payload);
        state.user = normalizedUser;
        state.isAuthenticated = !!normalizedUser;
        state.loading = false;
        state.error = null;
        
        console.log('✅ Redux setUser completed:', {
          phoneVerified: state.user?.phoneVerified,
          trustScore: state.user?.trustScore,
          verificationLevel: state.user?.verificationLevel,
          socialCount: state.user?.socialVerifications?.filter(v => v.status === 'verified').length || 0
        });
      } catch (error) {
        console.error('❌ Redux setUser error:', error);
        state.error = 'Failed to set user data';
        state.loading = false;
      }
    },
    
    setToken: (state, action: PayloadAction<string | null>) => {
      state.token = action.payload;
      state.isAuthenticated = !!(action.payload && state.user);
    },
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
      if (action.payload) {
        state.error = null;
      }
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    // User profile actions
    updateUserProfile: (
      state,
      action: PayloadAction<{
        fullName?: string;
        email?: string;
        photoURL?: string;
        mobile?: string;
        address?: {
          country?: string;
          state?: string;
          city?: string;
          street?: string;
          verified?: boolean;
        };
      }>
    ) => {
      if (state.user) {
        console.log('🔄 Redux updateUserProfile called with:', action.payload);
        Object.assign(state.user, action.payload);
        
        // Update address fields if provided
        if (action.payload.address) {
          state.user.address = {
            ...state.user.address,
            ...action.payload.address,
          };
          
          // Update addressVerified if address.verified is provided
          if (action.payload.address.verified !== undefined) {
            state.user.addressVerified = action.payload.address.verified;
            
            // Recalculate verification level and trust score
            state.user.verificationLevel = calculateVerificationLevel(state.user);
            state.user.trustScore = calculateTrustScore(state.user);
            state.user.isVerified = state.user.verificationLevel > 0;
          }
        }
        
        // Update timestamp
        state.user.updatedAt = new Date().toISOString();
        console.log('✅ Redux updateUserProfile completed');
      }
    },
    
    // Wallet actions
    updateWalletBalance: (state, action: PayloadAction<number>) => {
      if (state.user) {
        state.user.walletBalance = action.payload;
      }
    },
    
    incrementWalletBalance: (state, action: PayloadAction<number>) => {
      if (state.user) {
        state.user.walletBalance = (state.user.walletBalance || 0) + action.payload;
      }
    },
    
    decrementWalletBalance: (state, action: PayloadAction<number>) => {
      if (state.user) {
        state.user.walletBalance = Math.max(0, (state.user.walletBalance || 0) - action.payload);
      }
    },
    
    // Virtual Account actions
    setVirtualAccount: (
      state,
      action: PayloadAction<{
        virtualAccountNumber: string;
        virtualAccountName: string;
        virtualBankName: string;
        virtualAccountActive: boolean;
      }>
    ) => {
      if (state.user) {
        Object.assign(state.user, action.payload);
      }
    },
    
    // Location actions
    updateUserLocation: (
      state, 
      action: PayloadAction<{
        latitude: number;
        longitude: number;
        city?: string;
        state?: string;
        country?: string;
        address?: string;
      }>
    ) => {
      if (state.user) {
        state.user.location = {
          type: 'Point',
          coordinates: [action.payload.longitude, action.payload.latitude],
        };
        state.user.locationUpdatedAt = new Date().toISOString();
        
        // Update address if location info provided
        if (action.payload.city || action.payload.state || action.payload.country) {
          state.user.address = {
            ...state.user.address,
            city: action.payload.city || state.user.address?.city || '',
            state: action.payload.state || state.user.address?.state || '',
            country: action.payload.country || state.user.address?.country || '',
            street: action.payload.address || state.user.address?.street || '',
          };
        }
      }
    },
    
    updateLocationPreferences: (
      state,
      action: PayloadAction<{
        maxSearchRadius?: number;
        locationSharing?: boolean;
        nearbyNotifications?: boolean;
        verifiedUsersOnly?: boolean;
      }>
    ) => {
      if (state.user) {
        if (action.payload.maxSearchRadius !== undefined) {
          state.user.maxSearchRadius = action.payload.maxSearchRadius;
        }
        if (action.payload.locationSharing !== undefined) {
          state.user.locationSharing = action.payload.locationSharing;
        }
        if (action.payload.nearbyNotifications !== undefined) {
          state.user.nearbyNotifications = action.payload.nearbyNotifications;
        }
        if (action.payload.verifiedUsersOnly !== undefined) {
          state.user.verifiedUsersOnly = action.payload.verifiedUsersOnly;
        }
      }
    },
    
    // ✅ UPDATED: 5-step verification actions (Email, Phone, Address, Identity, Social)
    updateVerificationStatus: (
      state,
      action: PayloadAction<{
        phoneVerified?: boolean;
        emailVerified?: boolean;
        identityVerified?: boolean;
        addressVerified?: boolean;
        verificationLevel?: number;
        trustScore?: number;
        socialVerifications?: ExtendedUser['socialVerifications'];
        verifications?: ExtendedUser['verifications'];
      }>
    ) => {
      if (state.user) {
        console.log('🔄 Redux updateVerificationStatus called with:', action.payload);
        
        // Update individual verification fields
        if (action.payload.phoneVerified !== undefined) {
          state.user.phoneVerified = action.payload.phoneVerified;
        }
        if (action.payload.emailVerified !== undefined) {
          state.user.emailVerified = action.payload.emailVerified;
          state.user.verified = action.payload.emailVerified; // Backward compatibility
        }
        if (action.payload.identityVerified !== undefined) {
          state.user.identityVerified = action.payload.identityVerified;
        }
        if (action.payload.addressVerified !== undefined) {
          state.user.addressVerified = action.payload.addressVerified;
          if (state.user.address) {
            state.user.address.verified = action.payload.addressVerified;
          }
        }
        
        // Update social verifications
        if (action.payload.socialVerifications !== undefined) {
          state.user.socialVerifications = action.payload.socialVerifications;
        }
        
        // Update verification tracking
        if (action.payload.verifications !== undefined) {
          state.user.verifications = action.payload.verifications;
        }
        
        // Use server values if provided, otherwise recalculate
        if (action.payload.trustScore !== undefined) {
          state.user.trustScore = action.payload.trustScore;
        } else {
          state.user.trustScore = calculateTrustScore(state.user);
        }
        
        if (action.payload.verificationLevel !== undefined) {
          state.user.verificationLevel = action.payload.verificationLevel;
        } else {
          state.user.verificationLevel = calculateVerificationLevel(state.user);
        }
        
        // Update virtual isVerified field
        state.user.isVerified = state.user.verificationLevel > 0;
        
        console.log('✅ Redux updateVerificationStatus completed:', {
          phoneVerified: state.user.phoneVerified,
          trustScore: state.user.trustScore,
          verificationLevel: state.user.verificationLevel,
          socialCount: state.user.socialVerifications?.filter(v => v.status === 'verified').length || 0,
          hasSocialVerified: state.user.socialVerifications?.some(v => v.status === 'verified') || false
        });
      }
    },
    
    // ✅ NEW: Complete verification step
    completeVerificationStep: (
      state,
      action: PayloadAction<{
        step: 'email' | 'phone' | 'address' | 'identity';
        data?: any;
      }>
    ) => {
      if (state.user) {
        console.log('🔄 Redux completeVerificationStep called:', action.payload.step);
        
        const { step, data } = action.payload;
        
        // Update the individual verification field
        switch (step) {
          case 'email':
            state.user.emailVerified = true;
            state.user.verified = true; // Backward compatibility
            break;
          case 'phone':
            state.user.phoneVerified = true;
            break;
          case 'address':
            state.user.addressVerified = true;
            if (state.user.address) {
              state.user.address.verified = true;
            }
            break;
          case 'identity':
            state.user.identityVerified = true;
            break;
        }
        
        // Update verifications tracking object
        if (!state.user.verifications) {
          state.user.verifications = {};
        }
        
        state.user.verifications[step] = {
          completed: true,
          verifiedAt: new Date().toISOString(),
          ...data
        };
        
        // Recalculate verification level and trust score
        state.user.verificationLevel = calculateVerificationLevel(state.user);
        state.user.trustScore = calculateTrustScore(state.user);
        state.user.isVerified = state.user.verificationLevel > 0;
        
        console.log('✅ Redux completeVerificationStep completed:', {
          step,
          verificationLevel: state.user.verificationLevel,
          trustScore: state.user.trustScore
        });
      }
    },
    
    // ✅ UPDATED: Social media verification actions (20-point system)
    addSocialVerification: (
      state,
      action: PayloadAction<{
        platform: 'twitter' | 'facebook' | 'instagram' | 'linkedin' | 'tiktok';
        username: string;
        profileUrl?: string;
        verificationMethod: 'bio_link' | 'post_mention' | 'username_match';
      }>
    ) => {
      if (state.user) {
        if (!state.user.socialVerifications) {
          state.user.socialVerifications = [];
        }
        
        // Remove existing verification for this platform
        state.user.socialVerifications = state.user.socialVerifications.filter(
          v => v.platform !== action.payload.platform
        );
        
        // Add new verification
        state.user.socialVerifications.push({
          ...action.payload,
          status: 'pending',
          createdAt: new Date().toISOString()
        });
        
        console.log(`🔄 Added social verification for ${action.payload.platform}`);
      }
    },
    
    updateSocialVerificationStatus: (
      state,
      action: PayloadAction<{
        platform: string;
        status: 'pending' | 'verified' | 'failed';
        verifiedAt?: string;
      }>
    ) => {
      if (state.user?.socialVerifications) {
        const verification = state.user.socialVerifications.find(
          v => v.platform === action.payload.platform
        );
        
        if (verification) {
          const wasVerified = state.user.socialVerifications.some(v => v.status === 'verified');
          verification.status = action.payload.status;
          
          if (action.payload.verifiedAt) {
            verification.verifiedAt = action.payload.verifiedAt;
          }
          
          // Recalculate trust score - in 20-point system, ANY verified social = 20 points
          const isNowVerified = state.user.socialVerifications.some(v => v.status === 'verified');
          state.user.trustScore = calculateTrustScore(state.user);
          
          console.log(`✅ Updated ${action.payload.platform} verification status to ${action.payload.status}`);
          console.log(`🎯 Social verification status: ${wasVerified} → ${isNowVerified}, Trust score: ${state.user.trustScore}`);
        }
      }
    },
    
    // ✅ UPDATED: Individual verification setters (20-point system)
    setPhoneVerified: (state, action: PayloadAction<boolean>) => {
      if (state.user) {
        console.log('🔄 Redux setPhoneVerified called with:', action.payload);
        state.user.phoneVerified = action.payload;
        
        // Recalculate using 20-point system
        state.user.verificationLevel = calculateVerificationLevel(state.user);
        state.user.trustScore = calculateTrustScore(state.user);
        state.user.isVerified = state.user.verificationLevel > 0;
        
        console.log('✅ Redux setPhoneVerified completed:', {
          phoneVerified: state.user.phoneVerified,
          verificationLevel: state.user.verificationLevel,
          trustScore: state.user.trustScore
        });
      }
    },
    
    setEmailVerified: (state, action: PayloadAction<boolean>) => {
      if (state.user) {
        state.user.emailVerified = action.payload;
        state.user.verified = action.payload; // For backward compatibility
        
        state.user.verificationLevel = calculateVerificationLevel(state.user);
        state.user.trustScore = calculateTrustScore(state.user);
        state.user.isVerified = state.user.verificationLevel > 0;
      }
    },
    
    setIdentityVerified: (state, action: PayloadAction<boolean>) => {
      if (state.user) {
        console.log('🔄 Redux setIdentityVerified called with:', action.payload);
        state.user.identityVerified = action.payload;
        
        state.user.verificationLevel = calculateVerificationLevel(state.user);
        state.user.trustScore = calculateTrustScore(state.user);
        state.user.isVerified = state.user.verificationLevel > 0;
        
        console.log('✅ Redux setIdentityVerified completed:', {
          identityVerified: state.user.identityVerified,
          verificationLevel: state.user.verificationLevel,
          trustScore: state.user.trustScore
        });
      }
    },
    
    setAddressVerified: (state, action: PayloadAction<boolean>) => {
      if (state.user) {
        state.user.addressVerified = action.payload;
        if (state.user.address) {
          state.user.address.verified = action.payload;
        }
        
        state.user.verificationLevel = calculateVerificationLevel(state.user);
        state.user.trustScore = calculateTrustScore(state.user);
        state.user.isVerified = state.user.verificationLevel > 0;
      }
    },
    
    // Activity actions
    updateUserActivity: (
      state,
      action: PayloadAction<{
        lastSeen?: string;
        isActive?: boolean;
        rating?: number;
        successfulSwaps?: number;
        successfulSales?: number;
      }>
    ) => {
      if (state.user) {
        Object.assign(state.user, action.payload);
      }
    },
    
    incrementSuccessfulSwaps: (state) => {
      if (state.user) {
        state.user.successfulSwaps = (state.user.successfulSwaps || 0) + 1;
      }
    },
    
    incrementSuccessfulSales: (state) => {
      if (state.user) {
        state.user.successfulSales = (state.user.successfulSales || 0) + 1;
      }
    },
    
    updateUserRating: (state, action: PayloadAction<number>) => {
      if (state.user) {
        state.user.rating = Math.max(0, Math.min(5, action.payload)); // Clamp to 0-5
      }
    },
    
    // Plan actions
    upgradeToPro: (state) => {
      if (state.user) {
        state.user.plan = 'pro';
        state.user.isPro = true;
        state.user.proSince = new Date().toISOString();
      }
    },
    
    downgradeToFree: (state) => {
      if (state.user) {
        state.user.plan = 'free';
        state.user.isPro = false;
        state.user.proSince = undefined;
      }
    },
    
    // Logout action
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
    },
    
    // Reset action
    reset: () => initialState,
  },
});

export const { 
  // Authentication
  setAuth, 
  setUser, 
  setToken, 
  setLoading, 
  setError,
  clearError,
  
  // User Profile
  updateUserProfile,
  
  // Wallet
  updateWalletBalance,
  incrementWalletBalance,
  decrementWalletBalance,
  
  // Virtual Account
  setVirtualAccount,
  
  // Location
  updateUserLocation,
  updateLocationPreferences,
  
  // ✅ UPDATED: 5-step verification actions (Email, Phone, Address, Identity, Social)
  updateVerificationStatus,
  completeVerificationStep,
  setPhoneVerified,
  setEmailVerified,
  setIdentityVerified,
  setAddressVerified,
  
  // ✅ UPDATED: Social media verification actions (20-point system)
  addSocialVerification,
  updateSocialVerificationStatus,
  
  // Activity
  updateUserActivity,
  incrementSuccessfulSwaps,
  incrementSuccessfulSales,
  updateUserRating,
  
  // Plan
  upgradeToPro,
  downgradeToFree,
  
  // General
  logout,
  reset,
} = authSlice.actions;


export default authSlice.reducer;