// screens/IdentityVerificationScreen.tsx
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
import COLORS from '@/constants/colors';

// ✅ Import your apiClient and the new status component
import { apiClient } from '@/config';
import { DocumentTypeSelector } from '@/components/IdentityVerification/DocumentTypeSelector';
import { DocumentUploader } from '@/components/IdentityVerification/DocumentUploader';
import { VerificationProgress } from '@/components/IdentityVerification/VerificationProgress';
import { VerificationStatusChecker } from '@/components/IdentityVerification/VerificationStatusChecker';
import { DebugUploadTest } from '@/components/debug/DebugUploadTest';

interface DocumentUpload {
  uri: string;
  type: string;
  name: string;
  size?: number;
}

export const IdentityVerificationScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { user, token } = useAppSelector((state: RootState) => state.auth);
  
  const [selectedDocType, setSelectedDocType] = useState<string>('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [frontImage, setFrontImage] = useState<DocumentUpload | null>(null);
  const [backImage, setBackImage] = useState<DocumentUpload | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStep, setVerificationStep] = useState<'selection' | 'upload' | 'verification' | 'complete' | 'status'>('selection');

  const documentTypes = [
    {
      id: 'nin',
      title: 'National Identity Number (NIN)',
      subtitle: 'Nigerian National ID',
      icon: '🆔',
      description: 'Upload your NIN slip or card',
      requiresBack: false,
      autoVerifiable: false,
    },
    {
      id: 'drivers_license',
      title: 'Driver\'s License',
      subtitle: 'Valid driving license',
      icon: '🚗',
      description: 'Upload front and back of license',
      requiresBack: true,
      autoVerifiable: false,
    },
    {
      id: 'passport',
      title: 'International Passport',
      subtitle: 'Nigerian passport',
      icon: '📘',
      description: 'Upload passport data page',
      requiresBack: false,
      autoVerifiable: false,
    },
    {
      id: 'voters_card',
      title: 'Voter\'s Card',
      subtitle: 'Permanent Voter\'s Card (PVC)',
      icon: '🗳️',
      description: 'Upload front and back of PVC',
      requiresBack: true,
      autoVerifiable: false,
    },
  ];

  const selectedDoc = documentTypes.find(doc => doc.id === selectedDocType);

  const validateUpload = (): boolean => {
    if (!selectedDoc) {
      Alert.alert('Error', 'Please select a document type.');
      return false;
    }

    if (!frontImage) {
      Alert.alert('Error', 'Please upload the front image of your document.');
      return false;
    }

    if (selectedDoc.requiresBack && !backImage) {
      Alert.alert('Error', 'Please upload the back image of your document.');
      return false;
    }

    // Check file sizes (max 5MB each)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (frontImage.size && frontImage.size > maxSize) {
      Alert.alert('Error', 'Front image is too large. Please select an image under 5MB.');
      return false;
    }

    if (backImage?.size && backImage.size > maxSize) {
      Alert.alert('Error', 'Back image is too large. Please select an image under 5MB.');
      return false;
    }

    return true;
  };

  const uploadDocuments = async () => {
    if (!validateUpload()) return;

    setIsUploading(true);
    setVerificationStep('verification');

    try {
      console.log('📤 Creating FormData...');
      const formData = new FormData();
      
      // ✅ CRITICAL: Append as strings, not objects
      formData.append('documentType', selectedDocType);
      if (documentNumber) {
        formData.append('documentNumber', documentNumber);
      }
      
      console.log('📋 Adding front image...');
      // ✅ FIXED: Proper FormData file append
      formData.append('frontImage', {
        uri: frontImage!.uri,
        type: frontImage!.type || 'image/jpeg',
        name: frontImage!.name || 'front.jpg',
      } as any);

      // ✅ FIXED: Append back image if required
      if (selectedDoc?.requiresBack && backImage) {
        console.log('📋 Adding back image...');
        formData.append('backImage', {
          uri: backImage.uri,
          type: backImage.type || 'image/jpeg',
          name: backImage.name || 'back.jpg',
        } as any);
      }

      console.log('📤 Uploading to API...');
      console.log('📄 Document type:', selectedDocType);
      console.log('🖼️ Front image:', frontImage?.name);
      console.log('🖼️ Back image:', backImage?.name);

      // ✅ Use your updated apiClient with FormData support
      const data = await apiClient.post('/api/verification/identity', formData);

      console.log('✅ Upload successful:', data);
      setVerificationStep('complete');
      Alert.alert(
        'Upload Successful! 📄',
        'Your documents have been uploaded successfully. Our verification team will review them within 24-48 hours. You\'ll receive a notification once the review is complete.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      console.error('❌ Upload failed:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload documents. Please try again.');
      setVerificationStep('upload');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.headerBackText}>← Back</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>Identity Verification</Text>
        <Text style={styles.subtitle}>
          Upload your government-issued ID for verification
        </Text>
        
        {/* Status Check Button */}
        <TouchableOpacity 
          style={styles.statusButton}
          onPress={() => setVerificationStep('status')}
        >
          <Text style={styles.statusButtonText}>📋 Check Status</Text>
        </TouchableOpacity>
      </View>

      {/* ✅ Use components instead of inline code */}
      {verificationStep === 'selection' && (
        <DocumentTypeSelector
          documentTypes={documentTypes}
          selectedDocType={selectedDocType}
          onSelectDocType={setSelectedDocType}
          onContinue={() => setVerificationStep('upload')}
        />
      )}

      {verificationStep === 'upload' && selectedDoc && (
        <DocumentUploader
          selectedDoc={selectedDoc}
          frontImage={frontImage}
          backImage={backImage}
          onFrontImageSelected={setFrontImage}
          onBackImageSelected={setBackImage}
          onFrontImageRemoved={() => setFrontImage(null)}
          onBackImageRemoved={() => setBackImage(null)}
          onBack={() => setVerificationStep('selection')}
          onUpload={uploadDocuments}
          isUploading={isUploading}
        />
      )}

      {(verificationStep === 'verification' || verificationStep === 'complete') && (
        <VerificationProgress
          onBackToVerification={() => navigation.goBack()}
        />
      )}

      {verificationStep === 'status' && (
        <VerificationStatusChecker
          onClose={() => setVerificationStep('selection')}
          userId={user?.id}
        />
      )}

      <View style={styles.bottomPadding} />

      <DebugUploadTest />
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
  headerBackButton: {
    alignSelf: 'flex-start',
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
  },
  headerBackText: {
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
  bottomPadding: {
    height: 40,
  },
  statusButton: {
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  statusButtonText: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default IdentityVerificationScreen;