// components/ShippingOptions.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '@constants/colors';

type ShippingMethod = 'self-arranged' | 'basic-delivery' | 'premium-delivery';
type VerificationLevel = 'self-arranged' | 'basic' | 'premium';

interface ShippingOption {
  method: ShippingMethod;
  verificationLevel: VerificationLevel;
  title: string;
  description: string;
  serviceFee: number;
  shippingFee?: number;
  icon: keyof typeof Ionicons.glyphMap;
}

interface ShippingOptionsProps {
  baseAmount: number;
  selectedShipping: ShippingMethod;
  onShippingSelect: (method: ShippingMethod) => void;
}

const ShippingOptions: React.FC<ShippingOptionsProps> = ({
  baseAmount,
  selectedShipping,
  onShippingSelect,
}) => {
  const shippingOptions: ShippingOption[] = [
    {
      method: 'self-arranged',
      verificationLevel: 'self-arranged',
      title: 'Arrange with Seller',
      description: 'Meet in person or arrange your own delivery',
      serviceFee: 0,
      icon: 'people-outline',
    },
    {
      method: 'basic-delivery',
      verificationLevel: 'basic',
      title: 'Basic Delivery',
      description: 'Professional delivery, auto-release on delivery',
      serviceFee: Math.round(baseAmount * 0.025), // 2.5%
      shippingFee: 0,
      icon: 'bicycle-outline',
    },
    {
      method: 'premium-delivery',
      verificationLevel: 'premium',
      title: 'Verified Delivery',
      description: 'Professional delivery + item verification + buyer protection',
      serviceFee: Math.round(baseAmount * 0.045), // 4.5%
      shippingFee: 0,
      icon: 'shield-checkmark-outline',
    },
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>🚚 Delivery Options</Text>
      {shippingOptions.map((option) => (
        <TouchableOpacity
          key={option.method}
          style={[
            styles.shippingOption,
            selectedShipping === option.method && styles.selectedOption,
          ]}
          onPress={() => onShippingSelect(option.method)}
        >
          <View style={styles.optionHeader}>
            <Ionicons name={option.icon} size={24} color={COLORS.gold} />
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
              {option.serviceFee > 0 && (
                <Text style={styles.serviceFee}>
                  Service Fee: ₦{option.serviceFee.toLocaleString()} (handled securely on checkout)
                </Text>
              )}
              {option.serviceFee === 0 && (
                <Text style={styles.freeService}>FREE - No service fee</Text>
              )}
            </View>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={selectedShipping === option.method ? COLORS.gold : '#666'}
            />
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  shippingOption: {
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  selectedOption: {
    borderColor: COLORS.gold,
    backgroundColor: '#2A2A2A',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionContent: {
    flex: 1,
    marginLeft: 15,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  optionDescription: {
    fontSize: 14,
    color: '#CCCCCC',
    marginTop: 2,
  },
  serviceFee: {
    fontSize: 12,
    color: COLORS.gold,
    marginTop: 2,
  },
  freeService: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 2,
  },
});

export default ShippingOptions;