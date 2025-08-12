// CartDebugInfo.tsx - Temporary debug component to verify cart isolation
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useAppSelector } from '@/store/redux/hooks';
import { RootState } from '@/store';
import { useAuth } from '@/context/AuthContext';
import { resetAppState } from '@/utils/resetAppState';

export const CartDebugInfo: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const cartState = useAppSelector((state: RootState) => state.cart);
  
  const userCarts = cartState.userCarts || {};
  const currentUserId = cartState.currentUserId;
  
  const handleReset = () => {
    Alert.alert(
      'Reset App State',
      'This will clear all data and restart the app. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetAppState();
            Alert.alert('Reset Complete', 'Please restart the app');
          }
        }
      ]
    );
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔍 CART DEBUG INFO</Text>
      
      <Text style={styles.text}>
        Auth User: {user?._id || user?.id || 'none'} ({isAuthenticated ? 'authenticated' : 'not authenticated'})
      </Text>
      
      <Text style={styles.text}>
        Cart CurrentUserId: {currentUserId || 'none'}
      </Text>
      
      <Text style={styles.text}>
        Available User Carts:
      </Text>
      
      {Object.keys(userCarts).map(userId => (
        <Text key={userId} style={[styles.text, styles.indent]}>
          {userId}: {userCarts[userId]?.length || 0} items
          {userId === currentUserId ? ' ← CURRENT' : ''}
        </Text>
      ))}
      
      {Object.keys(userCarts).length === 0 && (
        <Text style={[styles.text, styles.indent]}>No carts found</Text>
      )}
      
      <Text style={styles.text}>
        Total Items: {cartState.totalItems || 0}
      </Text>
      <Text style={styles.text}>
        Total Amount: ₦{(cartState.totalAmount || 0).toLocaleString()}
      </Text>
      
      <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
        <Text style={styles.resetButtonText}>🗑️ Reset App State</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#333',
    padding: 10,
    margin: 5,
    borderRadius: 5,
  },
  title: {
    color: '#FFC107',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  text: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 2,
  },
  indent: {
    marginLeft: 10,
  },
  resetButton: {
    backgroundColor: '#FF4444',
    padding: 8,
    borderRadius: 4,
    marginTop: 10,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});