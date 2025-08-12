// components/OrderSummary.tsx - Updated with insurance fees
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '@constants/colors';

interface OrderSummaryProps {
  baseAmount: number;
  serviceFee: number;
  shippingFee: number;
  insuranceFee?: number; // ✅ NEW: Insurance fee prop
  totalItems: number;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
  baseAmount,
  serviceFee,
  shippingFee,
  insuranceFee = 0, // ✅ NEW: Default to 0
  totalItems,
}) => {
  const totalAmount = baseAmount + serviceFee + shippingFee + insuranceFee;
  
  const getShippingLabel = () => {
    if (shippingFee === 0) return 'Self-arranged delivery';
    if (insuranceFee > 0) return 'Delivery + Insurance';
    return 'Delivery fee';
  };

  const getShippingIcon = () => {
    if (shippingFee === 0) return 'person-outline';
    if (insuranceFee > 0) return 'shield-checkmark-outline';
    return 'car-outline';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="receipt-outline" size={20} color={COLORS.gold} />
        <Text style={styles.title}>Order Summary</Text>
      </View>

      <View style={styles.summaryContent}>
        {/* Items Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryLabel}>
            <Ionicons name="cube-outline" size={16} color="#CCCCCC" />
            <Text style={styles.summaryLabelText}>
              Items ({totalItems} {totalItems === 1 ? 'item' : 'items'})
            </Text>
          </View>
          <Text style={styles.summaryValue}>₦{baseAmount.toLocaleString()}</Text>
        </View>

        {/* Service Fee */}
        {serviceFee > 0 && (
          <View style={styles.summaryRow}>
            <View style={styles.summaryLabel}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#CCCCCC" />
              <Text style={styles.summaryLabelText}>Service fee</Text>
            </View>
            <Text style={styles.summaryValue}>₦{serviceFee.toLocaleString()}</Text>
          </View>
        )}

        {/* Shipping Fee */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryLabel}>
            <Ionicons name={getShippingIcon()} size={16} color="#CCCCCC" />
            <Text style={styles.summaryLabelText}>{getShippingLabel()}</Text>
          </View>
          <Text style={styles.summaryValue}>
            {shippingFee === 0 ? 'FREE' : `₦${shippingFee.toLocaleString()}`}
          </Text>
        </View>

        {/* ✅ NEW: Insurance Fee (if applicable) */}
        {insuranceFee > 0 && (
          <View style={styles.summaryRow}>
            <View style={styles.summaryLabel}>
              <Ionicons name="shield-outline" size={16} color="#CCCCCC" />
              <Text style={styles.summaryLabelText}>Package protection</Text>
            </View>
            <Text style={styles.summaryValue}>₦{insuranceFee.toLocaleString()}</Text>
          </View>
        )}

        {/* Divider */}
        <View style={styles.divider} />

        {/* Total */}
        <View style={[styles.summaryRow, styles.totalRow]}>
          <View style={styles.summaryLabel}>
            <Ionicons name="card-outline" size={18} color={COLORS.gold} />
            <Text style={styles.totalLabel}>Total Amount</Text>
          </View>
          <Text style={styles.totalValue}>₦{totalAmount.toLocaleString()}</Text>
        </View>

        {/* ✅ NEW: Breakdown note if multiple fees */}
        {(serviceFee > 0 || insuranceFee > 0) && (
          <View style={styles.breakdownNote}>
            <Ionicons name="information-circle-outline" size={14} color="#666" />
            <Text style={styles.breakdownNoteText}>
              {serviceFee > 0 && insuranceFee > 0 
                ? 'Includes service fee and package protection'
                : serviceFee > 0 
                  ? 'Includes secure transaction service fee'
                  : 'Includes package protection coverage'
              }
            </Text>
          </View>
        )}

        {/* ✅ NEW: Savings indicator */}
        {shippingFee === 0 && (
          <View style={styles.savingsIndicator}>
            <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
            <Text style={styles.savingsText}>You saved on delivery fees!</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    marginHorizontal: 20,
    marginVertical: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  summaryContent: {
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  summaryLabelText: {
    color: '#CCCCCC',
    fontSize: 14,
    marginLeft: 8,
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 8,
  },
  totalRow: {
    marginBottom: 8,
  },
  totalLabel: {
    color: COLORS.gold,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  totalValue: {
    color: COLORS.gold,
    fontSize: 18,
    fontWeight: 'bold',
  },
  breakdownNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  breakdownNoteText: {
    color: '#666',
    fontSize: 12,
    marginLeft: 6,
    flex: 1,
  },
  savingsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  savingsText: {
    color: '#4CAF50',
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
  },
});

export default OrderSummary;