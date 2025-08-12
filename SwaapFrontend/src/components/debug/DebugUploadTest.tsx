// components/debug/DebugUploadTest.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAppSelector } from '@store/redux/hooks';

export const DebugUploadTest: React.FC = () => {
  const { token } = useAppSelector((state) => state.auth);
  const [uploading, setUploading] = useState(false);

  const testSimpleUpload = async () => {
    try {
      console.log('🧪 Testing simple upload...');
      
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/verification/simple-test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: 'data' })
      });

      const result = await response.json();
      console.log('✅ Simple test result:', result);
      
      Alert.alert('Simple Test', JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('❌ Simple test error:', error);
      Alert.alert('Error', String(error));
    }
  };

  const testImageUpload = async () => {
    try {
      setUploading(true);
      console.log('🧪 Testing image upload...');

      // ✅ Fixed: Check if ImagePicker is available
      if (!ImagePicker) {
        throw new Error('ImagePicker not available');
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: [ImagePicker.MediaType.Images], // ✅ Fixed deprecated API
        allowsEditing: true,
        quality: 0.5, // Lower quality for testing
      });

      if (result.canceled || !result.assets || !result.assets[0]) {
        console.log('📸 Image selection cancelled');
        setUploading(false);
        return;
      }

      const asset = result.assets[0];
      console.log('📸 Selected image:', {
        uri: asset.uri,
        type: asset.type,
        size: asset.fileSize,
        width: asset.width,
        height: asset.height
      });

      // ✅ Fixed: Better API URL handling
      const apiUrl = process.env.EXPO_PUBLIC_API_URL;
      if (!apiUrl) {
        throw new Error('EXPO_PUBLIC_API_URL not configured');
      }

      console.log('🌐 Using API URL:', apiUrl);

      // Create FormData
      const formData = new FormData();
      formData.append('documentType', 'nin');
      formData.append('documentNumber', '12345678901');
      
      // Add image with correct format
      formData.append('frontImage', {
        uri: asset.uri,
        type: asset.type || 'image/jpeg',
        name: 'test_front.jpg',
      } as any);

      console.log('📤 Uploading to:', `${apiUrl}/api/verification/identity`);
      console.log('🔑 Token:', token ? 'Present' : 'Missing');

      const response = await fetch(`${apiUrl}/api/verification/identity`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response headers:', response.headers);

      const responseText = await response.text();
      console.log('📥 Raw response:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        Alert.alert('Error', `Invalid response: ${responseText}`);
        return;
      }

      if (response.ok) {
        console.log('✅ Upload successful:', data);
        Alert.alert('Success!', `Upload successful!\nUpload ID: ${data.uploadId}`);
      } else {
        console.error('❌ Upload failed:', data);
        Alert.alert('Upload Failed', data.message || 'Unknown error');
      }

    } catch (error) {
      console.error('❌ Upload error:', error);
      Alert.alert('Error', String(error));
    } finally {
      setUploading(false);
    }
  };

  const testAuthEndpoint = async () => {
    try {
      console.log('🧪 Testing auth endpoint...');
      
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      console.log('👤 Auth test result:', result);
      
      Alert.alert('Auth Test', `Status: ${response.status}\n${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      console.error('❌ Auth test error:', error);
      Alert.alert('Error', String(error));
    }
  };

  const checkServerHealth = async () => {
    try {
      console.log('🧪 Checking server health...');
      
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/health`);
      const result = await response.json();
      
      console.log('🏥 Health check result:', result);
      Alert.alert('Server Health', JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('❌ Health check error:', error);
      Alert.alert('Error', String(error));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧪 Debug Upload Tests</Text>
      
      <TouchableOpacity style={styles.button} onPress={checkServerHealth}>
        <Text style={styles.buttonText}>1. Check Server Health</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={testAuthEndpoint}>
        <Text style={styles.buttonText}>2. Test Authentication</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={testSimpleUpload}>
        <Text style={styles.buttonText}>3. Test Simple Upload</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, uploading && styles.buttonDisabled]} 
        onPress={testImageUpload}
        disabled={uploading}
      >
        <Text style={styles.buttonText}>
          {uploading ? '4. Uploading...' : '4. Test Image Upload'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.info}>
        API URL: {process.env.EXPO_PUBLIC_API_URL}
      </Text>
      <Text style={styles.info}>
        Token: {token ? 'Present ✅' : 'Missing ❌'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#121212',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#FFD700',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonDisabled: {
    backgroundColor: '#666',
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  info: {
    color: '#CCCCCC',
    fontSize: 12,
    marginTop: 5,
  },
});