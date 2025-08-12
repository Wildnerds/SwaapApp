import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Product } from '@types';
import { apiClient } from '@config/index';
import AsyncStorage from '@react-native-async-storage/async-storage';
import COLORS from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { RootState } from '@/store';
import { useSelector } from 'react-redux';
import ShippingOptions from '@components/ShippingOptions';
import ShippingPreferences from '@components/ShippingPreferences';
import AddressManager from '@components/AddressManager';
import OrderSummary from '@components/OrderSummary';
import AddToCartButton from '@components/AddToCartButton';
import { AIValueAssessment, SmartRecommendationsCard } from '@/components/ai';
import { logDebug, logInfo, logError } from '@/utils/logger';
import DisputeActionButton from '@/components/dispute/DisputeActionButton';

type ShippingMethod = 'self-arranged' | 'basic-delivery' | 'premium-delivery';

interface ShippingAddress {
  _id?: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  label?: string;
  isDefault?: boolean;
}

interface ShippingRate {
  carrier: string;
  service: string;
  fee: number;
  delivery_time: string;
  pickup_time?: string;
  service_code?: string;
  courier_id?: string;
  speed_rating: 'economy' | 'standard' | 'express' | 'premium';
  insurance_available: boolean;
  features: string[];
}

interface InsuranceOption {
  insurance_type: string;
  insurance_fee: number;
  total_cost: number;
  coverage: number;
}

// ❌ REMOVED: const token = useSelector((state: RootState) => state.auth.token);

