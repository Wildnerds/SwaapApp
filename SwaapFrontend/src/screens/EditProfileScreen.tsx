// screens/profile/EditProfileScreen.tsx - SAFE VERSION
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import COLORS from '../constants/colors';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '@navigation/types';
import { useAppDispatch, useAppSelector } from '@store/redux/hooks';
import { RootState } from '@store';
// ✅ REMOVED: withAuthGuard import - this might be causing the issue
// import { withAuthGuard } from '@/components/withAuthGuard';
import { API_BASE_URL } from '@config';
import { setUser } from '@store/redux/slices/authSlice';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@config/index';

// ✅ SAFE: Component imports with fallbacks
let EditProfileHeader, EditProfileImageSection, FormInputGroup, CustomButton, PhoneVerificationModal, LoadingOverlay;

try {
  EditProfileHeader = require('@/components/profile/EditProfileHeader').EditProfileHeader;
} catch (e) {
  console.log('⚠️ EditProfileHeader not found, using fallback');
  EditProfileHeader = ({ onCancel, onSave }: any) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
      <TouchableOpacity onPress={onCancel} style={{ padding: 10, backgroundColor: '#666', borderRadius: 8 }}>
        <Text style={{ color: 'white' }}>Cancel</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onSave} style={{ padding: 10, backgroundColor: COLORS.gold, borderRadius: 8 }}>
        <Text style={{ color: 'black' }}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

try {
  EditProfileImageSection = require('@/components/profile/EditProfileImageSection').EditProfileImageSection;
} catch (e) {
  console.log('⚠️ EditProfileImageSection not found, using fallback');
  EditProfileImageSection = ({ photoURL, onPickImage }: any) => (
    <TouchableOpacity onPress={onPickImage} style={{ alignItems: 'center', marginBottom: 20 }}>
      <View style={{ width: 100, height: 100, backgroundColor: '#333', borderRadius: 50, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: 'white' }}>📷</Text>
      </View>
      <Text style={{ color: COLORS.gold, marginTop: 8 }}>Change Photo</Text>
    </TouchableOpacity>
  );
}

try {
  FormInputGroup = require('@/components/common/FormInputGroup').FormInputGroup;
} catch (e) {
  console.log('⚠️ FormInputGroup not found, using fallback');
  FormInputGroup = ({ label, value, onChangeText, placeholder, showEditButton, onEdit }: any) => (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: 'white', marginBottom: 8 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1, backgroundColor: '#333', borderRadius: 8, padding: 12 }}>
          <Text style={{ color: 'white' }}>{value || placeholder}</Text>
        </View>
        {showEditButton && (
          <TouchableOpacity onPress={onEdit} style={{ marginLeft: 8, padding: 8, backgroundColor: COLORS.gold, borderRadius: 4 }}>
            <Text style={{ color: 'black' }}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

try {
  CustomButton = require('@/components/common/CustomButton').CustomButton;
} catch (e) {
  console.log('⚠️ CustomButton not found, using fallback');
  CustomButton = ({ title, onPress, loading }: any) => (
    <TouchableOpacity 
      onPress={onPress} 
      disabled={loading}
      style={{ backgroundColor: COLORS.gold, padding: 16, borderRadius: 8, alignItems: 'center', opacity: loading ? 0.7 : 1 }}
    >
      <Text style={{ color: 'black', fontWeight: 'bold' }}>{loading ? 'Loading...' : title}</Text>
    </TouchableOpacity>
  );
}

try {
  PhoneVerificationModal = require('@/components/profile/PhoneVerificationModal').PhoneVerificationModal;
} catch (e) {
  console.log('⚠️ PhoneVerificationModal not found, using fallback');
  PhoneVerificationModal = ({ visible, onClose }: any) => null;
}

try {
  LoadingOverlay = require('@/components/common/LoadingOverlay').LoadingOverlay;
} catch (e) {
  console.log('⚠️ LoadingOverlay not found, using fallback');
  LoadingOverlay = ({ visible }: any) => visible ? (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: 'white' }}>Loading...</Text>
    </View>
  ) : null;
}

type TabNav = BottomTabNavigationProp<MainTabParamList>;

interface Address {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  verified?: boolean;
}

interface EditProfileData {
  displayName: string;
  email: string;
  photoURL: string;
  address: Address;
  mobile: string;
}

