// components/IdentityVerification/ImageUploader.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import COLORS from '@/constants/colors';

interface DocumentUpload {
  uri: string;
  type: string;
  name: string;
  size?: number;
}

interface ImageUploaderProps {
  title: string;
  image: DocumentUpload | null;
  onImageSelected: (image: DocumentUpload) => void;
  onImageRemoved: () => void;
  documentType: string;
  isBack?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  title,
  image,
  onImageSelected,
  onImageRemoved,
  documentType,
  isBack = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant camera roll permissions to upload documents.',
          [{ text: 'OK' }]
        );
        return false;
      }
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    Alert.alert(
      'Select Image Source',
      'Choose how you want to add your document',
      [
        { text: 'Camera', onPress: () => openCamera() },
        { text: 'Gallery', onPress: () => openGallery() },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const openCamera = async () => {
    setIsLoading(true);
    try {
      console.log('📷 Opening camera...');
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // ✅ Fixed: Use MediaTypeOptions
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      console.log('📷 Camera result:', result);

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        console.log('✅ Image captured:', asset);
        
        const document: DocumentUpload = {
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          name: `${documentType}_${isBack ? 'back' : 'front'}.jpg`,
          size: asset.fileSize,
        };
        onImageSelected(document);
      }
    } catch (error) {
      console.error('❌ Camera error:', error);
      Alert.alert('Error', 'Failed to capture image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const openGallery = async () => {
    setIsLoading(true);
    try {
      console.log('🖼️ Opening gallery...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // ✅ Fixed: Use MediaTypeOptions
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      console.log('🖼️ Gallery result:', result);

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        console.log('✅ Image selected from gallery:', asset);
        
        const document: DocumentUpload = {
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          name: `${documentType}_${isBack ? 'back' : 'front'}.jpg`,
          size: asset.fileSize,
        };
        onImageSelected(document);
      }
    } catch (error) {
      console.error('❌ Gallery error:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.uploadSection}>
      <Text style={styles.uploadTitle}>{title} *</Text>
      
      {image ? (
        <View style={styles.imagePreview}>
          <Image source={{ uri: image.uri }} style={styles.previewImage} />
          <TouchableOpacity
            style={styles.removeImageButton}
            onPress={onImageRemoved}
          >
            <Text style={styles.removeImageText}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={pickImage}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <ActivityIndicator size="large" color={COLORS.gold} />
              <Text style={styles.uploadText}>Processing...</Text>
            </>
          ) : (
            <>
              <Text style={styles.uploadIcon}>📷</Text>
              <Text style={styles.uploadText}>Tap to upload image</Text>
              <Text style={styles.uploadSubtext}>JPG, PNG • Max 5MB</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  uploadSection: {
    marginBottom: 24,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  uploadButton: {
    backgroundColor: '#1E1E1E',
    borderWidth: 2,
    borderColor: '#444',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  uploadIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  uploadText: {
    fontSize: 16,
    color: '#CCCCCC',
    fontWeight: '500',
    marginBottom: 4,
  },
  uploadSubtext: {
    fontSize: 12,
    color: '#AAAAAA',
  },
  imagePreview: {
    position: 'relative',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});