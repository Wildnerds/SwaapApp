// components/profile/EditProfileImageSection.tsx
import React from 'react';
import { View, Image, TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '@constants/colors';

interface EditProfileImageSectionProps {
  photoURL: string;
  onPickImage: () => void;
  isUploading: boolean;
}

export const EditProfileImageSection: React.FC<EditProfileImageSectionProps> = ({
  photoURL,
  onPickImage,
  isUploading,
}) => {
  return (
    <View style={styles.imageSection}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: photoURL }} style={styles.avatar} />
        {isUploading && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator size="small" color="#fff" />
          </View>
        )}
      </View>
      
      <TouchableOpacity 
        style={styles.changePhotoButton} 
        onPress={onPickImage}
        disabled={isUploading}
      >
        <Ionicons name="camera-outline" size={16} color="#121212" />
        <Text style={styles.changePhotoText}>
          {isUploading ? 'Uploading...' : 'Change Photo'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  imageSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: COLORS.gold,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoButton: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  changePhotoText: {
    color: '#121212',
    fontWeight: '600',
    fontSize: 14,
  },
});