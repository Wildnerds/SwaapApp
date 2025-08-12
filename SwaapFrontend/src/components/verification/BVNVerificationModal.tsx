// Create: src/components/verification/BVNVerificationModal.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { API_BASE_URL } from '@config';
import COLORS from '@/constants/colors';

interface BVNVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (userData: any) => void;
  token: string;
}

export const BVNVerificationModal: React.FC<BVNVerificationModalProps> = ({
  visible,
  onClose,
  onSuccess,
  token,
}) => {
  const [bvn, setBvn] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const resetForm = () => {
    setBvn('');
    setFirstName('');
    setLastName('');
    setDateOfBirth('');
  };

  const handleClose = () => {
    if (!isVerifying) {
      resetForm();
      onClose();
    }
  };

  const formatBVN = (text: string) => {
    // Only allow numbers and limit to 11 digits
    const cleaned = text.replace(/[^0-9]/g, '');
    return cleaned.slice(0, 11);
  };

  const formatDateOfBirth = (text: string) => {
    // Format as DD/MM/YYYY
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = cleaned;
    
    if (cleaned.length >= 2) {
      formatted = cleaned.substring(0, 2) + '/';
      if (cleaned.length >= 4) {
        formatted += cleaned.substring(2, 4) + '/';
        if (cleaned.length >= 8) {
          formatted += cleaned.substring(4, 8);
        } else {
          formatted += cleaned.substring(4);
        }
      } else {
        formatted += cleaned.substring(2);
      }
    }
    
    return formatted.slice(0, 10); // DD/MM/YYYY = 10 characters
  };

  const validateForm = () => {
    if (!bvn || bvn.length !== 11) {
      Alert.alert('Invalid BVN', 'Please enter a valid 11-digit BVN number');
      return false;
    }
    
    if (!firstName.trim()) {
      Alert.alert('Missing Information', 'Please enter your first name as it appears on your BVN records');
      return false;
    }
    
    if (!lastName.trim()) {
      Alert.alert('Missing Information', 'Please enter your last name as it appears on your BVN records');
      return false;
    }

    // Basic name validation
    if (firstName.trim().length < 2) {
      Alert.alert('Invalid Name', 'First name must be at least 2 characters long');
      return false;
    }

    if (lastName.trim().length < 2) {
      Alert.alert('Invalid Name', 'Last name must be at least 2 characters long');
      return false;
    }

    // Optional: Validate date format if provided
    if (dateOfBirth && dateOfBirth.length === 10) {
      const datePattern = /^\d{2}\/\d{2}\/\d{4}$/;
      if (!datePattern.test(dateOfBirth)) {
        Alert.alert('Invalid Date', 'Please enter date in DD/MM/YYYY format');
        return false;
      }
    }
    
    return true;
  };

  const handleVerifyBVN = async () => {
    if (!validateForm()) return;

    setIsVerifying(true);
    try {
      console.log('🔍 Starting BVN verification...');
      
      const requestBody = {
        bvn: bvn.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ...(dateOfBirth.length === 10 && { dateOfBirth: dateOfBirth }),
      };

      console.log('📤 BVN Request:', { ...requestBody, bvn: '***HIDDEN***' });
      
      const response = await fetch(`${API_BASE_URL}/api/users/verify-bvn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log('📥 BVN Response:', response.status, data);

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 400) {
          throw new Error(data.message || 'Invalid BVN details provided');
        } else if (response.status === 401) {
          throw new Error('Authentication failed. Please login again');
        } else if (response.status === 409) {
          throw new Error('This BVN is already verified by another account');
        } else if (response.status === 422) {
          throw new Error('BVN details do not match bank records');
        } else if (response.status >= 500) {
          throw new Error('Server error. Please try again later');
        } else {
          throw new Error(data.message || 'BVN verification failed');
        }
      }

      console.log('✅ BVN verification successful:', data);

      // Success alert with more details
      Alert.alert(
        'BVN Verified Successfully! 🎉',
        `Your Bank Verification Number has been verified and your trust score has been updated.\n\n✅ Verified: ${data.bvnInfo?.firstName || firstName} ${data.bvnInfo?.lastName || lastName}\n🏆 Trust Score: +20 points\n🔒 Account Security Enhanced`,
        [
          {
            text: 'Continue',
            onPress: () => {
              handleClose();
              if (onSuccess && data.user) {
                onSuccess(data.user);
              }
            },
          },
        ]
      );

    } catch (error: any) {
      console.error('❌ BVN verification error:', error);
      
      let errorTitle = 'Verification Failed';
      let errorMessage = 'Unable to verify BVN. Please try again.';
      
      if (error.message.includes('BVN not found')) {
        errorTitle = 'BVN Not Found';
        errorMessage = 'This BVN was not found in bank records. Please:\n\n• Double-check your 11-digit BVN number\n• Ensure your BVN is active and valid\n• Contact your bank if you\'re sure the BVN is correct';
      } else if (error.message.includes('do not match')) {
        errorTitle = 'Details Don\'t Match';
        errorMessage = 'Your details don\'t match BVN records. Please:\n\n• Check spelling of your names\n• Use names exactly as on your BVN\n• Verify your date of birth\n• Contact your bank to update BVN details if needed';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert(
        errorTitle,
        errorMessage,
        [
          { text: 'OK' },
          ...(error.message.includes('Authentication') ? [
            { text: 'Login Again', onPress: handleClose }
          ] : [])
        ]
      );
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        style={styles.overlay} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <Text style={styles.title}>BVN Verification 🏦</Text>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={handleClose}
                disabled={isVerifying}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.description}>
              Verify your Bank Verification Number to increase your trust score by 20 points and unlock premium features.
            </Text>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>BVN (11 digits) *</Text>
                <TextInput
                  style={[styles.input, bvn.length === 11 && styles.validInput]}
                  value={bvn}
                  onChangeText={(text) => setBvn(formatBVN(text))}
                  placeholder="Enter your 11-digit BVN"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                  maxLength={11}
                  secureTextEntry={true}
                  editable={!isVerifying}
                />
                <Text style={styles.hint}>
                  {bvn.length > 0 ? `${bvn.length}/11 digits` : 'Your 11-digit Bank Verification Number'}
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>First Name *</Text>
                <TextInput
                  style={[styles.input, firstName.trim().length >= 2 && styles.validInput]}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Enter your first name"
                  placeholderTextColor="#666"
                  autoCapitalize="words"
                  editable={!isVerifying}
                />
                <Text style={styles.hint}>Must match your BVN records exactly</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Last Name *</Text>
                <TextInput
                  style={[styles.input, lastName.trim().length >= 2 && styles.validInput]}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Enter your last name"
                  placeholderTextColor="#666"
                  autoCapitalize="words"
                  editable={!isVerifying}
                />
                <Text style={styles.hint}>Must match your BVN records exactly</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Date of Birth (Optional)</Text>
                <TextInput
                  style={[styles.input, dateOfBirth.length === 10 && styles.validInput]}
                  value={dateOfBirth}
                  onChangeText={(text) => setDateOfBirth(formatDateOfBirth(text))}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                  maxLength={10}
                  editable={!isVerifying}
                />
                <Text style={styles.hint}>Format: DD/MM/YYYY (helps with verification)</Text>
              </View>
            </View>

            <View style={styles.security}>
              <Text style={styles.securityTitle}>🔒 Security & Privacy</Text>
              <Text style={styles.securityText}>
                • Your BVN is encrypted and stored securely{'\n'}
                • We only verify your identity, not access your accounts{'\n'}
                • BVN details are never shared with third parties{'\n'}
                • This verification is one-time only{'\n'}
                • All data is protected by bank-level security
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.verifyButton, 
                isVerifying && styles.disabledButton,
                (!bvn || bvn.length !== 11 || !firstName.trim() || !lastName.trim()) && styles.inactiveButton
              ]}
              onPress={handleVerifyBVN}
              disabled={isVerifying || !bvn || bvn.length !== 11 || !firstName.trim() || !lastName.trim()}
              activeOpacity={0.8}
            >
              {isVerifying ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#121212" size="small" />
                  <Text style={styles.loadingText}>Verifying BVN...</Text>
                </View>
              ) : (
                <Text style={styles.verifyButtonText}>
                  Verify BVN & Earn 20 Points
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={handleClose}
              disabled={isVerifying}
            >
              <Text style={[styles.cancelButtonText, isVerifying && styles.disabledText]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#121212',
    borderRadius: 16,
    margin: 20,
    maxHeight: '90%',
    width: '90%',
    borderWidth: 1,
    borderColor: '#333',
  },
  content: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 16,
    color: '#CCCCCC',
    lineHeight: 24,
    marginBottom: 24,
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#333',
  },
  validInput: {
    borderColor: COLORS.gold,
    borderWidth: 1,
  },
  hint: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  security: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.gold,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  securityText: {
    fontSize: 12,
    color: '#CCCCCC',
    lineHeight: 18,
  },
  verifyButton: {
    backgroundColor: COLORS.gold,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  inactiveButton: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  verifyButtonText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#888',
    fontSize: 16,
  },
  disabledText: {
    opacity: 0.5,
  },
});