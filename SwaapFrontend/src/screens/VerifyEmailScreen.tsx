// VerifyEmailScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { useRoute } from '@react-navigation/native';
import apiClient from '../api/client'; // your axios instance

const VerifyEmailScreen = () => {
  const route = useRoute();
  const { token, email } = route.params as { token: string; email: string };
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verify = async () => {
      try {
        await apiClient.post('/auth/verify', { token, email });
        Alert.alert('✅ Email verified successfully!');
      } catch (err) {
        Alert.alert('❌ Verification failed.');
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      {loading ? <ActivityIndicator size="large" /> : <Text>Email Verified</Text>}
    </View>
  );
};

export default VerifyEmailScreen;
