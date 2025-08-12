import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ClearAuthDebug = () => {
  const clearAuth = async () => {
    try {
      await AsyncStorage.multiRemove([
        '@auth_token',
        '@user_data',
        'authToken',
        'authUser'
      ]);
      
      Alert.alert(
        'Auth Cleared',
        'All authentication data has been cleared. Please restart the app.',
        [{ text: 'OK' }]
      );
      
      console.log('🔥 All auth data cleared');
    } catch (error) {
      console.error('❌ Error clearing auth:', error);
      Alert.alert('Error', 'Failed to clear auth data');
    }
  };

  return (
    <View style={{ position: 'absolute', top: 50, right: 20, zIndex: 1000 }}>
      <TouchableOpacity
        onPress={clearAuth}
        style={{
          backgroundColor: 'red',
          padding: 10,
          borderRadius: 5,
        }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>CLEAR AUTH</Text>
      </TouchableOpacity>
    </View>
  );
};