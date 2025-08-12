import React from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator 
} from 'react-native';
import COLORS from '@/constants/colors';

interface VerificationMethod {
  id: 'bio_link' | 'post_mention' | 'username_match';
  title: string;
  description: string;
  icon: string;
  difficulty: string;
}

interface VerificationModalProps {
  visible: boolean;
  platformName: string;
  username: string;
  verificationMethod: 'bio_link' | 'post_mention' | 'username_match';
  loading: boolean;
  onClose: () => void;
  onUsernameChange: (username: string) => void;
  onMethodChange: (method: 'bio_link' | 'post_mention' | 'username_match') => void;
  onContinue: () => void;
}

const verificationMethods: VerificationMethod[] = [
  {
    id: 'bio_link',
    title: 'Add to Bio/Description',
    description: 'Add verification code to your profile bio',
    icon: '📝',
    difficulty: 'Easy',
  },
  {
    id: 'post_mention',
    title: 'Create a Post',
    description: 'Post about Swaap with verification code',
    icon: '📮',
    difficulty: 'Easy',
  },
  {
    id: 'username_match',
    title: 'Username Match',
    description: 'Verify your profile name matches',
    icon: '👤',
    difficulty: 'Easiest',
  },
];

export const VerificationModal: React.FC<VerificationModalProps> = ({
  visible,
  platformName,
  username,
  verificationMethod,
  loading,
  onClose,
  onUsernameChange,
  onMethodChange,
  onContinue,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={modalStyles.modalOverlay}>
        <View style={modalStyles.modalContainer}>
          <Text style={modalStyles.modalTitle}>
            Verify {platformName}
          </Text>

          <View style={modalStyles.inputSection}>
            <Text style={modalStyles.inputLabel}>Username</Text>
            <TextInput
              style={modalStyles.textInput}
              placeholder={`Enter your ${platformName} username`}
              placeholderTextColor="#888"
              value={username}
              onChangeText={onUsernameChange}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={modalStyles.inputHint}>
              Enter without @ symbol (e.g., "johndoe")
            </Text>
          </View>

          <View style={modalStyles.methodSection}>
            <Text style={modalStyles.inputLabel}>Verification Method</Text>
            {verificationMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  modalStyles.methodCard,
                  verificationMethod === method.id && modalStyles.selectedMethodCard
                ]}
                onPress={() => onMethodChange(method.id)}
              >
                <View style={modalStyles.methodInfo}>
                  <Text style={modalStyles.methodIcon}>{method.icon}</Text>
                  <View style={modalStyles.methodDetails}>
                    <Text style={modalStyles.methodTitle}>{method.title}</Text>
                    <Text style={modalStyles.methodDescription}>{method.description}</Text>
                  </View>
                </View>
                <Text style={modalStyles.methodDifficulty}>{method.difficulty}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={modalStyles.modalActions}>
            <TouchableOpacity
              style={modalStyles.cancelButton}
              onPress={onClose}
            >
              <Text style={modalStyles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                modalStyles.continueButton, 
                (!username.trim() || loading) && modalStyles.disabledButton
              ]}
              onPress={onContinue}
              disabled={!username.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Text style={modalStyles.continueButtonText}>Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
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
  disabledButton: {
    opacity: 0.5,
  },
});