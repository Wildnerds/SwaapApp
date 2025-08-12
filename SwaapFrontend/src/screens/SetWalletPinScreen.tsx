import React, { useState } from 'react';
import { View, TextInput, Button, Alert, StyleSheet } from 'react-native';
import { getAuthToken } from '@utils/auth';
import { apiClient } from '@config/index';

export default function SetWalletPinScreen() {
  const [pin, setPin] = useState('');

  const handleSetPin = async () => {
    if (!/^\d{4}$/.test(pin)) {
      return Alert.alert('Error', 'PIN must be exactly 4 digits');
    }

    try {
      const token = await getAuthToken();
      const res = await apiClient.post(
        '/wallet/set-pin',
        { pin },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert('Success', res.data.message);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to set PIN';
      Alert.alert('Error', msg);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        value={pin}
        onChangeText={setPin}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={4}
        placeholder="Enter 4-digit PIN"
        style={styles.input}
      />
      <Button title="Set Wallet PIN" onPress={handleSetPin} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    marginBottom: 20,
  },
});
