// components/verification/PhoneVerificationPopup.tsx
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { useAppDispatch } from '@store/redux/hooks';
import { setUser } from '@/store/redux/slices/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import COLORS from '@/constants/colors';

interface PhoneVerificationPopupProps {
  visible: boolean;
  user: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const PhoneVerificationPopup: React.FC<PhoneVerificationPopupProps> = ({
  visible,
  user,
  onClose,
  onSuccess,
}) => {
  const dispatch = useAppDispatch();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phoneNumber, setPhoneNumber] = useState(user?.mobile || '');
  const [verificationCode, setVerificationCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [loading, setLoading] = useState(false);

  const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const sendVerificationCode = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }

    setLoading(true);
    try {
      // Generate a 6-digit code
      const code = generateVerificationCode();
      setVerificationCode(code);
      
      // Simulate sending SMS
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setStep('code');
      setLoading(false);
      
      // Show the code in an alert for demo purposes
      Alert.alert(
        'Verification Code Sent! 📱',
        `Your verification code is: ${code}\n\n(In production, this would be sent via SMS)`,
        [{ text: 'Got it!' }]
      );
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Failed to send verification code. Please try again.');
    }
  };

  const verifyCode = async () => {
    if (inputCode !== verificationCode) {
      Alert.alert('Error', 'Invalid verification code. Please try again.');
      return;
    }

    setLoading(true);
    try {
      // Update user data with phone verification
      const updatedUser = {
        ...user,
        mobile: phoneNumber,
        phoneVerified: true,
        trustScore: Math.min((user?.trustScore || 0) + 20, 100), // Add 20 points, max 100
      };

      // Update Redux
      dispatch(setUser(updatedUser));
      
      // Update AsyncStorage
      await AsyncStorage.setItem('@user_data', JSON.stringify(updatedUser));
      
      setLoading(false);
      
      Alert.alert(
        'Phone Verified! ✅',
        `Your phone number has been verified successfully!\n\nTrust Score: +20 points`,
        [
          {
            text: 'Great!',
            onPress: () => {
              onSuccess();
              onClose();
              resetForm();
            }
          }
        ]
      );
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Failed to verify phone number. Please try again.');
    }
  };

  const resendCode = async () => {
    await sendVerificationCode();
  };

  const resetForm = () => {
    setStep('phone');
    setVerificationCode('');
    setInputCode('');
    setPhoneNumber(user?.mobile || '');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {step === 'phone' ? 'Verify Phone Number' : 'Enter Verification Code'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {step === 'phone' ? (
            <>
              <Text style={styles.description}>
                Enter your phone number to receive a verification code
              </Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.textInput}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="+1 (555) 123-4567"
                  placeholderTextColor="#666"
                  keyboardType="phone-pad"
                  autoFocus={true}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.disabledButton]}
                onPress={sendVerificationCode}
                disabled={loading || !phoneNumber.trim()}
              >
                {loading ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Send Code</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.description}>
                Enter the 6-digit code sent to {phoneNumber}
              </Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Verification Code</Text>
                <TextInput
                  style={[styles.textInput, styles.codeInput]}
                  value={inputCode}
                  onChangeText={setInputCode}
                  placeholder="123456"
                  placeholderTextColor="#666"
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus={true}
                  textAlign="center"
                />
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={resendCode}
                >
                  <Text style={styles.secondaryButtonText}>Resend Code</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    styles.flexButton,
                    (loading || inputCode.length !== 6) && styles.disabledButton
                  ]}
                  onPress={verifyCode}
                  disabled={loading || inputCode.length !== 6}
                >
                  {loading ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Verify</Text>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setStep('phone')}
              >
                <Text style={styles.backButtonText}>← Change Phone Number</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 18,
    color: '#CCCCCC',
    fontWeight: 'bold',
  },
  description: {
    fontSize: 16,
    color: '#CCCCCC',
    marginBottom: 24,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#404040',
  },
  codeInput: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 8,
  },
  primaryButton: {
    backgroundColor: COLORS.gold,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
  },
  secondaryButtonText: {
    color: COLORS.gold,
    fontSize: 16,
    fontWeight: 'bold',
  },
  flexButton: {
    flex: 2,
    marginBottom: 0,
  },
  disabledButton: {
    opacity: 0.5,
  },
  backButton: {
    alignItems: 'center',
    padding: 8,
  },
  backButtonText: {
    color: '#CCCCCC',
    fontSize: 14,
  },
});