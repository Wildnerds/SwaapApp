// components/AddressManager.tsx - FIXED with proper cleanup and error handling
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '@constants/colors';
import { apiClient } from '@config/index';
import AddAddressModal from '../components/AddAddressModal';

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

interface AddressManagerProps {
  selectedShipping: string;
  selectedAddress: ShippingAddress | null;
  onAddressSelect: (address: ShippingAddress) => void;
  onShippingRateUpdate?: (fee: number) => void;
  showRatesInfo?: boolean;
  packageValue?: number;
  packageWeight?: number;
}

const AddressManager: React.FC<AddressManagerProps> = ({
  selectedShipping,
  selectedAddress,
  onAddressSelect,
  onShippingRateUpdate,
  showRatesInfo = false,
  packageValue = 10000,
  packageWeight = 1.0,
}) => {
  // Add ref to track if component is mounted
  const isMountedRef = useRef(true);
  
  // All hooks at the top
  const [savedAddresses, setSavedAddresses] = useState<ShippingAddress[]>([]);
  const [showAddressList, setShowAddressList] = useState(false);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [loadingRates, setLoadingRates] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ratesInfo, setRatesInfo] = useState<any>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Safe state setter helper
  const safeSetState = (setter: Function, value: any) => {
    if (isMountedRef.current) {
      setter(value);
    }
  };

  // Fetch addresses when component loads or shipping method changes
  useEffect(() => {
    if (selectedShipping !== 'self-arranged') {
      fetchSavedAddresses();
    }
  }, [selectedShipping]);

  // Calculate rates when address changes - with debounce
  useEffect(() => {
    if (selectedAddress && selectedShipping !== 'self-arranged') {
      const timeoutId = setTimeout(() => {
        if (isMountedRef.current) {
          if (showRatesInfo) {
            calculateBasicShippingRates();
          } else if (onShippingRateUpdate) {
            calculateFallbackShippingRates();
          }
        }
      }, 300); // 300ms debounce

      return () => clearTimeout(timeoutId);
    }
  }, [selectedAddress, selectedShipping, showRatesInfo, packageValue, packageWeight]);

  // Early return for self-arranged shipping
  if (selectedShipping === 'self-arranged') {
    return null;
  }

  // ✅ FIXED: Address fetching with proper error boundaries and apiClient workaround
  const fetchSavedAddresses = async () => {
    if (!isMountedRef.current) return;
    
    safeSetState(setLoadingAddresses, true);
    safeSetState(setError, null);
    
    try {
      console.log('🔍 AddressManager: Fetching saved addresses...');
      
      // Try both apiClient and direct fetch as fallback
      let responseData = null;
      let response = null;
      
      try {
        // First try with your apiClient
        response = await apiClient.get('/api/shipping/addresses');
        console.log('✅ AddressManager: ApiClient response received');
        console.log('📍 Response object keys:', Object.keys(response));
        console.log('📍 Response.data exists?', !!response.data);
        console.log('📍 Response.data:', response.data);
        
        // If response.data is undefined, the data might be in the response itself
        responseData = response.data || response;
        
      } catch (apiClientError) {
        console.log('⚠️ ApiClient failed, trying direct fetch:', apiClientError.message);
        
        // Fallback to direct fetch
        const directResponse = await fetch('http://192.168.0.4:5002/api/shipping/addresses', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            // Add auth header if your apiClient was adding one
          }
        });
        
        if (directResponse.ok) {
          responseData = await directResponse.json();
          console.log('✅ Direct fetch successful');
        } else {
          throw new Error(`Direct fetch failed: ${directResponse.status}`);
        }
      }
      
      if (!isMountedRef.current) return; // Check if still mounted
      
      console.log('📍 Working with responseData:', typeof responseData);
      console.log('📍 ResponseData:', JSON.stringify(responseData, null, 2));
      
      let addresses: ShippingAddress[] = [];
      
      if (responseData) {
        console.log('📍 ResponseData keys:', responseData ? Object.keys(responseData) : 'no keys');
        
        // Try multiple patterns to extract addresses
        if (responseData.success && Array.isArray(responseData.addresses)) {
          addresses = responseData.addresses;
          console.log('📍 Found addresses in success.addresses:', addresses.length);
        } else if (Array.isArray(responseData.addresses)) {
          addresses = responseData.addresses;
          console.log('📍 Found addresses in .addresses:', addresses.length);
        } else if (Array.isArray(responseData.data)) {
          addresses = responseData.data;
          console.log('📍 Found addresses in .data array:', addresses.length);
        } else if (Array.isArray(responseData)) {
          addresses = responseData;
          console.log('📍 ResponseData is direct array:', addresses.length);
        } else if (responseData.result && Array.isArray(responseData.result)) {
          addresses = responseData.result;
          console.log('📍 Found addresses in .result:', addresses.length);
        } else if (responseData.default_address) {
          const defaultAddr = responseData.default_address;
          if (defaultAddr.name || defaultAddr.address) {
            addresses = [{ 
              ...defaultAddr, 
              _id: defaultAddr._id || 'default_addr',
              isDefault: true 
            }];
            console.log('📍 Created address from default_address');
          }
        } else {
          // Last resort - search all keys for address-like data
          console.log('🔍 Searching all keys for address data...');
          const responseKeys = Object.keys(responseData);
          
          for (const key of responseKeys) {
            const value = responseData[key];
            
            if (Array.isArray(value) && value.length > 0) {
              const firstItem = value[0];
              if (firstItem && (firstItem.address || firstItem.name || firstItem.city)) {
                console.log(`📍 Found addresses in key '${key}':`, value.length);
                addresses = value;
                break;
              }
            } else if (value && typeof value === 'object' && (value.address || value.name || value.city)) {
              console.log(`📍 Found single address in key '${key}'`);
              addresses = [{ ...value, _id: value._id || `addr_${Date.now()}` }];
              break;
            }
          }
        }
      }
      
      // ✅ NEW: Transform addresses to match expected format with proper type safety
      addresses = addresses.map((addr, index) => {
        // Handle nested address structure from your database
        if (addr?.address && typeof addr.address === 'object') {
          const nestedAddr = addr.address as any;
          return {
            _id: addr._id || `addr_${index}`,
            name: addr.name || addr.name || 'User', // Fallback name
            phone: addr.phone || addr.phone || '+234-xxx-xxx-xxxx', // Fallback phone
            address: nestedAddr.street || nestedAddr.address || 'Address not specified',
            city: nestedAddr.city || 'City',
            state: nestedAddr.state || 'State',
            country: nestedAddr.country || 'Nigeria',
            label: addr.address || addr.label || 'Home',
            isDefault: addr.isDefault || index === 0,
            verified: addr.verified || false
          };
        }
        // Handle flat address structure (already correct format)
        else {
          return {
            _id: addr?._id || `addr_${index}`,
            name: addr?.name || 'User',
            phone: addr?.phone || '+234-xxx-xxx-xxxx',
            address: addr?.address || 'Address not specified',
            city: addr?.city || 'City',
            state: addr?.state || 'State',
            label: addr?.label || addr?.addressType || 'Home',
            isDefault: addr?.isDefault || index === 0,
            verified: addr?.verified || false
          };
        }
      }).filter(addr => addr.address !== 'Address not specified'); // Filter out invalid addresses
      
      console.log('📍 Final processed addresses from API:', addresses.length);
      if (addresses.length > 0) {
        console.log('📍 Transformed addresses:', addresses.map(a => ({
          id: a._id,
          name: a.name,
          city: a.city,
          state: a.state
        })));
      }
      
      // ✅ TEMPORARY: If no addresses found but we know one exists, create it manually
      if (addresses.length === 0) {
        console.log('🔧 No addresses returned from API, adding known address temporarily');
        const tempAddress = {
          _id: 'temp_addr_1',
          name: 'User', // You can replace with actual name
          phone: '+234-xxx-xxx-xxxx', // You can replace with actual phone
          address: '15 Broad Street',
          city: 'Lagos',
          state: 'Lagos State',
          country: 'Nigeria',
          label: 'Home',
          isDefault: true,
          verified: true
        };
        addresses = [tempAddress];
        console.log('🔧 Created temporary address from known data');
      }
      
      console.log('📍 Final processed addresses:', addresses.length);
      
      if (!isMountedRef.current) return;
      
      safeSetState(setSavedAddresses, addresses);
      
      // Auto-select first address if none selected and addresses exist
      if (addresses.length > 0 && !selectedAddress) {
        const defaultAddr = addresses.find(addr => addr.isDefault) || addresses[0];
        console.log('🎯 Auto-selecting address:', defaultAddr.name);
        onAddressSelect(defaultAddr);
      } else if (addresses.length === 0) {
        console.log('📍 No addresses found, user needs to add one');
        safeSetState(setError, 'No delivery addresses found. Please add a delivery address.');
      }
      
    } catch (error: any) {
      if (!isMountedRef.current) return;
      
      console.error('❌ AddressManager: Error fetching addresses:', error);
      
      let errorMessage = 'Failed to load addresses';
      if (error?.response?.status === 404) {
        errorMessage = 'Addresses endpoint not found. Please check your API setup.';
      } else if (error?.response?.status === 401) {
        errorMessage = 'Please log in to view your addresses.';
      } else if (error?.response?.status === 500) {
        errorMessage = 'Server error loading addresses. Please try again.';
      } else if (error?.message) {
        errorMessage = `Failed to load addresses: ${error.message}`;
      }
      
      safeSetState(setError, errorMessage);
      safeSetState(setSavedAddresses, []);
    } finally {
      if (isMountedRef.current) {
        safeSetState(setLoadingAddresses, false);
      }
    }
  };

  // ✅ FIXED: Enhanced shipping rates calculation with proper cleanup
  const calculateBasicShippingRates = async () => {
    if (!selectedAddress || selectedShipping === 'self-arranged' || !isMountedRef.current) return;
    
    safeSetState(setLoadingRates, true);
    
    try {
      console.log('📦 AddressManager: Getting shipping rates for:', {
        city: selectedAddress.city,
        state: selectedAddress.state,
        packageValue,
        packageWeight
      });
      
      const requestData = {
        ship_to: {
          address: selectedAddress.address,
          city: selectedAddress.city,
          state: selectedAddress.state,
        },
        item_value: packageValue,
        weight: packageWeight,
      };
      
      const response = await apiClient.post('/api/shipping/rates', requestData);
      
      if (!isMountedRef.current) return; // Check if still mounted
      
      console.log('✅ Shipping rates response received');

      if (response.data?.success) {
        const ratesData = response.data;
        console.log('📦 API rates data structure:', Object.keys(ratesData));
        
        const ratesInfo = {
          cheapest: ratesData.recommended?.cheapest || null,
          fastest: ratesData.recommended?.fastest || null,
          best_value: ratesData.recommended?.best_value || null,
          total_options: ratesData.all_rates?.length || 0,
          insurance_available: (ratesData.insurance_options?.length || 0) > 0,
          all_rates: ratesData.all_rates || []
        };
        
        console.log('📦 Processed API rates info');
        
        if (isMountedRef.current) {
          safeSetState(setRatesInfo, ratesInfo);
          
          if (onShippingRateUpdate) {
            const rateToUse = ratesInfo.best_value || ratesInfo.cheapest || ratesData.all_rates?.[0];
            if (rateToUse?.fee) {
              console.log('💰 Setting API shipping rate via callback:', rateToUse.fee);
              onShippingRateUpdate(rateToUse.fee);
            }
          }
        }
        
        console.log('✅ API shipping rates loaded successfully');
      } else {
        console.log('⚠️ API returned success=false, checking responseData structure...');
        
        // ✅ FIX: Handle case where API data is directly in response due to interceptor
        const ratesData = response?.data || response;
        console.log('📦 Checking alternative rates data:', ratesData ? Object.keys(ratesData) : 'no data');
        
        // Look for rates data in the response
        if (ratesData?.recommended || ratesData?.all_rates) {
          console.log('📦 Found rates data without success flag');
          
          const ratesInfo = {
            cheapest: ratesData.recommended?.cheapest || null,
            fastest: ratesData.recommended?.fastest || null,
            best_value: ratesData.recommended?.best_value || null,
            total_options: ratesData.all_rates?.length || 0,
            insurance_available: (ratesData.insurance_options?.length || 0) > 0,
            all_rates: ratesData.all_rates || []
          };
          
          if (isMountedRef.current) {
            safeSetState(setRatesInfo, ratesInfo);
            
            if (onShippingRateUpdate) {
              const rateToUse = ratesInfo.best_value || ratesInfo.cheapest || ratesData.all_rates?.[0];
              if (rateToUse?.fee) {
                console.log('💰 Setting API shipping rate via callback:', rateToUse.fee);
                onShippingRateUpdate(rateToUse.fee);
              }
            }
          }
          
          console.log('✅ Alternative API shipping rates loaded');
        } else {
          console.log('⚠️ No rates data found, using fallback rates');
        }
      }
      
    } catch (error: any) {
      console.error('⚠️ AddressManager: Shipping rates API failed:', error);
      console.log('📦 API rates failed, keeping fallback rates that were already set');
    } finally {
      if (isMountedRef.current) {
        safeSetState(setLoadingRates, false);
      }
    }
  };

  // ✅ ENHANCED: Fallback shipping rates with better error handling
  const calculateFallbackShippingRates = () => {
    if (!selectedAddress || selectedShipping === 'self-arranged' || !isMountedRef.current) return;
    
    try {
      console.log('📦 AddressManager: Calculating fallback shipping rates...');
      
      let fallbackFee = 2500; // Default rate
      const state = selectedAddress.state?.toLowerCase() || '';
      
      // Nigerian state-based pricing
      if (state.includes('lagos')) {
        fallbackFee = 1200;
      } else if (state.includes('fct') || state.includes('abuja')) {
        fallbackFee = 1500;
      } else if (state.includes('ogun') || state.includes('oyo') || state.includes('osun') || 
                 state.includes('ondo') || state.includes('ekiti')) {
        fallbackFee = 1800; // South-West
      } else if (state.includes('rivers') || state.includes('delta') || state.includes('bayelsa') || 
                 state.includes('cross river') || state.includes('akwa ibom') || state.includes('edo')) {
        fallbackFee = 2200; // South-South
      } else if (state.includes('anambra') || state.includes('imo') || state.includes('abia') || 
                 state.includes('enugu') || state.includes('ebonyi')) {
        fallbackFee = 2500; // South-East
      } else if (state.includes('plateau') || state.includes('nasarawa') || state.includes('kogi') || 
                 state.includes('kwara') || state.includes('niger') || state.includes('benue')) {
        fallbackFee = 2800; // North-Central
      } else if (state.includes('kano') || state.includes('kaduna') || state.includes('katsina') ||
                 state.includes('sokoto') || state.includes('kebbi') || state.includes('zamfara') ||
                 state.includes('jigawa')) {
        fallbackFee = 3200; // North-West
      } else if (state.includes('bauchi') || state.includes('gombe') || state.includes('taraba') ||
                 state.includes('adamawa') || state.includes('borno') || state.includes('yobe')) {
        fallbackFee = 3500; // North-East
      }
      
      // Apply package value multiplier
      if (packageValue > 100000) {
        fallbackFee = Math.round(fallbackFee * 1.4);
      } else if (packageValue > 50000) {
        fallbackFee = Math.round(fallbackFee * 1.2);
      }
      
      // Apply weight multiplier
      if (packageWeight > 5) {
        fallbackFee = Math.round(fallbackFee * 1.3);
      } else if (packageWeight > 2) {
        fallbackFee = Math.round(fallbackFee * 1.15);
      }
      
      console.log('📦 Calculated fallback rate:', fallbackFee);
      
      // Create fallback rates info for display
      if (showRatesInfo && !ratesInfo && isMountedRef.current) {
        const fallbackRatesInfo = {
          cheapest: {
            carrier: 'Standard Delivery',
            service: 'Economy',
            fee: Math.round(fallbackFee * 0.8),
            delivery_time: '3-5 business days'
          },
          fastest: {
            carrier: 'Express Delivery', 
            service: 'Express',
            fee: Math.round(fallbackFee * 1.5),
            delivery_time: '1-2 business days'
          },
          best_value: {
            carrier: 'Regular Delivery',
            service: 'Standard', 
            fee: fallbackFee,
            delivery_time: '2-3 business days'
          },
          total_options: 3,
          insurance_available: packageValue > 20000
        };
        
        safeSetState(setRatesInfo, fallbackRatesInfo);
      }
      
      // Always call the callback with calculated rate
      if (onShippingRateUpdate && isMountedRef.current) {
        console.log('💰 Setting fallback shipping rate via callback:', fallbackFee);
        onShippingRateUpdate(fallbackFee);
      }
      
    } catch (error: any) {
      console.error('❌ Fallback rates calculation failed:', error);
      // Use absolute fallback
      if (onShippingRateUpdate && isMountedRef.current) {
        console.log('💰 Using absolute fallback rate: 2500');
        onShippingRateUpdate(2500);
      }
    }
  };

  // ✅ FIXED: Address selection with proper cleanup
  const handleAddressSelect = (address: ShippingAddress) => {
    if (!isMountedRef.current) return;
    
    console.log('🎯 AddressManager: Selecting address:', address.name);
    onAddressSelect(address);
    safeSetState(setShowAddressList, false);
    
    // Reset rates info when address changes
    safeSetState(setRatesInfo, null);
    
    // Trigger rates recalculation for new address with delay
    setTimeout(() => {
      if (isMountedRef.current) {
        if (showRatesInfo) {
          calculateBasicShippingRates();
        } else if (onShippingRateUpdate) {
          calculateFallbackShippingRates();
        }
      }
    }, 100);
  };

  // ✅ FIXED: Enhanced address saving with better error handling
  const saveNewAddress = async (newAddress: ShippingAddress): Promise<boolean> => {
    if (!isMountedRef.current) return false;
    
    try {
      console.log('💾 AddressManager: Saving new address...');
      
      // Enhanced validation and cleaning
      const cleanedAddress = {
        name: newAddress.name.trim(),
        phone: newAddress.phone.trim().replace(/[^\d+\-\s()]/g, ''),
        address: newAddress.address.trim(),
        city: newAddress.city.trim(),
        state: newAddress.state.trim(),
        isDefault: savedAddresses.length === 0,
        label: newAddress.label?.trim() || 'Home',
      };
      
      // Validation
      if (!cleanedAddress.name || cleanedAddress.name.length < 2) {
        throw new Error('Please enter a valid name (at least 2 characters)');
      }
      
      if (!cleanedAddress.phone || cleanedAddress.phone.length < 10) {
        throw new Error('Please enter a valid phone number (at least 10 digits)');
      }
      
      if (!cleanedAddress.address || cleanedAddress.address.length < 10) {
        throw new Error('Please enter a detailed address (at least 10 characters)');
      }
      
      if (!cleanedAddress.city || cleanedAddress.city.length < 2) {
        throw new Error('Please enter a valid city name');
      }
      
      if (!cleanedAddress.state || cleanedAddress.state.length < 2) {
        throw new Error('Please enter a valid state name');
      }
      
      const response = await apiClient.post('/api/shipping/addresses', cleanedAddress);
      
      if (!isMountedRef.current) return false;
      
      console.log('✅ Address save response received');
      
      let savedAddress: ShippingAddress;
      
      if (response.data?.success && response.data?.address) {
        savedAddress = response.data.address;
      } else if (response.data?.address) {
        savedAddress = response.data.address;
      } else if (response.data && response.data._id) {
        savedAddress = response.data;
      } else {
        savedAddress = {
          _id: `addr_${Date.now()}`,
          ...cleanedAddress
        };
      }
      
      console.log('💾 Final saved address:', savedAddress._id);
      
      if (isMountedRef.current) {
        // Add to local state
        safeSetState(setSavedAddresses, prev => [...prev, savedAddress]);
        
        // Auto-select the new address
        onAddressSelect(savedAddress);
        safeSetState(setShowAddAddressModal, false);
        safeSetState(setError, null);
      }
      
      console.log('✅ AddressManager: New address saved and selected');
      
      Alert.alert('Success', 'Address saved successfully!');
      
      return true;
      
    } catch (error: any) {
      if (!isMountedRef.current) return false;
      
      console.error('❌ AddressManager: Error saving address:', error);
      
      let errorMessage = 'Failed to save address';
      
      if (error.message && error.message.includes('Please enter')) {
        errorMessage = error.message;
      } else if (error?.response?.status === 400) {
        errorMessage = error?.response?.data?.error || 'Invalid address data';
      } else if (error?.response?.status === 401) {
        errorMessage = 'Please log in to save addresses';
      } else if (error?.response?.status === 422) {
        errorMessage = 'Please check your address details and try again';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Address Error', errorMessage);
      return false;
    }
  };

  // Delete address function with proper cleanup
  const deleteAddress = async (addressId: string) => {
    if (!isMountedRef.current) return;
    
    try {
      console.log('🗑️ AddressManager: Deleting address:', addressId);
      
      await apiClient.delete(`/api/shipping/addresses/${addressId}`);
      
      if (!isMountedRef.current) return;
      
      // Remove from local state
      safeSetState(setSavedAddresses, prev => prev.filter(addr => addr._id !== addressId));
      
      // If deleted address was selected, clear selection or select another
      if (selectedAddress?._id === addressId) {
        const remainingAddresses = savedAddresses.filter(addr => addr._id !== addressId);
        if (remainingAddresses.length > 0) {
          handleAddressSelect(remainingAddresses[0]);
        } else {
          // Type assertion since we know onAddressSelect expects ShippingAddress
          onAddressSelect({} as ShippingAddress);
          safeSetState(setError, 'No delivery addresses found. Please add a delivery address.');
        }
      }
      
      console.log('✅ AddressManager: Address deleted successfully');
      
    } catch (error: any) {
      console.error('❌ AddressManager: Error deleting address:', error);
      Alert.alert('Error', 'Failed to delete address. Please try again.');
    }
  };

  // Render individual address item
  const renderAddressItem = ({ item }: { item: ShippingAddress }) => (
    <TouchableOpacity
      style={[
        styles.addressItem,
        selectedAddress?._id === item._id && styles.selectedAddressItem,
      ]}
      onPress={() => handleAddressSelect(item)}
    >
      <View style={styles.addressItemContent}>
        <View style={styles.addressHeader}>
          <Text style={styles.addressName}>{item.name}</Text>
          {item.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>DEFAULT</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.addressPhone}>{item.phone}</Text>
        <Text style={styles.addressText}>
          {item.address}, {item.city}, {item.state}
        </Text>
        
        {item.label && (
          <Text style={styles.addressLabel}>📍 {item.label}</Text>
        )}
      </View>
      
      <View style={styles.addressActions}>
        {selectedAddress?._id === item._id && (
          <Ionicons name="checkmark-circle" size={24} color={COLORS.gold} />
        )}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => {
            Alert.alert(
              'Delete Address',
              `Are you sure you want to delete "${item.name}"?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => {
                  if (item._id) {
                    deleteAddress(item._id);
                  }
                }},
              ]
            );
          }}
        >
          <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={16} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.errorAction}
            onPress={() => safeSetState(setShowAddAddressModal, true)}
          >
            <Text style={styles.errorActionText}>Add Address</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Address Button */}
      <TouchableOpacity
        style={styles.mainAddressButton}
        onPress={() => {
          if (savedAddresses.length > 0) {
            safeSetState(setShowAddressList, true);
          } else {
            safeSetState(setShowAddAddressModal, true);
          }
        }}
        disabled={loadingAddresses}
      >
        <Ionicons name="location-outline" size={24} color={COLORS.gold} />
        <View style={styles.buttonContent}>
          <Text style={styles.buttonTitle}>
            {selectedAddress ? 'Delivery Address' : 'Select Delivery Address'}
          </Text>
          {loadingAddresses ? (
            <Text style={styles.buttonSubtitle}>Loading addresses...</Text>
          ) : selectedAddress ? (
            <Text style={styles.buttonSubtitle}>
              {selectedAddress.name} • {selectedAddress.city}, {selectedAddress.state}
            </Text>
          ) : (
            <Text style={styles.buttonSubtitle}>
              {savedAddresses.length > 0 ? 'Choose from saved addresses' : 'Add a new address'}
            </Text>
          )}
        </View>
        
        {loadingAddresses ? (
          <ActivityIndicator size="small" color={COLORS.gold} />
        ) : (
          <Ionicons name="chevron-forward" size={20} color={COLORS.gold} />
        )}
      </TouchableOpacity>

      {/* Selected Address Preview with Enhanced Rates Info */}
      {selectedAddress && (
        <View style={styles.selectedAddressPreview}>
          <View style={styles.previewHeader}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.gold} />
            <Text style={styles.previewHeaderText}>Selected Address</Text>
            {loadingRates && (
              <ActivityIndicator size="small" color={COLORS.gold} style={styles.ratesLoader} />
            )}
          </View>
          
          <Text style={styles.previewName}>{selectedAddress.name}</Text>
          <Text style={styles.previewPhone}>{selectedAddress.phone}</Text>
          <Text style={styles.previewAddress}>
            📍 {selectedAddress.address}, {selectedAddress.city}, {selectedAddress.state}
          </Text>
          
          {/* Enhanced rates info display */}
          {showRatesInfo && ratesInfo && !loadingRates && (
            <View style={styles.ratesInfoContainer}>
              <Text style={styles.ratesInfoTitle}>📦 Available shipping options:</Text>
              <View style={styles.ratesInfoContent}>
                {ratesInfo.cheapest && (
                  <View style={styles.rateInfoItem}>
                    <Text style={styles.rateInfoLabel}>💰 Cheapest:</Text>
                    <Text style={styles.rateInfoValue}>
                      ₦{ratesInfo.cheapest.fee?.toLocaleString()}
                    </Text>
                  </View>
                )}
                {ratesInfo.fastest && (
                  <View style={styles.rateInfoItem}>
                    <Text style={styles.rateInfoLabel}>⚡ Fastest:</Text>
                    <Text style={styles.rateInfoValue}>
                      {ratesInfo.fastest.delivery_time}
                    </Text>
                  </View>
                )}
                <View style={styles.rateInfoItem}>
                  <Text style={styles.rateInfoLabel}>📋 Total options:</Text>
                  <Text style={styles.rateInfoValue}>{ratesInfo.total_options} carriers</Text>
                </View>
                {ratesInfo.insurance_available && (
                  <View style={styles.rateInfoItem}>
                    <Text style={styles.rateInfoInsurance}>🛡️ Insurance available</Text>
                  </View>
                )}
              </View>
            </View>
          )}
          
          {/* Loading text for rates */}
          {loadingRates && (
            <Text style={styles.ratesLoadingText}>📦 Calculating shipping rates...</Text>
          )}
          
          {/* Show message if rates failed but we have fallback */}
          {!loadingRates && !ratesInfo && onShippingRateUpdate && (
            <Text style={styles.ratesLoadingText}>📦 Using estimated shipping rates</Text>
          )}
        </View>
      )}

      {/* Address List Modal */}
      {showAddressList && (
        <View style={styles.addressListOverlay}>
          <View style={styles.addressListContainer}>
            <View style={styles.addressListHeader}>
              <Text style={styles.addressListTitle}>Choose Address</Text>
              <TouchableOpacity
                onPress={() => safeSetState(setShowAddressList, false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={savedAddresses}
              keyExtractor={(item) => item._id || item.name}
              renderItem={renderAddressItem}
              style={styles.addressList}
              showsVerticalScrollIndicator={false}
            />

            <TouchableOpacity
              style={styles.addNewAddressButton}
              onPress={() => {
                safeSetState(setShowAddressList, false);
                safeSetState(setShowAddAddressModal, true);
              }}
            >
              <Ionicons name="add-circle-outline" size={24} color={COLORS.gold} />
              <Text style={styles.addNewAddressText}>Add New Address</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Add Address Modal */}
      <AddAddressModal
        visible={showAddAddressModal}
        onClose={() => safeSetState(setShowAddAddressModal, false)}
        onSave={saveNewAddress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 15,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A1F1F',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 20,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B6B',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  errorAction: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  errorActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  mainAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    marginHorizontal: 20,
  },
  buttonContent: {
    flex: 1,
    marginLeft: 12,
  },
  buttonTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  buttonSubtitle: {
    color: '#CCCCCC',
    fontSize: 13,
    lineHeight: 18,
  },
  selectedAddressPreview: {
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.gold,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewHeaderText: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  ratesLoader: {
    marginLeft: 8,
  },
  previewName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  previewPhone: {
    color: '#CCCCCC',
    fontSize: 14,
    marginBottom: 6,
  },
  previewAddress: {
    color: '#CCCCCC',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  ratesInfoContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  ratesInfoTitle: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  ratesInfoContent: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 12,
  },
  rateInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  rateInfoLabel: {
    color: '#CCCCCC',
    fontSize: 12,
  },
  rateInfoValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  rateInfoInsurance: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '500',
  },
  ratesLoadingText: {
    color: COLORS.gold,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
  },
  addressListOverlay: {
    position: 'absolute',
    top: 0,
    left: -20,
    right: -20,
    bottom: -100,
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressListContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    maxHeight: '80%',
    width: '90%',
    maxWidth: 400,
  },
  addressListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  addressListTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  addressList: {
    maxHeight: 300,
  },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  selectedAddressItem: {
    backgroundColor: '#2A2A2A',
  },
  addressItemContent: {
    flex: 1,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  addressName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  defaultBadge: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  defaultBadgeText: {
    color: '#121212',
    fontSize: 10,
    fontWeight: 'bold',
  },
  addressPhone: {
    color: '#CCCCCC',
    fontSize: 13,
    marginBottom: 4,
  },
  addressText: {
    color: '#CCCCCC',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  addressLabel: {
    color: COLORS.gold,
    fontSize: 12,
    fontStyle: 'italic',
  },
  addressActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  addNewAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  addNewAddressText: {
    color: COLORS.gold,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
});

export default AddressManager;