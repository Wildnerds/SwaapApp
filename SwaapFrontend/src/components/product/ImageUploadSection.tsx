// components/product/ImageUploadSection.tsx
import React from 'react';
import { 
  View, 
  TouchableOpacity, 
  Text, 
  Image, 
  ScrollView, 
  Alert,
  StyleSheet 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '@constants/colors';

interface ImageUploadSectionProps {
  imageUris: string[];
  onPickImage: () => void;
  onDeleteImage: (index: number) => void;
  maxImages?: number;
}

export const ImageUploadSection: React.FC<ImageUploadSectionProps> = ({
  imageUris,
  onPickImage,
  onDeleteImage,
  maxImages = 10,
}) => {
  const handleDeleteImage = (index: number) => {
    Alert.alert('Delete Image', 'Remove this image?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', 
        style: 'destructive',
        onPress: () => onDeleteImage(index)
      },
    ]);
  };

  return (
    <TouchableOpacity style={styles.imageUpload} onPress={onPickImage}>
      {imageUris.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {imageUris.map((uri, idx) => {
            const isExisting = uri.startsWith('http') || uri.startsWith('https');
            return (
              <View key={idx} style={styles.imageContainer}>
                <Image source={{ uri }} style={styles.imagePreview} />
                
                {/* Show indicator for existing vs new images */}
                <View style={[
                  styles.imageTypeIndicator, 
                  isExisting ? styles.existingIndicator : styles.newIndicator
                ]}>
                  <Text style={styles.imageTypeText}>
                    {isExisting ? 'SAVED' : 'NEW'}
                  </Text>
                </View>
                
                <TouchableOpacity 
                  style={styles.deleteImageButton}
                  onPress={() => handleDeleteImage(idx)}
                >
                  <Ionicons name="close-circle" size={24} color="#ff4444" />
                </TouchableOpacity>
              </View>
            );
          })}
          
          {/* Add more images button */}
          {imageUris.length < maxImages && (
            <TouchableOpacity style={styles.addMoreImagesButton} onPress={onPickImage}>
              <Ionicons name="add-circle-outline" size={40} color={COLORS.gold} />
              <Text style={styles.addMoreText}>Add More</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      ) : (
        <>
          <Ionicons name="image-outline" size={32} color={COLORS.gold} />
          <Text style={styles.imageText}>Tap to upload images (max {maxImages})</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  imageUpload: { 
    borderWidth: 2, 
    borderColor: COLORS.gold, 
    borderStyle: 'dashed', 
    borderRadius: 10, 
    height: 180, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 20, 
    backgroundColor: '#1E1E1E', 
    padding: 10 
  },
  imageContainer: {
    position: 'relative',
    marginRight: 10,
  },
  imagePreview: { 
    width: 120, 
    height: 120, 
    borderRadius: 8 
  },
  imageTypeIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  existingIndicator: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
  },
  newIndicator: {
    backgroundColor: 'rgba(255, 152, 0, 0.9)',
  },
  imageTypeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  addMoreImagesButton: {
    width: 120,
    height: 120,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.gold,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
  },
  addMoreText: {
    color: COLORS.gold,
    fontSize: 12,
    marginTop: 4,
  },
  deleteImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#121212',
    borderRadius: 12,
  },
  imageText: { 
    marginTop: 10, 
    color: COLORS.gold, 
    fontWeight: '600' 
  },
});