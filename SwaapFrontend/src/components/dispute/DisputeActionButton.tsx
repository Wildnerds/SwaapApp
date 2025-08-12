import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  Alert,
  StyleSheet,
  ActivityIndicator,
  View
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@config/index';
import COLORS from '@constants/colors';

interface DisputeActionButtonProps {
  orderId: string;
  orderNumber: string;
  sellerId: string;
  sellerName: string;
  orderStatus: string;
  orderDate: string;
  canCreateDispute?: boolean;
  style?: any;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'outline';
}

export default function DisputeActionButton({
  orderId,
  orderNumber,
  sellerId,
  sellerName,
  orderStatus,
  orderDate,
  canCreateDispute,
  style,
  size = 'medium',
  variant = 'outline'
}: DisputeActionButtonProps) {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [eligible, setEligible] = useState(canCreateDispute);
  const [existingDispute, setExistingDispute] = useState<any>(null);

  // Check dispute eligibility and existing disputes
  useEffect(() => {
    checkDisputeStatus();
  }, [orderId]);

  const checkDisputeStatus = async () => {
    try {
      const response = await apiClient.get(`/api/orders/${orderId}/dispute-status`);
      
      if (response.success) {
        setEligible(response.eligible);
        setExistingDispute(response.existingDispute);
      }
    } catch (error) {
      console.error('Check dispute status error:', error);
      // Default to checking eligibility based on order status and date
      setEligible(checkDefaultEligibility());
    }
  };

  const checkDefaultEligibility = () => {
    if (canCreateDispute !== undefined) return canCreateDispute;
    
    // Default eligibility logic
    const eligibleStatuses = ['delivered', 'completed', 'shipped', 'failed'];
    if (!eligibleStatuses.includes(orderStatus)) return false;
    
    // Check if within 14 days
    const orderDateTime = new Date(orderDate).getTime();
    const now = new Date().getTime();
    const daysDiff = Math.floor((now - orderDateTime) / (1000 * 60 * 60 * 24));
    
    return daysDiff <= 14;
  };

  const handleCreateDispute = async () => {
    if (existingDispute) {
      // Navigate to existing dispute
      navigation.navigate('DisputeDetails', {
        disputeId: existingDispute.disputeId
      });
      return;
    }

    if (!eligible) {
      Alert.alert(
        'Cannot Create Dispute',
        'This order is not eligible for dispute creation. Disputes can only be created for delivered orders within 14 days.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Show confirmation dialog
    Alert.alert(
      'Create Dispute',
      `Are you sure you want to file a dispute for order #${orderNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'default',
          onPress: () => navigateToCreateDispute()
        }
      ]
    );
  };

  const navigateToCreateDispute = () => {
    navigation.navigate('CreateDispute', {
      orderId,
      orderNumber,
      respondentId: sellerId,
      respondentName: sellerName
    });
  };

  const getButtonStyle = () => {
    const baseStyle = styles.button;
    const sizeStyle = styles[`button_${size}`];
    
    let variantStyle;
    switch (variant) {
      case 'primary':
        variantStyle = styles.buttonPrimary;
        break;
      case 'secondary':
        variantStyle = styles.buttonSecondary;
        break;
      case 'outline':
      default:
        variantStyle = styles.buttonOutline;
        break;
    }

    return [baseStyle, sizeStyle, variantStyle, style];
  };

  const getTextStyle = () => {
    let variantTextStyle;
    switch (variant) {
      case 'primary':
        variantTextStyle = styles.buttonTextPrimary;
        break;
      case 'secondary':
        variantTextStyle = styles.buttonTextSecondary;
        break;
      case 'outline':
      default:
        variantTextStyle = styles.buttonTextOutline;
        break;
    }

    const sizeTextStyle = styles[`buttonText_${size}`];
    return [styles.buttonText, sizeTextStyle, variantTextStyle];
  };

  const getButtonText = () => {
    if (existingDispute) {
      switch (existingDispute.status) {
        case 'open':
        case 'under_review':
        case 'in_mediation':
        case 'escalated':
          return 'View Dispute';
        case 'resolved':
        case 'closed':
          return 'View Resolution';
        default:
          return 'View Dispute';
      }
    }
    return 'File Dispute';
  };

  const getButtonIcon = () => {
    if (existingDispute) {
      switch (existingDispute.status) {
        case 'resolved':
        case 'closed':
          return 'checkmark-circle-outline';
        default:
          return 'document-text-outline';
      }
    }
    return 'alert-circle-outline';
  };

  const getButtonColor = () => {
    if (existingDispute) {
      switch (existingDispute.status) {
        case 'resolved':
        case 'closed':
          return '#2ECC71';
        case 'escalated':
          return '#E74C3C';
        default:
          return COLORS.gold;
      }
    }
    return eligible ? '#FF9500' : '#666';
  };

  // Don't render if order is not eligible and no existing dispute
  if (!eligible && !existingDispute) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[
        getButtonStyle(),
        { borderColor: getButtonColor() },
        existingDispute?.status === 'resolved' && styles.resolvedButton
      ]}
      onPress={handleCreateDispute}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getButtonColor()} />
      ) : (
        <View style={styles.buttonContent}>
          <Ionicons 
            name={getButtonIcon() as any} 
            size={size === 'small' ? 14 : size === 'large' ? 18 : 16} 
            color={getButtonColor()} 
          />
          <Text style={[getTextStyle(), { color: getButtonColor() }]}>
            {getButtonText()}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button_small: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  button_medium: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  button_large: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonPrimary: {
    backgroundColor: '#FF9500',
    borderColor: '#FF9500',
  },
  buttonSecondary: {
    backgroundColor: '#2a2a2a',
    borderColor: '#444',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
  },
  resolvedButton: {
    backgroundColor: 'rgba(46, 204, 113, 0.1)',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  buttonText: {
    fontWeight: '600',
  },
  buttonText_small: {
    fontSize: 11,
  },
  buttonText_medium: {
    fontSize: 12,
  },
  buttonText_large: {
    fontSize: 14,
  },
  buttonTextPrimary: {
    color: '#fff',
  },
  buttonTextSecondary: {
    color: '#fff',
  },
  buttonTextOutline: {
    color: '#FF9500',
  },
});