export default function SwapOfferScreen() {
  // ✅ KEEP ONLY THIS useSelector INSIDE THE COMPONENT
  const token = useSelector((state: RootState) => state.auth.token);
  
  const [message, setMessage] = useState('');
  const route = useRoute();
  const navigation = useNavigation();
  const { requestedProduct, onItemSelect } = route.params as {
    requestedProduct: Product;
    onItemSelect?: (item: Product) => void;
  };

  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [extraAmount, setExtraAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [priceDifference, setPriceDifference] = useState<{
    amount: number;
    percentage: number;
    isHigher: boolean;
  } | null>(null);

  // Comprehensive shipping states
  const [selectedShipping, setSelectedShipping] = useState<ShippingMethod>('basic-delivery');
  const [selectedAddress, setSelectedAddress] = useState<ShippingAddress | null>(null);
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null);
  const [selectedInsurance, setSelectedInsurance] = useState<InsuranceOption | null>(null);
  const [shippingFee, setShippingFee] = useState(0);
  const [insuranceFee, setInsuranceFee] = useState(0);
  const [showShippingPreferences, setShowShippingPreferences] = useState(false);
  const [showAddressManager, setShowAddressManager] = useState(false);

  const fetchMyProducts = async () => {
    try {
      const data = await apiClient.get('/api/products/my');
      setMyProducts((data || []).filter((p: Product) => p._id !== requestedProduct._id));
    } catch (error) {
      console.error('Fetch my products error:', error);
      Alert.alert('Error', 'Failed to load your products');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced shipping handlers
  const handleShippingSelection = (method: ShippingMethod) => {
    setSelectedShipping(method);
    // Reset shipping details when changing methods
    if (method === 'self-arranged') {
      setShippingFee(0);
      setInsuranceFee(0);
      setSelectedRate(null);
      setSelectedInsurance(null);
      setSelectedAddress(null);
    }
  };

  const handleAddressSelect = (address: ShippingAddress) => {
    setSelectedAddress(address);
    // Reset rate selection when address changes
    setSelectedRate(null);
    setSelectedInsurance(null);
    setShippingFee(0);
    setInsuranceFee(0);
  };

  const handleShippingRateSelect = (rate: ShippingRate, insurance?: InsuranceOption) => {
    logDebug('Selected shipping rate', { carrier: rate.carrier, service: rate.service, fee: rate.fee });
    logDebug('Selected insurance', { insurance });

    setSelectedRate(rate);
    setSelectedInsurance(insurance || null);
    setShippingFee(rate.fee);
    setInsuranceFee(insurance?.insurance_fee || 0);
    setShowShippingPreferences(false);
  };

  // Calculate total costs including shipping for better user protection
  const calculateTotalCost = () => {
    const baseCost = parseFloat(extraAmount || '0');
    return baseCost + shippingFee + insuranceFee;
  };

  // Get protection level based on shipping method
  const getProtectionLevel = (): string => {
    switch (selectedShipping) {
      case 'premium-delivery':
        return 'Maximum Protection: Full insurance, priority support, premium tracking';
      case 'basic-delivery':
        return 'Standard Protection: Tracking, dispute resolution, delivery confirmation';
      case 'self-arranged':
        return 'Basic Protection: Escrow service, basic dispute resolution';
      default:
        return 'Basic Protection';
    }
  };

  useEffect(() => {
    fetchMyProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct && requestedProduct) {
      const difference = selectedProduct.price - requestedProduct.price;
      const percentage = (Math.abs(difference) / requestedProduct.price) * 100;

      setPriceDifference({
        amount: Math.abs(difference),
        percentage,
        isHigher: difference > 0,
      });

      if (difference < 0) {
        // My item is worth LESS than their item, so I need to pay the difference
        setExtraAmount(Math.abs(difference).toString());
      } else {
        // My item is worth MORE than or equal to their item, so no payment needed
        setExtraAmount('0');
      }

      if (onItemSelect) {
        onItemSelect(selectedProduct);
      }
    } else {
      setPriceDifference(null);
    }
  }, [selectedProduct, requestedProduct]);

  // ❌ REMOVED: const token = useSelector((state: RootState) => state.auth.token);

 const handleSendSwap = async () => {
  if (!selectedProduct) {
    Alert.alert('Select one of your products to swap');
    return;
  }

  // Enhanced validation for shipping requirements
  if (selectedShipping !== 'self-arranged') {
    if (!selectedAddress) {
      Alert.alert('Address Required', 'Please select a delivery address for shipping.');
      return;
    }
    
    if (selectedShipping === 'premium-delivery' && !selectedRate) {
      Alert.alert('Shipping Rate Required', 'Please select a shipping rate for premium delivery.');
      return;
    }
  }

  try {
    setSubmitting(true);

    // Debug token check
    const debugToken = await AsyncStorage.getItem('@auth_token');
    logDebug('SwapOffer token check', {
      hasToken: !!debugToken,
      tokenLength: debugToken?.length || 0
    });
    
    if (!debugToken) {
      Alert.alert('Authentication Error', 'Please log in again to send swap offers.');
      return;
    }

    // Enhanced swap offer with comprehensive shipping data
    const totalExtraPayment = calculateTotalCost();
    
    const body = {
      offeringProductId: selectedProduct._id,
      requestedProductId: requestedProduct._id,
      message: message || '',
      extraPayment: parseFloat(extraAmount || '0'), // Base extra amount
      totalExtraPayment, // Total including shipping and insurance
      shippingMethod: selectedShipping,
      shippingDetails: selectedShipping !== 'self-arranged' ? {
        address: selectedAddress,
        shippingRate: selectedRate,
        insuranceOption: selectedInsurance,
        shippingFee,
        insuranceFee,
        protectionLevel: getProtectionLevel(),
        // ShipBubble specific data
        carrierDetails: selectedRate ? {
          carrier: selectedRate.carrier,
          service: selectedRate.service,
          service_code: selectedRate.service_code,
          courier_id: selectedRate.courier_id,
          delivery_time: selectedRate.delivery_time,
          pickup_time: selectedRate.pickup_time,
        } : null,
      } : null,
      protectionLevel: getProtectionLevel(),
    };

    logDebug('Sending swap request', { body });

    await apiClient.post('/api/swaps', body);

    Alert.alert('Success', 'Swap offer sent!');
    navigation.goBack();
  } catch (err: any) {
    console.error('Swap error:', err);
    console.error('Error response:', err.response?.data);
    Alert.alert('Error', err.response?.data?.message || 'Swap failed');
  } finally {
    setSubmitting(false);
  }
};

  const renderPriceDifference = () => {
    if (!priceDifference || !selectedProduct) return null;

    return (
      <View style={styles.priceDifferenceContainer}>
        <Text style={styles.priceDifferenceText}>
          {priceDifference.isHigher ? (
            <Text>
              Your item is{' '}
              <Text style={styles.higherText}>
                ₦{priceDifference.amount.toLocaleString()} ({priceDifference.percentage.toFixed(1)}%) higher
              </Text>
            </Text>
          ) : (
            <Text>
              Your item is{' '}
              <Text style={styles.lowerText}>
                ₦{priceDifference.amount.toLocaleString()} ({priceDifference.percentage.toFixed(1)}%) lower
              </Text>
            </Text>
          )}
        </Text>

        {!priceDifference.isHigher && priceDifference.amount > 0 && (
          <>
            <Text style={styles.label}>Additional Cash to Offer (₦):</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder={`₦${priceDifference.amount}`}
              value={extraAmount}
              onChangeText={setExtraAmount}
            />
            
            {/* Payment Calculation Display */}
            <View style={styles.paymentCalculationBox}>
              <Text style={styles.calculationTitle}>💰 Payment Breakdown:</Text>
              <View style={styles.calculationRow}>
                <Text style={styles.calculationLabel}>Your item value:</Text>
                <Text style={styles.calculationValue}>₦{selectedProduct?.price?.toLocaleString() || '0'}</Text>
              </View>
              <View style={styles.calculationRow}>
                <Text style={styles.calculationLabel}>Their item value:</Text>
                <Text style={styles.calculationValue}>₦{requestedProduct?.price?.toLocaleString() || '0'}</Text>
              </View>
              <View style={styles.calculationDivider} />
              <View style={styles.calculationRow}>
                <Text style={styles.calculationLabel}>Price difference:</Text>
                <Text style={styles.calculationValue}>₦{priceDifference?.amount?.toLocaleString() || '0'}</Text>
              </View>
              <View style={styles.calculationRow}>
                <Text style={styles.calculationLabel}>Extra payment by you:</Text>
                <Text style={[styles.calculationValue, styles.extraPaymentAmount]}>
                  ₦{(parseFloat(extraAmount || '0')).toLocaleString()}
                </Text>
              </View>
              <Text style={styles.paymentNote}>
                {parseFloat(extraAmount || '0') > 0 
                  ? `You pay this amount because your item is worth less`
                  : priceDifference?.amount === 0
                    ? `Perfect match - both items have equal value!`
                    : `No payment needed - your item is worth more!`
                }
              </Text>
            </View>
            <TextInput
              placeholder="Enter message to swapper"
              placeholderTextColor="#ffffff"
              value={message}
              onChangeText={setMessage}
              style={styles.input}
            />
          </>
        )}
      </View>
    );
  };

  const renderItem = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={[
        styles.productCard,
        selectedProduct?._id === item._id && styles.selectedCard,
      ]}
      onPress={() => setSelectedProduct(item)}
    >
      <Image
        source={{ uri: item.images?.[0] || 'https://via.placeholder.com/100' }}
        style={styles.image}
      />
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.price}>₦{item.price.toLocaleString()}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.header}>Swap for:</Text>

      <View style={styles.targetProductCard}>
        <Image
          source={{ uri: requestedProduct.images?.[0] || 'https://via.placeholder.com/100' }}
          style={styles.image}
        />
        <View style={styles.targetProductInfo}>
          <Text style={styles.title}>{requestedProduct.title}</Text>
          <Text style={styles.price}>₦{requestedProduct.price.toLocaleString()}</Text>
          <Text style={styles.alternativeText}>Not ready to swap? Buy it directly:</Text>
          <AddToCartButton 
            product={requestedProduct} 
            style={styles.directPurchaseButton}
            source="swap"
            swapContext={{
              fromScreen: 'SwapOfferScreen',
              canSwap: true,
              canPurchase: true
            }}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.gold} size="large" />
      ) : (
        <>
          <Text style={styles.label}>Select one of your items:</Text>
          <FlatList
            data={myProducts}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            horizontal
            showsHorizontalScrollIndicator={false}
          />

          {selectedProduct && (
            <>
              <View style={styles.selectedItemContainer}>
                <Text style={styles.selectedItemLabel}>Your Selected Item:</Text>
                <View style={styles.selectedItemDetails}>
                  <Image
                    source={{ uri: selectedProduct.images?.[0] || 'https://via.placeholder.com/100' }}
                    style={styles.smallImage}
                  />
                  <View>
                    <Text style={styles.selectedItemTitle}>{selectedProduct.title}</Text>
                    <Text style={styles.selectedItemPrice}>₦{selectedProduct.price.toLocaleString()}</Text>
                  </View>
                </View>
              </View>

              {renderPriceDifference()}

              {/* AI Value Assessment */}
              {selectedProduct && (
                <AIValueAssessment 
                  product={selectedProduct}
                  showInline={true}
                />
              )}

              {/* AI Smart Matches for Better Options */}
              {requestedProduct && (
                <SmartRecommendationsCard 
                  productId={requestedProduct._id}
                  maxItems={3}
                  title="🤖 AI Alternative Matches"
                />
              )}

              {/* Comprehensive Shipping Section */}
              <View style={styles.shippingSection}>
                <Text style={styles.sectionTitle}>📦 Delivery & Protection</Text>
                
                <ShippingOptions
                  baseAmount={selectedProduct.price}
                  selectedShipping={selectedShipping}
                  onShippingSelect={handleShippingSelection}
                />

                <View style={styles.protectionBadge}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.gold} />
                  <Text style={styles.protectionText}>{getProtectionLevel()}</Text>
                </View>

                {/* Address Management for Delivery Options */}
                {selectedShipping !== 'self-arranged' && (
                  <>
                    <TouchableOpacity
                      style={styles.addressButton}
                      onPress={() => setShowAddressManager(true)}
                    >
                      <Ionicons name="location-outline" size={20} color={COLORS.gold} />
                      <Text style={styles.addressButtonText}>
                        {selectedAddress ? 
                          `${selectedAddress.name} - ${selectedAddress.city}` : 
                          'Select Delivery Address'
                        }
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color="#888" />
                    </TouchableOpacity>

                    {/* Shipping Rate Selection for Premium Delivery */}
                    {selectedShipping === 'premium-delivery' && selectedAddress && (
                      <TouchableOpacity
                        style={styles.shippingRateButton}
                        onPress={() => setShowShippingPreferences(true)}
                      >
                        <Ionicons name="rocket-outline" size={20} color={COLORS.gold} />
                        <Text style={styles.shippingRateText}>
                          {selectedRate ? 
                            `${selectedRate.carrier} - ₦${selectedRate.fee.toLocaleString()}` :
                            'Choose Shipping Rate'
                          }
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color="#888" />
                      </TouchableOpacity>
                    )}

                    {/* Cost Summary */}
                    {(shippingFee > 0 || insuranceFee > 0) && (
                      <View style={styles.costSummary}>
                        <Text style={styles.costTitle}>Additional Costs:</Text>
                        {shippingFee > 0 && (
                          <View style={styles.costRow}>
                            <Text style={styles.costLabel}>Shipping:</Text>
                            <Text style={styles.costValue}>₦{shippingFee.toLocaleString()}</Text>
                          </View>
                        )}
                        {insuranceFee > 0 && (
                          <View style={styles.costRow}>
                            <Text style={styles.costLabel}>Insurance:</Text>
                            <Text style={styles.costValue}>₦{insuranceFee.toLocaleString()}</Text>
                          </View>
                        )}
                        <View style={[styles.costRow, styles.totalRow]}>
                          <Text style={styles.totalLabel}>Total Extra Cost:</Text>
                          <Text style={styles.totalValue}>₦{calculateTotalCost().toLocaleString()}</Text>
                        </View>
                      </View>
                    )}
                  </>
                )}
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, !selectedProduct && { opacity: 0.5 }]}
            onPress={handleSendSwap}
            disabled={!selectedProduct || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#121212" />
            ) : (
              <>
                <Ionicons name="swap-horizontal-outline" size={20} color="#121212" />
                <Text style={styles.submitText}>Send Swap Offer</Text>
              </>
            )}
          </TouchableOpacity>
        </>
      )}

      {/* Address Manager Modal */}
      <Modal
        visible={showAddressManager}
        animationType="slide"
        onRequestClose={() => setShowAddressManager(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Delivery Address</Text>
            <TouchableOpacity onPress={() => setShowAddressManager(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <AddressManager
            selectedShipping={selectedShipping}
            selectedAddress={selectedAddress}
            onAddressSelect={(address) => {
              handleAddressSelect(address);
              setShowAddressManager(false);
            }}
            packageValue={selectedProduct?.price || 10000}
            packageWeight={1.0}
          />
        </View>
      </Modal>

      {/* Shipping Preferences Modal */}
      <Modal
        visible={showShippingPreferences}
        animationType="slide"
        onRequestClose={() => setShowShippingPreferences(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose Shipping Rate</Text>
            <TouchableOpacity onPress={() => setShowShippingPreferences(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          {selectedAddress && (
            <ShippingPreferences
              fromAddress={{
                address: "Pickup Location", // This should come from the other party
                city: "Lagos",
                state: "Lagos"
              }}
              toAddress={selectedAddress}
              packageValue={selectedProduct?.price || 10000}
              packageWeight={1.0}
              onRateSelect={handleShippingRateSelect}
              onClose={() => setShowShippingPreferences(false)}
            />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: { color: COLORS.gold, fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  targetProductCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
  },
  label: { color: '#fff', fontSize: 14, marginVertical: 10 },
  productCard: {
    width: 140,
    marginRight: 16,
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  selectedCard: { borderColor: COLORS.gold, borderWidth: 2 },
  image: { width: 100, height: 100, borderRadius: 8 },
  smallImage: { width: 50, height: 50, borderRadius: 8, marginRight: 10 },
  title: { color: '#fff', marginTop: 8, fontWeight: 'bold' },
  price: { color: COLORS.gold, fontSize: 12, marginTop: 4 },
  input: {
    backgroundColor: '#1E1E1E',
    color: '#fff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gold,
    marginBottom: 20,
  },
  submitBtn: {
    backgroundColor: COLORS.gold,
    padding: 14,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  submitText: { color: '#121212', fontWeight: 'bold' },
  priceDifferenceContainer: {
    backgroundColor: '#1E1E1E',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
  },
  priceDifferenceText: { color: '#fff', fontSize: 14, marginBottom: 10 },
  higherText: { color: '#4CAF50', fontWeight: 'bold' },
  lowerText: { color: '#F44336', fontWeight: 'bold' },
  selectedItemContainer: {
    backgroundColor: '#1E1E1E',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
  },
  selectedItemLabel: { color: '#fff', fontSize: 14, marginBottom: 8 },
  selectedItemDetails: { flexDirection: 'row', alignItems: 'center' },
  selectedItemTitle: { color: '#fff', fontWeight: 'bold' },
  selectedItemPrice: { color: COLORS.gold, fontSize: 12, marginTop: 4 },
  
  // New shipping-related styles
  shippingSection: {
    backgroundColor: '#1E1E1E',
    padding: 15,
    borderRadius: 10,
    marginVertical: 15,
  },
  sectionTitle: {
    color: COLORS.gold,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  protectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    padding: 8,
    borderRadius: 6,
    marginTop: 10,
  },
  protectionText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 6,
    flex: 1,
  },
  addressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  addressButtonText: {
    color: '#fff',
    flex: 1,
    marginHorizontal: 10,
  },
  shippingRateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  shippingRateText: {
    color: '#fff',
    flex: 1,
    marginHorizontal: 10,
  },
  costSummary: {
    backgroundColor: '#2A2A2A',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  costTitle: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  costLabel: {
    color: '#ccc',
    fontSize: 12,
  },
  costValue: {
    color: '#fff',
    fontSize: 12,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#444',
    marginTop: 8,
    paddingTop: 8,
  },
  totalLabel: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: 'bold',
  },
  totalValue: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Payment Calculation Box Styles
  paymentCalculationBox: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 15,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#444',
  },
  calculationTitle: {
    color: COLORS.gold,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  calculationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  calculationLabel: {
    color: '#ccc',
    fontSize: 14,
    flex: 1,
  },
  calculationValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  calculationDivider: {
    height: 1,
    backgroundColor: '#444',
    marginVertical: 8,
  },
  extraPaymentAmount: {
    color: COLORS.gold,
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentNote: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  thresholdInfo: {
    color: '#4CAF50',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
    backgroundColor: '#1e3a1e',
    padding: 6,
    borderRadius: 4,
    fontWeight: '500',
  },
  targetProductInfo: {
    flex: 1,
    marginLeft: 10,
  },
  alternativeText: {
    color: '#888',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 6,
    fontStyle: 'italic',
  },
  directPurchaseButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 4,
  },
});