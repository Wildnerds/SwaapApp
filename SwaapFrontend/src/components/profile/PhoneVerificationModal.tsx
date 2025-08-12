// components/profile/PhoneVerificationModal.tsx
import React from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '@constants/colors';

interface PhoneVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  phoneNumber: string;
  onPhoneNumberChange: (text: string) => void;
  verificationCode: string;
  onVerificationCodeChange: (text: string) => void;
  isCodeSent: boolean;
  isSendingCode: boolean;
  isVerifyingCode: boolean;
  onSendCode: () => void;
  onVerifyCode: () => void;
  onResendCode: () => void;
}

export const PhoneVerificationModal: React.FC<PhoneVerificationModalProps> = ({
  visible,
  onClose,
  phoneNumber,
  onPhoneNumberChange,
  verificationCode,
  onVerificationCodeChange,
  isCodeSent,
  isSendingCode,
  isVerifyingCode,
  onSendCode,
  onVerifyCode,
  onResendCode,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Change Phone Number</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {!isCodeSent ? (
            <>
              <Text style={styles.modalText}>
                Enter your new phone number. We'll send you a verification code.
              </Text>
              <TextInput
                style={styles.modalInput}
                value={phoneNumber}
                onChangeText={onPhoneNumberChange}
                placeholder="Enter new phone number"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
              />
              <TouchableOpacity
                style={[styles.modalButton, { opacity: isSendingCode ? 0.7 : 1 }]}
                onPress={onSendCode}
                disabled={isSendingCode}
              >
                {isSendingCode ? (
                  <ActivityIndicator size="small" color="#121212" />
                ) : (
                  <Text style={styles.modalButtonText}>Send Code</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.modalText}>
                Enter the 6-digit verification code sent to {phoneNumber}
              </Text>
              <TextInput
                style={styles.modalInput}
                value={verificationCode}
                onChangeText={onVerificationCodeChange}
                placeholder="Enter verification code"
                placeholderTextColor="#666"
                keyboardType="number-pad"
                maxLength={6}
              />
              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.secondaryButton]}
                  onPress={onResendCode}
                >
                  <Text style={styles.secondaryButtonText}>Resend Code</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { flex: 1, opacity: isVerifyingCode ? 0.7 : 1 }]}
                  onPress={onVerifyCode}
                  disabled={isVerifyingCode}
                >
                  {isVerifyingCode ? (
                    <ActivityIndicator size="small" color="#121212" />
                  ) : (
                    <Text style={styles.modalButtonText}>Verify</Text>
                  )}
                </TouchableOpacity>
              </View>
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
  modalContent: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 20,
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
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalText: {
    color: '#ccc',
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 22,
  },
  modalInput: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalButton: {
    backgroundColor: COLORS.gold,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  modalButtonText: {
    color: '#121212',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.gold,
    flex: 1,
  },
  secondaryButtonText: {
    color: COLORS.gold,
    fontWeight: 'bold',
    fontSize: 16,
  },
});