// utils/imageOptimization.ts - Simplified version without expo-image-manipulator
import { Alert } from 'react-native';

export interface ImageOptimizationOptions {
  maxCount?: number;
  maxSizeKB?: number;
}

const DEFAULT_OPTIONS: ImageOptimizationOptions = {
  maxCount: 5,
  maxSizeKB: 1024, // 1MB max file size (simplified)
};

// Simplified optimization - mainly validation for now
export const optimizeImage = async (
  uri: string, 
  options: ImageOptimizationOptions = {}
): Promise<string> => {
  try {
    console.log('🖼️ Processing image:', uri);
    
    // For now, just return the original URI
    // In a production app, you'd implement actual compression here
    // or use a different image processing library
    
    console.log('✅ Image processed:', uri);
    return uri;
    
  } catch (error) {
    console.error('❌ Image processing failed:', error);
    return uri;
  }
};

export const optimizeMultipleImages = async (
  uris: string[],
  options: ImageOptimizationOptions = {}
): Promise<string[]> => {
  try {
    console.log(`🖼️ Processing ${uris.length} images...`);
    
    // For now, just return the original URIs
    // In production, you'd process each image
    const processedUris = await Promise.all(
      uris.map(uri => optimizeImage(uri, options))
    );
    
    console.log('✅ All images processed successfully');
    return processedUris;
    
  } catch (error) {
    console.error('❌ Batch image processing failed:', error);
    Alert.alert(
      'Image Processing Error',
      'Some images could not be processed. They will be used as-is.'
    );
    return uris;
  }
};

export const validateImageCount = (imageUris: string[], maxCount: number = 5): boolean => {
  if (imageUris.length > maxCount) {
    Alert.alert(
      'Too Many Images',
      `You can only upload up to ${maxCount} images. Please remove ${imageUris.length - maxCount} image${imageUris.length - maxCount > 1 ? 's' : ''}.`
    );
    return false;
  }
  return true;
};

export const getImageDimensions = async (uri: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = reject;
    img.src = uri;
  });
};

export const createImageThumbnail = async (
  uri: string,
  size: number = 200
): Promise<string> => {
  try {
    // For now, return original URI since ImageManipulator is not available
    // In production, you'd use expo-image-manipulator or similar
    console.log('🖼️ Creating thumbnail for:', uri);
    return uri; // Return original if thumbnail creation is not implemented
  } catch (error) {
    console.error('❌ Thumbnail creation failed:', error);
    return uri; // Return original if thumbnail creation fails
  }
};