// components/IdentityVerification/DocumentUploader.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ImageUploader } from './ImageUploader';
import COLORS from '@/constants/colors';

interface DocumentType {
  id: string;
  title: string;
  requiresBack: boolean;
  description: string;
}

interface DocumentUpload {
  uri: string;
  type: string;
  name: string;
  size?: number;
}

interface DocumentUploaderProps {
  selectedDoc: DocumentType;
  frontImage: DocumentUpload | null;
  backImage: DocumentUpload | null;
  onFrontImageSelected: (image: DocumentUpload) => void;
  onBackImageSelected: (image: DocumentUpload) => void;
  onFrontImageRemoved: () => void;
  onBackImageRemoved: () => void;
  onBack: () => void;
  onUpload: () => void;
  isUploading: boolean;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  selectedDoc,
  frontImage,
  backImage,
  onFrontImageSelected,
  onBackImageSelected,
  onFrontImageRemoved,
  onBackImageRemoved,
  onBack,
  onUpload,
  isUploading,
}) => {
  const isUploadReady = frontImage && (!selectedDoc.requiresBack || backImage);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Upload {selectedDoc.title}</Text>
      <Text style={styles.sectionSubtitle}>
        {selectedDoc.description}
      </Text>

      {/* Front Image Upload */}
      <ImageUploader
        title={selectedDoc.requiresBack ? 'Front Side' : 'Document Image'}
        image={frontImage}
        onImageSelected={onFrontImageSelected}
        onImageRemoved={onFrontImageRemoved}
        documentType={selectedDoc.id}
        isBack={false}
      />

      {/* Back Image Upload (if required) */}
      {selectedDoc.requiresBack && (
        <ImageUploader
          title="Back Side"
          image={backImage}
          onImageSelected={onBackImageSelected}
          onImageRemoved={onBackImageRemoved}
          documentType={selectedDoc.id}
          isBack={true}
        />
      )}

      {/* Upload Tips */}
      <View style={styles.tipsSection}>
        <Text style={styles.tipsTitle}>📋 Upload Tips</Text>
        <Text style={styles.tipText}>• Ensure document is clearly visible</Text>
        <Text style={styles.tipText}>• Avoid glare and shadows</Text>
        <Text style={styles.tipText}>• All text should be readable</Text>
        <Text style={styles.tipText}>• Use good lighting</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          disabled={isUploading}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.uploadSubmitButton,
            (!isUploadReady || isUploading) && styles.disabledButton,
          ]}
          onPress={onUpload}
          disabled={!isUploadReady || isUploading}
        >
          <Text style={[
            styles.uploadSubmitButtonText,
            (!isUploadReady || isUploading) && styles.disabledButtonText,
          ]}>
            {isUploading ? 'Uploading...' : 'Upload Documents'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
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
  tipsSection: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 12,
    color: '#CCCCCC',
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  backButtonText: {
    color: '#CCCCCC',
    fontSize: 16,
    fontWeight: '500',
  },
  uploadSubmitButton: {
    flex: 2,
    backgroundColor: COLORS.gold,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#333',
  },
  uploadSubmitButtonText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButtonText: {
    color: '#666',
  },
});