import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { apiClient } from '@config/index';
import { useNotifications } from '@hooks/useNotifications';

export default function NotificationTest() {
  const [creating, setCreating] = useState(false);
  const { notifications, loading, error, refreshNotifications } = useNotifications();

  const createTestNotification = async () => {
    try {
      setCreating(true);
      console.log('🔍 Creating test notification...');
      
      const response = await apiClient.post('/api/notifications/test');
      
      console.log('✅ Test notification created:', response.data);
      Alert.alert('Success', 'Test notification created!');
      
      // Refresh notifications
      await refreshNotifications();
    } catch (err: any) {
      console.error('❌ Failed to create test notification:', err);
      Alert.alert('Error', `Failed to create test notification: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const testDirectAPI = async () => {
    try {
      console.log('🔍 Testing direct API call...');
      
      const response = await apiClient.get('/api/notifications');
      
      console.log('✅ Direct API response:', response);
      Alert.alert('API Response', `Found ${response?.data?.length || 0} notifications`);
    } catch (err: any) {
      console.error('❌ Direct API call failed:', err);
      Alert.alert('Error', `API call failed: ${err.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notification Debug Panel</Text>
      
      <View style={styles.section}>
        <Text style={styles.subtitle}>Hook Status:</Text>
        <Text style={styles.text}>Loading: {loading ? 'Yes' : 'No'}</Text>
        <Text style={styles.text}>Error: {error || 'None'}</Text>
        <Text style={styles.text}>Count: {notifications.length}</Text>
      </View>

      <View style={styles.section}>
        <TouchableOpacity 
          style={[styles.button, creating && styles.buttonDisabled]} 
          onPress={createTestNotification}
          disabled={creating}
        >
          <Text style={styles.buttonText}>
            {creating ? 'Creating...' : 'Create Test Notification'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={testDirectAPI}>
          <Text style={styles.buttonText}>Test Direct API Call</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={refreshNotifications}>
          <Text style={styles.buttonText}>Refresh Notifications</Text>
        </TouchableOpacity>
      </View>

      {notifications.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.subtitle}>Recent Notifications:</Text>
          {notifications.slice(0, 3).map((notification, index) => (
            <View key={notification._id} style={styles.notificationItem}>
              <Text style={styles.notificationText}>
                {index + 1}. {notification.message}
              </Text>
              <Text style={styles.notificationMeta}>
                Type: {notification.type} | Read: {notification.read ? 'Yes' : 'No'}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1E1E',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  title: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  subtitle: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  text: {
    color: '#FFF',
    fontSize: 12,
    marginBottom: 4,
  },
  button: {
    backgroundColor: '#FFD700',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginBottom: 8,
  },
  buttonDisabled: {
    backgroundColor: '#666',
  },
  buttonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  notificationItem: {
    backgroundColor: '#2A2A2A',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  notificationText: {
    color: '#FFF',
    fontSize: 12,
    marginBottom: 4,
  },
  notificationMeta: {
    color: '#999',
    fontSize: 10,
  },
});