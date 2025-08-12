// screens/PaymentScreen.tsx - COMPLETE and ACCURATE Implementation
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { RootState } from '@store';
import COLORS from '@constants/colors';
import { Ionicons } from '@expo/vector-icons';
import Button from '@components/Button';
import { apiClient } from '@config/index';
import { getAuthToken, getCurrentUser } from '@utils/auth';
import { CartItem as NavigationCartItem } from '../navigation/types';
import { Product } from '@types';

// FIXED: Add these imports
import { useAppSelector } from '@/store/redux/hooks';
import { getCurrentUserCartItems } from '@/store/redux/slices/cartSlice';

// Import enhanced shipping components
import ShippingOptions from '@components/ShippingOptions';
import AddressManager from '@components/AddressManager';
import OrderSummary from '@components/OrderSummary';
import ShippingPreferences from '@components/ShippingPreferences';

// Define the Redux CartItem type
interface ReduxCartItem extends Product {
  quantity: number;
  addedAt: string;
}

type PaymentMethod = 'card' | 'wallet' | 'momo' | 'hybrid';
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

// Enhanced shipping rate interface
interface ShippingRate {
  carrier: string;
  service: string;
  fee: number;
  delivery_time: string;
  pickup_time?: string;
  tracking_level?: number;
  ratings?: number;
  service_code?: string;
  courier_id?: string;
  speed_rating: 'economy' | 'standard' | 'express' | 'premium';
  insurance_available: boolean;
  features: string[];
  with_insurance?: InsuranceOption[];
}

interface InsuranceOption {
  insurance_type: string;
  insurance_fee: number;
  total_cost: number;
  coverage: number;
}

// Type adapter function
const adaptReduxCartItemToNavigation = (reduxItem: ReduxCartItem): NavigationCartItem => {
  const userObj = typeof reduxItem.user === 'string' 
    ? {
        _id: reduxItem.user,
        fullName: 'Unknown User',
        level: 'basic',
        isPro: false,
        isAdmin: false,
        id: reduxItem.user,
      }
    : {
        _id: reduxItem.user._id || '',
        fullName: reduxItem.user.fullName || 'Unknown User',
        level: reduxItem.user.level || 'basic',
        isPro: reduxItem.user.isPro || false,
        isAdmin: reduxItem.user.isAdmin || false,
        id: reduxItem.user._id || '',
      };

  return {
    _id: reduxItem._id,
    title: reduxItem.title,
    price: reduxItem.price,
    category: reduxItem.category,
    type: reduxItem.type,
    images: reduxItem.images,
    description: reduxItem.description,
    user: userObj,
    createdAt: reduxItem.createdAt,
    updatedAt: (reduxItem as any).updatedAt || new Date().toISOString(),
    __v: (reduxItem as any).__v || 0,
    quantity: reduxItem.quantity,
    addedAt: reduxItem.addedAt,
  };
};

// Function to convert Product to NavigationCartItem for direct purchases
const convertProductToCartItem = (product: Product, quantity: number): NavigationCartItem => {
  const userObj = typeof product.user === 'string' 
    ? {
        _id: product.user,
        fullName: 'Unknown User',
        level: 'basic',
        isPro: false,
        isAdmin: false,
        id: product.user,
      }
    : {
        _id: product.user._id || '',
        fullName: product.user.fullName || 'Unknown User',
        level: product.user.level || 'basic',
        isPro: product.user.isPro || false,
        isAdmin: product.user.isAdmin || false,
        id: product.user._id || '',
      };

  return {
    _id: product._id,
    title: product.title,
    price: product.price,
    category: product.category,
    type: product.type,
    images: product.images,
    description: product.description,
    user: userObj,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt || new Date().toISOString(),
    __v: product.__v || 0,
    quantity: quantity,
    addedAt: new Date().toISOString(),
  };
};

const PaymentScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  // Type-safe route parameter extraction with fallbacks
  const routeParams = route.params as any || {};
  const product = routeParams.product;
  const directQuantity = routeParams.quantity;
  const directTotal = routeParams.totalAmount;
  
  // Swap payment parameters
  const isSwapPayment = routeParams.swapPayment;
  const swapId = routeParams.swapId;
  const swapAmount = routeParams.amount;
  const swapDescription = routeParams.description;
  const swapRecipient = routeParams.recipient;
  
  console.log('🔍 PaymentScreen - Route params:', routeParams);
  console.log('🔍 PaymentScreen - Is swap payment:', isSwapPayment);
  
  // Use the same user-specific cart selector as CartScreen
  const reduxCartItems = useAppSelector(getCurrentUserCartItems) as ReduxCartItem[];
  const { totalAmount: cartTotalAmount, totalItems: cartTotalItems } = useAppSelector((state: RootState) => state.cart);
  
  // Ensure cartItems is always an array
  const safeReduxCartItems = Array.isArray(reduxCartItems) ? reduxCartItems : [];
  
  // Monitor cart changes
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔍 PaymentScreen FOCUS - Redux cart items:', safeReduxCartItems.length);
      console.log('🔍 PaymentScreen FOCUS - Redux cart total:', cartTotalAmount);
    }, [safeReduxCartItems.length, cartTotalAmount])
  );
  
  // Determine payment type
  const isDirectPurchase = !!product;
  
  // Use safeReduxCartItems with proper error handling
  const cartItems: NavigationCartItem[] = React.useMemo(() => {
    try {
      if (isSwapPayment) {
        // For swap payments, we don't need cart items - just the payment amount
        return [];
      } else if (isDirectPurchase) {
        if (!product) {
          console.warn('⚠️ Direct purchase attempted without product');
          return [];
        }
        return [convertProductToCartItem(product, directQuantity || 1)];
      } else {
        if (!safeReduxCartItems || !Array.isArray(safeReduxCartItems)) {
          console.warn('⚠️ Redux cart items is not an array:', safeReduxCartItems);
          return [];
        }
        return safeReduxCartItems.map(adaptReduxCartItemToNavigation);
      }
    } catch (error) {
      console.error('❌ Error calculating cart items:', error);
      return [];
    }
  }, [isSwapPayment, isDirectPurchase, product, directQuantity, safeReduxCartItems]);
  
  // Use safe values for amount calculations
  const baseAmount = React.useMemo(() => {
    try {
      if (isSwapPayment) {
        return swapAmount || 0;
      } else if (isDirectPurchase) {
        return directTotal || 0;
      } else {
        return cartTotalAmount || 0;
      }
    } catch (error) {
      console.error('❌ Error calculating base amount:', error);
      return 0;
    }
  }, [isSwapPayment, swapAmount, isDirectPurchase, directTotal, cartTotalAmount]);
  
  const totalItems = React.useMemo(() => {
    try {
      if (isSwapPayment) {
        return 1; // Swap payment is always 1 "item"
      } else if (isDirectPurchase) {
        return directQuantity || 1;
      } else {
        return cartTotalItems || safeReduxCartItems.length || 0;
      }
    } catch (error) {
      console.error('❌ Error calculating total items:', error);
      return 0;
    }
  }, [isSwapPayment, isDirectPurchase, directQuantity, cartTotalItems, safeReduxCartItems.length]);

  // Calculate package details for shipping
  const packageDetails = React.useMemo(() => {
    if (cartItems.length === 0) return { weight: 1, value: 0 };
    
    const totalValue = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const estimatedWeight = cartItems.reduce((sum, item) => {
      const categoryWeights: { [key: string]: number } = {
        'electronics': 1.2,
        'fashion': 0.4,
        'books': 0.5,
        'home': 2.5,
        'beauty': 0.3,
        'food': 0.8,
      };
      const categoryWeight = categoryWeights[item.category?.toLowerCase()] || 0.6;
      return sum + (categoryWeight * item.quantity);
    }, 0);

    return {
      weight: Math.max(0.1, Math.round(estimatedWeight * 100) / 100),
      value: Math.round(totalValue),
    };
  }, [cartItems]);
  
  console.log('🔍 PaymentScreen - Final calculated data:');
  console.log('🔍 PaymentScreen - Is direct purchase:', isDirectPurchase);
  console.log('🔍 PaymentScreen - Cart items length:', cartItems?.length || 0);
  console.log('🔍 PaymentScreen - Base amount:', baseAmount);
  console.log('🔍 PaymentScreen - Total items:', totalItems);
  console.log('🔍 PaymentScreen - Package details:', packageDetails);

  // State management
  const [selectedShipping, setSelectedShipping] = useState<ShippingMethod>('self-arranged');
  const [selectedAddress, setSelectedAddress] = useState<ShippingAddress | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('card');
  const [loading, setLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  
  // Enhanced shipping state
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null);
  const [selectedInsurance, setSelectedInsurance] = useState<InsuranceOption | null>(null);
  const [showShippingPreferences, setShowShippingPreferences] = useState(false);
  const [shippingFee, setShippingFee] = useState(0);
  const [insuranceFee, setInsuranceFee] = useState(0);

  // Early return if cart is empty and not a swap payment
  if ((!cartItems || cartItems.length === 0) && !isSwapPayment) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerText}>Payment</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {isDirectPurchase ? 'Product not found' : 'Your cart is empty'}
          </Text>
          <Button
            title="Go Back"
            onPress={() => navigation.goBack()}
            style={styles.goBackButton}
          />
        </View>
      </View>
    );
  }