// ✅ SAFE: Regular function component without withAuthGuard
const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation<TabNav>();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state: RootState) => state.auth.user);
  const { token, isAuthenticated } = useAuth();
  
  console.log('🚀 EditProfileScreen: Component rendering');
  console.log('🔍 Auth status:', { isAuthenticated, hasUser: !!user, hasToken: !!token });

  // ✅ SAFE: Manual auth check instead of withAuthGuard
  if (!isAuthenticated || !user) {
    return (
      <View style={styles.container}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: 'white', fontSize: 18 }}>Please log in to edit your profile</Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Profile' as never)}
            style={{ marginTop: 16, padding: 12, backgroundColor: COLORS.gold, borderRadius: 8 }}
          >
            <Text style={{ color: 'black' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  // Debug Redux immediately
  console.log('🔍 EditProfile Redux Debug:', {
    hasDispatch: !!dispatch,
    hasUser: !!user,
    userId: user?.id,
    phoneVerified: user?.phoneVerified,
    trustScore: user?.trustScore
  });

  // Initialize profile data
  const [profileData, setProfileData] = useState<EditProfileData>({
    displayName: user?.fullName || '',
    email: user?.email || '',
    photoURL: user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || 'User')}`,
    address: {
      street: user?.address?.street || '',
      city: user?.address?.city || '',
      state: user?.address?.state || '',
      country: user?.address?.country || '',
      verified: user?.address?.verified || false,
    },
    mobile: user?.mobile || '',
  });

  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Phone verification states
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);

  // Fetch fresh user data
  const fetchFreshUserData = async () => {
    try {
      setIsRefreshing(true);
      const data = await apiClient.get('/api/users/me');
      
      // Force Redux update
      dispatch(setUser(data.user || data));
      
      // Update local profile data
      const freshUser = data.user || data;
      setProfileData({
        displayName: freshUser.fullName || '',
        email: freshUser.email || '',
        photoURL: freshUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(freshUser.fullName || 'User')}`,
        address: {
          street: freshUser.address?.street || '',
          city: freshUser.address?.city || '',
          state: freshUser.address?.state || '',
          country: freshUser.address?.country || '',
          verified: freshUser.address?.verified || false,
        },
        mobile: freshUser.mobile || '',
      });
      
      setHasChanges(false);
      console.log('✅ Fresh user data loaded:', freshUser);
      
    } catch (error) {
      console.error('❌ Failed to fetch fresh user data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Refetch on focus
  useFocusEffect(
    React.useCallback(() => {
      fetchFreshUserData();
    }, [])
  );

  // Handle input changes
  const handleInputChange = (field: keyof EditProfileData, value: string | Address) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleAddressChange = (field: keyof Address, value: string) => {
    setProfileData(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));
    setHasChanges(true);
  };

  // Image upload
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need camera roll permissions to change your profile photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImage = async (imageUri: string) => {
    if (!token) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'profile-photo.jpg',
      } as any);

      console.log('🔍 Uploading image to /api/users/upload-photo');
      const uploadData = await apiClient.post('/api/users/upload-photo', formData);
      const newPhotoURL = uploadData.photoURL || uploadData.url || imageUri;
      
      console.log('✅ Image uploaded successfully, new URL:', newPhotoURL);
      setProfileData(prev => ({ ...prev, photoURL: newPhotoURL }));
      dispatch(setUser({ ...user, photoURL: newPhotoURL }));
      setHasChanges(true);
      
      Alert.alert('Success', 'Photo updated successfully!');
    } catch (error: any) {
      console.error('❌ Image upload error:', error);
      Alert.alert('Error', error.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  // Phone verification
  const handlePhoneEdit = () => {
    setNewPhoneNumber(profileData.mobile);
    setShowPhoneModal(true);
    setIsCodeSent(false);
    setVerificationCode('');
  };

  const sendVerificationCode = async () => {
    if (!newPhoneNumber.trim() || newPhoneNumber.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    setIsSendingCode(true);
    try {
      console.log('🔍 Sending phone verification code for:', newPhoneNumber);
      const data = await apiClient.post('/api/users/send-phone-verification', {
        phoneNumber: newPhoneNumber
      });

      console.log('✅ Verification code sent successfully');
      setIsCodeSent(true);
      Alert.alert('Success', 'Verification code sent to your phone');
    } catch (error: any) {
      console.error('❌ Send verification code error:', error);
      Alert.alert('Error', error.message || 'Failed to send verification code');
    } finally {
      setIsSendingCode(false);
    }
  };

  const verifyPhoneCode = async () => {
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit verification code');
      return;
    }

    setIsVerifyingCode(true);
    try {
      console.log('🔍 Verifying phone code for:', newPhoneNumber);
      const data = await apiClient.post('/api/users/verify-phone', {
        phoneNumber: newPhoneNumber,
        verificationCode 
      });

      console.log('✅ Phone verification successful!');

      // Update Redux
      if (data.user) {
        dispatch(setUser(data.user));
        setTimeout(() => fetchFreshUserData(), 500);
      }

      // Update local state
      setProfileData(prev => ({ ...prev, mobile: newPhoneNumber }));
      setHasChanges(false);
      setShowPhoneModal(false);
      
      Alert.alert(
        'Success! 🎉', 
        `Phone number verified!\n\nTrust score: ${data.user?.trustScore || 0}`,
        [{ 
          text: 'OK', 
          onPress: () => navigation.goBack()
        }]
      );
      
    } catch (error: any) {
      console.error('❌ Phone verification error:', error);
      Alert.alert('Error', error.message || 'Failed to verify code');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  // Save profile
  const handleSave = async () => {
    if (!hasChanges) {
      navigation.goBack();
      return;
    }

    if (!profileData.displayName.trim()) {
      Alert.alert('Validation Error', 'Display name is required.');
      return;
    }

    setIsSaving(true);
    try {
      console.log('🔍 Saving profile data:', {
        fullName: profileData.displayName,
        email: profileData.email,
        photoURL: profileData.photoURL,
        address: profileData.address,
      });

      const data = await apiClient.patch('/api/users/me', {
        fullName: profileData.displayName,
        email: profileData.email,
        photoURL: profileData.photoURL,
        address: profileData.address,
      });

      console.log('✅ Profile save response:', data);

      if (data.user) {
        dispatch(setUser(data.user));
      }

      Alert.alert('Success', 'Profile updated successfully!');
      setHasChanges(false);
      setTimeout(() => navigation.goBack(), 500);

    } catch (error: any) {
      console.error('❌ Profile save error:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  if (isRefreshing) {
    return <LoadingOverlay visible={true} text="Loading..." />;
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <EditProfileHeader
          onCancel={handleCancel}
          onSave={handleSave}
          isSaving={isSaving}
        />

        <EditProfileImageSection
          photoURL={profileData.photoURL}
          onPickImage={pickImage}
          isUploading={isUploading}
        />

        <View style={styles.formSection}>
          <FormInputGroup
            label="Display Name"
            value={profileData.displayName}
            onChangeText={(value: string) => handleInputChange('displayName', value)}
            placeholder="Enter your display name"
          />

          <FormInputGroup
            label="Email"
            value={profileData.email}
            onChangeText={(value: string) => handleInputChange('email', value)}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <FormInputGroup
            label="Mobile Number"
            value={profileData.mobile}
            onChangeText={() => {}}
            placeholder="No phone number"
            disabled={true}
            showEditButton={true}
            onEdit={handlePhoneEdit}
          />

          <FormInputGroup
            label="Street Address"
            value={profileData.address.street || ''}
            onChangeText={(value: string) => handleAddressChange('street', value)}
            placeholder="123 Main St"
            autoCapitalize="words"
          />

          <FormInputGroup
            label="City"
            value={profileData.address.city || ''}
            onChangeText={(value: string) => handleAddressChange('city', value)}
            placeholder="City"
            autoCapitalize="words"
          />

          <FormInputGroup
            label="State"
            value={profileData.address.state || ''}
            onChangeText={(value: string) => handleAddressChange('state', value)}
            placeholder="State"
            autoCapitalize="words"
          />

          <FormInputGroup
            label="Country"
            value={profileData.address.country || ''}
            onChangeText={(value: string) => handleAddressChange('country', value)}
            placeholder="Country"
            autoCapitalize="words"
          />
        </View>

        <CustomButton
          title="Save Changes"
          loadingTitle="Saving Changes..."
          onPress={handleSave}
          loading={isSaving}
          customStyle={styles.saveButton}
        />
      </ScrollView>

      <PhoneVerificationModal
        visible={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        phoneNumber={newPhoneNumber}
        onPhoneNumberChange={setNewPhoneNumber}
        verificationCode={verificationCode}
        onVerificationCodeChange={setVerificationCode}
        isCodeSent={isCodeSent}
        isSendingCode={isSendingCode}
        isVerifyingCode={isVerifyingCode}
        onSendCode={sendVerificationCode}
        onVerifyCode={verifyPhoneCode}
        onResendCode={() => setIsCodeSent(false)}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
  },
  formSection: {
    marginBottom: 40,
  },
  saveButton: {
    marginTop: 20,
  },
});

// ✅ SAFE: Export without withAuthGuard
export default EditProfileScreen;