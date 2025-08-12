import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import COLORS from '@constants/colors';
import { useAuth } from '@context/AuthContext';
import { getAuthToken } from '@utils/auth';
import { apiClient } from '@config/index';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const UpgradeToProScreen = () => {
  const { user, refreshUser } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);

  const proAmount = 5000; // ₦3000

  const handleWalletPayment = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();

      const res = await fetch(`${apiClient.defaults.baseURL}/upgrade-to-pro`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ method: 'wallet' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Wallet upgrade failed');

      await refreshUser();
      navigation.navigate('ProSuccess');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handlePaystackUpgrade = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();

      const res = await apiClient.post(
        '/paystack/initialize',
        { amount: proAmount },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const { authorization_url, reference } = res.data.data;

      navigation.navigate('PaystackWebview', {
        url: authorization_url,
        reference,
        onSuccess: async () => {
          try {
            const token = await getAuthToken();

            const upgradeRes = await fetch(`${apiClient.defaults.baseURL}/upgrade-to-pro`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                method: 'paystack',
                reference,
                amount: proAmount,
              }),
            });

            const upgradeData = await upgradeRes.json();
            if (!upgradeRes.ok) throw new Error(upgradeData.message || 'Upgrade failed');

            await refreshUser();
            navigation.replace('ProSuccess');
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Something went wrong after payment');
          }
        },
      });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to initiate Paystack payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>🎯 Upgrade to Pro</Text>
      <Text style={styles.subText}>Enjoy premium features like:</Text>
      <View style={styles.benefitBox}>
        <Text style={styles.benefit}>✅ More uploads</Text>
        <Text style={styles.benefit}>✅ Top listing priority</Text>
        <Text style={styles.benefit}>✅ Verified badge</Text>
        <Text style={styles.benefit}>✅ Zero ads experience</Text>
      </View>

      <Text style={styles.price}>Price: ₦{proAmount.toLocaleString()}</Text>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} />
      ) : (
        <>
          <TouchableOpacity style={styles.btnPrimary} onPress={handlePaystackUpgrade}>
            <Text style={styles.btnText}>💳 Pay with Paystack</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnSecondary} onPress={handleWalletPayment}>
            <Text style={styles.btnText}>🏦 Pay from Wallet</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

export default UpgradeToProScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    padding: 20,
    justifyContent: 'center',
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 10,
  },
  subText: {
    fontSize: 16,
    color: '#B0B0B0',
    textAlign: 'center',
    marginBottom: 20,
  },
  benefitBox: {
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
  },
  benefit: {
    fontSize: 15,
    color: '#E5E5E5',
    marginBottom: 6,
  },
  price: {
    fontSize: 18,
    fontWeight: '600',
    color: '#22C55E',
    textAlign: 'center',
    marginBottom: 20,
  },
  btnPrimary: {
    backgroundColor: '#FFD700',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  btnSecondary: {
    backgroundColor: '#3B82F6',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
});