// UPDATED: Service fee calculation - calculated on base amount only, not shipping
const getServiceFeePercentage = () => {
  switch (selectedShipping) {
    case 'basic-delivery':
      return 0.025; // 2.5%
    case 'premium-delivery':
      return 0.045; // 4.5%
    default:
      return 0;
  }
};

// ✅ CORRECTED: Calculate amounts with proper fee distribution
const serviceFeePercentage = getServiceFeePercentage();

// Service fee should only be calculated on the base amount (items), not shipping
const serviceFee = Math.round(baseAmount * serviceFeePercentage);

// Seller receives base amount minus service fee (shipping doesn't affect seller)
const sellerReceives = baseAmount - serviceFee;

// Total amount user pays includes everything
const totalAmount = baseAmount + shippingFee + insuranceFee;

// Total before fees is just the base amount (for display purposes)
const totalBeforeFees = baseAmount;

console.log('💰 CORRECTED Payment Breakdown:', {
  baseAmount,           // ₦852,500 (items only)
  shippingFee,          // ₦1,200 (goes to shipping provider)
  insuranceFee,         // ₦0 (goes to insurance provider)
  serviceFee,           // ₦21,313 (2.5% of base amount only)
  serviceFeePercentage, // 0.025 (2.5%)
  sellerReceives,       // ₦831,187 (base - service fee)
  totalAmount,          // ₦853,700 (base + shipping + insurance)
  totalBeforeFees,      // ₦852,500 (same as base amount)
  
  // ✅ This shows the correct flow:
  breakdown: {
    buyer_pays: totalAmount,              // ₦853,700
    seller_gets: sellerReceives,          // ₦831,187  
    platform_gets: serviceFee,           // ₦21,313
    shipping_provider_gets: shippingFee,  // ₦1,200
    insurance_provider_gets: insuranceFee // ₦0
  }
});

  // Fetch wallet balance
  useEffect(() => {
    const fetchWalletBalance = async () => {
      try {
        console.log('🔍 PaymentScreen: Fetching wallet balance...');
        
        const response = await apiClient.get('/api/wallet/balance');
        
        console.log('✅ PaymentScreen: Wallet balance fetched successfully');
        
        const balance = response.balance || response.data?.balance || 0;
        setWalletBalance(balance);
        setWalletError(null);
      } catch (error: any) {
        console.error('❌ PaymentScreen: Wallet error:', error);
        
        let errorMessage = 'Could not load wallet balance';
        if (error?.status === 404) {
          errorMessage = 'Wallet service not available';
        } else if (error?.status === 401) {
          errorMessage = 'Please log in to view wallet balance';
        }
        
        setWalletError(errorMessage);
        setWalletBalance(0);
      }
    };

    fetchWalletBalance();
  }, []);

  // Handle shipping method selection
  const handleShippingSelection = (method: ShippingMethod) => {
    setSelectedShipping(method);
    // Reset shipping details when changing methods
    if (method === 'self-arranged') {
      setShippingFee(0);
      setInsuranceFee(0);
      setSelectedRate(null);
      setSelectedInsurance(null);
    }
  };

  // Handle address selection
  const handleAddressSelect = (address: ShippingAddress | null) => {
    setSelectedAddress(address);
    // Reset rate selection when address changes
    setSelectedRate(null);
    setSelectedInsurance(null);
    setShippingFee(0);
    setInsuranceFee(0);
  };

  // Handle shipping rate and insurance selection
  const handleShippingRateSelect = (rate: ShippingRate, insurance?: InsuranceOption) => {
    console.log('🔍 Selected shipping rate:', rate.carrier, rate.service, rate.fee);
    console.log('🔍 Selected insurance:', insurance);

    setSelectedRate(rate);
    setSelectedInsurance(insurance || null);
    setShippingFee(rate.fee);
    setInsuranceFee(insurance?.insurance_fee || 0);
    setShowShippingPreferences(false);
  };

  // Legacy shipping rate update (for AddressManager compatibility)
  const handleShippingRateUpdate = (fee: number) => {
    // Only use this if no specific rate is selected
    if (!selectedRate) {
      setShippingFee(fee);
    }
  };

  // Handle payment processing with service fee deduction logic
  const handlePayment = async () => {
    if (!selectedMethod) return Alert.alert('Select a payment method');
    if (!isSwapPayment && (!cartItems || cartItems.length === 0)) return Alert.alert('Your cart is empty');

    // Validate shipping requirements
    if (selectedShipping !== 'self-arranged') {
      if (!selectedAddress?.address || !selectedAddress?.city || !selectedAddress?.state) {
        Alert.alert('Address Required', 'Please select or add a delivery address');
        return;
      }
      
      // Validate that a shipping rate is selected for premium delivery
      if (selectedShipping === 'premium-delivery' && !selectedRate) {
        Alert.alert('Shipping Rate Required', 'Please select a shipping option');
        return;
      }
    }

    setLoading(true);
    try {
      console.log('🔍 PaymentScreen: Processing payment with method:', selectedMethod);
      console.log('🔍 PaymentScreen: Is direct purchase:', isDirectPurchase);
      
      // Handle different payment types
      let paymentData;
      let apiEndpoint;
      let enhancedCartItems = []; // Initialize outside the if block
      
      if (isSwapPayment) {
        // Swap payment logic
        apiEndpoint = {
          wallet: '/api/swaps/payment/wallet',
          card: '/api/swaps/payment/card',
          hybrid: '/api/swaps/payment/hybrid'
        };
        
        paymentData = {
          swapId,
          amount: totalAmount,
          description: swapDescription,
          recipient: swapRecipient,
        };
      } else {
        // Regular cart/direct purchase logic
        enhancedCartItems = cartItems.map(item => ({
          ...item,
          shippingMethod: selectedShipping === 'self-arranged' ? 'self-arranged' : 'shipbubble',
          verificationLevel: selectedShipping,
          // Service fee is now distributed per item but deducted from payment, not added
          serviceFeePerItem: serviceFee / cartItems.length,
          shippingFeePerItem: shippingFee / cartItems.length,
          insuranceFeePerItem: insuranceFee / cartItems.length,
          shippingAddress: selectedShipping !== 'self-arranged' ? selectedAddress : null,
          // Include selected rate and insurance details
          selectedShippingRate: selectedRate,
          selectedInsurance: selectedInsurance,
        }));

        apiEndpoint = {
          wallet: '/api/pay/wallet/cart-pay',
          card: '/api/pay/cart-pay',
          hybrid: '/api/pay/wallet/cart-pay-partial'
        };

        paymentData = {
          items: enhancedCartItems,
          totalAmount, // This is what user pays (includes shipping + insurance)
          baseAmount, // Product cost only
          serviceFee, // This will be deducted from payment, not added
          serviceFeePercentage, // Backend needs this for calculation
          shippingFee,
          insuranceFee,
          sellerReceives, // What seller gets after service fee deduction
          feeDeductionMode: true, // Flag to tell backend to deduct, not add
          isDirectPurchase, // Flag to tell backend not to clear user's actual cart
          // Include shipping details for backend processing
          shippingDetails: selectedRate ? {
            carrier: selectedRate.carrier,
            service: selectedRate.service,
            service_code: selectedRate.service_code,
            courier_id: selectedRate.courier_id,
            delivery_time: selectedRate.delivery_time,
            pickup_time: selectedRate.pickup_time,
            insurance_option: selectedInsurance?.insurance_type || 'none',
            insurance_coverage: selectedInsurance?.coverage || 0,
          } : null,
        };
      }

      console.log('💰 Sending payment data:', {
        totalAmount,
        serviceFee,
        sellerReceives,
        feeDeductionMode: true
      });

      if (selectedMethod === 'wallet') {
        console.log('🔍 PaymentScreen: Processing wallet payment...');
        
        const res = await apiClient.post(apiEndpoint.wallet, paymentData);
        
        console.log('✅ PaymentScreen: Wallet payment successful');
        
        if (isSwapPayment) {
          navigation.navigate('PaymentSuccess', {
            isSwapPayment: true,
            swapId,
            amount: totalAmount,
            description: swapDescription,
            recipient: swapRecipient,
            reference: res.reference || `SWAP-WALLET-${Date.now()}`,
          } as any);
        } else {
          navigation.navigate('PaymentSuccess', {
            cartItems: enhancedCartItems,
            totalAmount,
            serviceFee,
            sellerReceives,
            reference: res.reference || `WALLET-${Date.now()}`,
          } as any);
        }

      } else if (selectedMethod === 'card') {
        console.log('🔍 PaymentScreen: Processing card payment...');
        
        const res = await apiClient.post(apiEndpoint.card, paymentData);

        const { authorization_url, reference } = res;
        
        console.log('✅ PaymentScreen: Card payment initialized');

        if (isSwapPayment) {
          navigation.navigate('PaystackWebview', {
            url: authorization_url,
            reference,
            isSwapPayment: true,
            swapId,
            amount: totalAmount,
            description: swapDescription,
            recipient: swapRecipient,
            purpose: 'swap_payment',
            onSuccess: (paymentReference: string) => {
              navigation.navigate('PaymentSuccess', {
                isSwapPayment: true,
                swapId,
                amount: totalAmount,
                description: swapDescription,
                recipient: swapRecipient,
                reference: paymentReference,
              } as any);
            },
            onClose: () => {
              console.log('Swap payment cancelled by user');
            }
          });
        } else {
          navigation.navigate('PaystackWebview', {
            url: authorization_url,
            reference,
            cartItems: enhancedCartItems,
            totalAmount,
            serviceFee,
            sellerReceives,
            purpose: isDirectPurchase ? 'direct_payment' : 'cart_payment',
            onSuccess: (paymentReference: string) => {
              navigation.reset({
                index: 0,
                routes: [
                  {
                    name: 'PaymentSuccess',
                    params: {
                      cartItems: enhancedCartItems,
                      totalAmount,
                      serviceFee,
                      sellerReceives,
                      reference: paymentReference,
                    } as any,
                  },
                ],
              });
            },
            onClose: () => {
              console.log('Payment cancelled by user');
            }
          });
        }

      } else if (selectedMethod === 'hybrid') {
        console.log('🔍 PaymentScreen: Processing hybrid payment...');
        
        const res = await apiClient.post(apiEndpoint.hybrid, paymentData);
        
        const { amountLeft, authorization_url, reference } = res;

        console.log('✅ PaymentScreen: Hybrid payment initialized, amount left:', amountLeft);

        if (amountLeft <= 0) {
          navigation.navigate('PaymentSuccess', { 
            cartItems: enhancedCartItems,
            totalAmount,
            serviceFee,
            sellerReceives,
            reference: reference || `WALLET-PARTIAL-${Date.now()}`,
          } as any);
        } else {
          navigation.navigate('PaystackWebview', {
            url: authorization_url,
            reference,
            cartItems: enhancedCartItems,
            totalAmount: amountLeft,
            serviceFee,
            sellerReceives,
            purpose: 'hybrid_payment',
            onSuccess: (paymentReference: string) => {
              navigation.reset({
                index: 0,
                routes: [
                  {
                    name: 'PaymentSuccess',
                    params: {
                      cartItems: enhancedCartItems,
                      totalAmount,
                      serviceFee,
                      sellerReceives,
                      reference: paymentReference,
                    } as any,
                  },
                ],
              });
            },
            onClose: () => {
              Alert.alert('Payment Incomplete', 'Wallet amount was used but card payment was cancelled');
            }
          });
        }
      } else {
        Alert.alert('Mobile Money not available yet');
      }
    } catch (err: any) {
      console.error('❌ PaymentScreen: Payment error:', err);
      
      let errorMessage = 'Payment failed';
      if (err?.status === 404) {
        errorMessage = 'Payment service not available';
      } else if (err?.status === 401) {
        errorMessage = 'Please log in to make payments';
      } else if (err?.status === 400) {
        errorMessage = err?.message || 'Invalid payment data';
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      Alert.alert('Payment Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
    card: 'card',
    wallet: 'wallet',
    momo: 'phone-portrait-outline',
    hybrid: 'swap-horizontal-outline',
  };

  const labels = {
    card: 'Credit/Debit Card',
    wallet: 'Wallet Balance',
    momo: 'Mobile Money',
    hybrid: 'Wallet + Card (Hybrid)',
  };

  const paymentMethods: PaymentMethod[] = ['card', 'wallet', 'hybrid', 'momo'];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerText}>
            {isSwapPayment ? 'Swap Payment' : isDirectPurchase ? 'Buy Now' : 'Checkout'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Enhanced Shipping Options Component - Not needed for swap payments */}
        {!isSwapPayment && (
          <ShippingOptions
            baseAmount={baseAmount}
            selectedShipping={selectedShipping}
            onShippingSelect={handleShippingSelection}
          />
        )}

        {/* Address Manager Component - Not needed for swap payments */}
        {!isSwapPayment && (
          <AddressManager
            selectedShipping={selectedShipping}
            selectedAddress={selectedAddress}
            onAddressSelect={handleAddressSelect}
            onShippingRateUpdate={handleShippingRateUpdate}
            showRatesInfo={true}
            packageValue={packageDetails.value}
            packageWeight={packageDetails.weight}
          />
        )}

        {/* Enhanced Shipping Selection for Premium Delivery */}
        {selectedShipping === 'premium-delivery' && selectedAddress && (
          <View style={styles.shippingSelectionSection}>
            <TouchableOpacity
              style={styles.shippingSelectionButton}
              onPress={() => setShowShippingPreferences(true)}
            >
              <View style={styles.shippingSelectionContent}>
                <Ionicons name="rocket-outline" size={24} color={COLORS.gold} />
                <View style={styles.shippingSelectionText}>
                  <Text style={styles.shippingSelectionTitle}>
                    {selectedRate ? 'Selected Shipping Option' : 'Choose Shipping Options'}
                  </Text>
                  {selectedRate ? (
                    <View>
                      <Text style={styles.shippingSelectionSubtitle}>
                        {selectedRate.carrier} • {selectedRate.service} • {selectedRate.delivery_time}
                      </Text>
                      <Text style={styles.shippingSelectionPrice}>
                        ₦{selectedRate.fee.toLocaleString()}
                        {selectedInsurance && selectedInsurance.insurance_fee > 0 && (
                          <Text style={styles.insurancePrice}>
                            {' '}+ ₦{selectedInsurance.insurance_fee} insurance
                          </Text>
                        )}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.shippingSelectionSubtitle}>
                      Compare carriers, speeds, and insurance options
                    </Text>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gold} />
            </TouchableOpacity>

            {/* Selected Rate Summary */}
            {selectedRate && (
              <View style={styles.selectedRateSummary}>
                <View style={styles.rateSummaryRow}>
                  <Text style={styles.rateSummaryLabel}>Carrier:</Text>
                  <Text style={styles.rateSummaryValue}>{selectedRate.carrier}</Text>
                </View>
                <View style={styles.rateSummaryRow}>
                  <Text style={styles.rateSummaryLabel}>Delivery:</Text>
                  <Text style={styles.rateSummaryValue}>{selectedRate.delivery_time}</Text>
                </View>
                <View style={styles.rateSummaryRow}>
                  <Text style={styles.rateSummaryLabel}>Pickup:</Text>
                  <Text style={styles.rateSummaryValue}>
                    {selectedRate.pickup_time || 'Same day'}
                  </Text>
                </View>
                {selectedInsurance && (
                  <View style={styles.rateSummaryRow}>
                    <Text style={styles.rateSummaryLabel}>Insurance:</Text>
                    <Text style={styles.rateSummaryValue}>
                      ₦{selectedInsurance.coverage.toLocaleString()} coverage
                    </Text>
                  </View>
                )}
                {selectedRate.features && selectedRate.features.length > 0 && (
                  <View style={styles.rateSummaryFeatures}>
                    {selectedRate.features.slice(0, 3).map((feature, index) => (
                      <View key={index} style={styles.featureTag}>
                        <Text style={styles.featureTagText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Swap Payment Summary or Order Summary */}
        {isSwapPayment ? (
          <View style={styles.swapPaymentSummary}>
            <Text style={styles.swapSummaryTitle}>💰 Swap Payment Details</Text>
            <View style={styles.swapSummaryContainer}>
              <View style={styles.swapSummaryRow}>
                <Text style={styles.swapSummaryLabel}>Description:</Text>
                <Text style={styles.swapSummaryValue}>{swapDescription}</Text>
              </View>
              <View style={styles.swapSummaryRow}>
                <Text style={styles.swapSummaryLabel}>Recipient:</Text>
                <Text style={styles.swapSummaryValue}>{swapRecipient}</Text>
              </View>
              <View style={[styles.swapSummaryRow, styles.swapSummaryTotal]}>
                <Text style={styles.swapSummaryTotalLabel}>Payment Amount:</Text>
                <Text style={styles.swapSummaryTotalValue}>₦{totalAmount.toLocaleString()}</Text>
              </View>
              <Text style={styles.swapSummaryNote}>
                💡 This payment completes your swap transaction
              </Text>
            </View>
          </View>
        ) : (
          <OrderSummary
            baseAmount={baseAmount}
            serviceFee={serviceFee}
            shippingFee={shippingFee}
            insuranceFee={insuranceFee}
            totalItems={totalItems}
            feeDeductionMode={true} // New prop to show fees are deducted
            sellerReceives={sellerReceives} // New prop to show what seller gets
          />
        )}

        {/* Payment Methods Section */}
        <View style={styles.paymentMethods}>
          <Text style={styles.paymentTitle}>💳 Payment Method</Text>
          {paymentMethods.map((method) => (
            <View key={method}>
              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  selectedMethod === method && styles.selectedPaymentOption,
                ]}
                onPress={() => setSelectedMethod(method)}
              >
                <Ionicons name={icons[method]} size={24} color={COLORS.gold} />
                <Text style={styles.paymentOptionText}>{labels[method]}</Text>
                <Ionicons
                  name="checkmark-outline"
                  size={20}
                  color={selectedMethod === method ? COLORS.gold : '#666'}
                />
              </TouchableOpacity>

              {selectedMethod === method &&
                (method === 'wallet' || method === 'hybrid') && (
                  <View style={styles.paymentDetails}>
                    {method === 'wallet' && walletBalance !== null && (
                      <>
                        <Text style={styles.detailText}>
                          Wallet Balance: ₦{walletBalance.toLocaleString()}
                        </Text>
                        {walletBalance < totalAmount && (
                          <Text style={[styles.detailText, styles.errorText]}>
                            Insufficient balance. You need ₦
                            {(totalAmount - walletBalance).toLocaleString()} more.
                          </Text>
                        )}
                        <TouchableOpacity
                          style={styles.fundButton}
                          onPress={() => navigation.navigate('Wallet')}
                        >
                          <Text style={styles.fundButtonText}>💳 Fund Wallet</Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {method === 'hybrid' && walletBalance !== null && (
                      <>
                        <Text style={styles.detailText}>
                          ₦{Math.min(walletBalance, totalAmount).toLocaleString()} from wallet
                        </Text>
                        <Text style={styles.detailText}>
                          ₦{Math.max(0, totalAmount - walletBalance).toLocaleString()} from card
                        </Text>
                      </>
                    )}

                    {walletError && (
                      <Text style={[styles.detailText, styles.errorText]}>
                        {walletError}
                      </Text>
                    )}
                  </View>
                )}
            </View>
          ))}
        </View>

        {/* Payment Breakdown Section */}
        {serviceFee > 0 && (
          <View style={styles.paymentBreakdown}>
            <Text style={styles.breakdownTitle}>💰 Payment Breakdown</Text>
            <View style={styles.breakdownContainer}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>You Pay:</Text>
                <Text style={styles.breakdownAmount}>₦{totalAmount.toLocaleString()}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownSubLabel}>• Items + Shipping:</Text>
                <Text style={styles.breakdownSubAmount}>₦{(baseAmount + shippingFee + insuranceFee).toLocaleString()}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownSubLabel}>• Service Fee ({(serviceFeePercentage * 100).toFixed(1)}%):</Text>
                <Text style={styles.breakdownFeeAmount}>-₦{serviceFee.toLocaleString()}</Text>
              </View>
              <View style={[styles.breakdownRow, styles.breakdownSeparator]}>
                <Text style={styles.breakdownLabel}>Seller Receives:</Text>
                <Text style={styles.breakdownSellerAmount}>₦{sellerReceives.toLocaleString()}</Text>
              </View>
              <Text style={styles.breakdownNote}>
                💡 Service fee covers payment processing, buyer protection, and platform maintenance
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Shipping Preferences Modal */}
      <ShippingPreferences
        visible={showShippingPreferences}
        onClose={() => setShowShippingPreferences(false)}
        onRateSelect={handleShippingRateSelect}
        shippingAddress={selectedAddress}
        packageValue={packageDetails.value}
        packageWeight={packageDetails.weight}
      />

      <View style={styles.paymentButtonContainer}>
        <Button
          title={loading ? 'Processing...' : `Pay ₦${totalAmount.toLocaleString()}`}
          onPress={handlePayment}
          filled
          style={styles.paymentButton}
          disabled={loading}
        />
        {/* Show what seller receives under button */}
        {serviceFee > 0 && (
          <Text style={styles.sellerReceivesNote}>
            Seller receives: ₦{sellerReceives.toLocaleString()} (after {(serviceFeePercentage * 100).toFixed(1)}% service fee)
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#121212'
  },
  scrollContainer: { 
    paddingBottom: 100 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerText: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40, // Same width as back button to center title
  },
  // Empty state styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  goBackButton: {
    width: '100%',
    maxWidth: 200,
  },
  // Enhanced shipping selection styles
  shippingSelectionSection: {
    marginHorizontal: 20,
    marginVertical: 15,
  },
  shippingSelectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  shippingSelectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  shippingSelectionText: {
    marginLeft: 12,
    flex: 1,
  },
  shippingSelectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  shippingSelectionSubtitle: {
    color: '#CCCCCC',
    fontSize: 13,
    lineHeight: 18,
  },
  shippingSelectionPrice: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  insurancePrice: {
    color: '#CCCCCC',
    fontSize: 12,
  },
  selectedRateSummary: {
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.gold,
  },
  rateSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  rateSummaryLabel: {
    color: '#CCCCCC',
    fontSize: 13,
  },
  rateSummaryValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  rateSummaryFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  featureTag: {
    backgroundColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
    marginBottom: 4,
  },
  featureTagText: {
    color: '#CCCCCC',
    fontSize: 10,
  },
  // Swap payment summary styles
  swapPaymentSummary: {
    marginHorizontal: 20,
    marginVertical: 15,
  },
  swapSummaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  swapSummaryContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  swapSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  swapSummaryTotal: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 12,
    marginTop: 8,
  },
  swapSummaryLabel: {
    color: '#CCCCCC',
    fontSize: 14,
    flex: 1,
  },
  swapSummaryValue: {
    color: '#FFFFFF',
    fontSize: 14,
    flex: 2,
    textAlign: 'right',
  },
  swapSummaryTotalLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  swapSummaryTotalValue: {
    color: COLORS.gold,
    fontSize: 18,
    fontWeight: 'bold',
  },
  swapSummaryNote: {
    color: '#999',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  // Payment breakdown styles
  paymentBreakdown: {
    marginHorizontal: 20,
    marginVertical: 15,
  },
  breakdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  breakdownContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownSeparator: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 12,
    marginTop: 8,
  },
  breakdownLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  breakdownAmount: {
    color: COLORS.gold,
    fontSize: 16,
    fontWeight: 'bold',
  },
  breakdownSubLabel: {
    color: '#CCCCCC',
    fontSize: 14,
    marginLeft: 8,
  },
  breakdownSubAmount: {
    color: '#CCCCCC',
    fontSize: 14,
  },
  breakdownFeeAmount: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '500',
  },
  breakdownSellerAmount: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  breakdownNote: {
    color: '#999',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 12,
    lineHeight: 16,
  },
  paymentMethods: { 
    padding: 20 
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#FFFFFF',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#1E1E1E',
  },
  selectedPaymentOption: {
    backgroundColor: '#2A2A2A',
    borderColor: COLORS.gold,
    borderWidth: 1,
  },
  paymentOptionText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 16,
    color: '#FFFFFF',
  },
  paymentButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  paymentButton: { 
    width: '100%' 
  },
  // Seller receives note under button
  sellerReceivesNote: {
    color: '#4CAF50',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  paymentDetails: {
    padding: 15,
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    marginTop: 5,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.gold,
  },
  detailText: { 
    fontSize: 14, 
    color: '#CCCCCC',
    marginVertical: 2 
  },
  errorText: {
    color: '#FF6B6B',
  },
  fundButton: {
    backgroundColor: COLORS.gold,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: 'flex-start',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  fundButtonText: { 
    color: '#121212',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default PaymentScreen;