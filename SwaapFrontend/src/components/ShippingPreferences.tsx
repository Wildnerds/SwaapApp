// components/ShippingPreferences.tsx - Complete shipping preferences selection
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '@constants/colors';
import { apiClient } from '@config/index';

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

interface CategorizedRates {
  economy: ShippingRate[];
  standard: ShippingRate[];
  express: ShippingRate[];
  premium: ShippingRate[];
}

interface RecommendedRates {
  fastest: ShippingRate;
  cheapest: ShippingRate;
  best_value: ShippingRate;
  user_favorite: ShippingRate | null;
}

interface ShippingPreferencesProps {
  visible: boolean;
  onClose: () => void;
  onRateSelect: (rate: ShippingRate, insurance?: InsuranceOption) => void;
  shippingAddress: any;
  packageValue: number;
  packageWeight: number;
}

type PreferencePriority = 'speed' | 'cost' | 'balanced';
type InsurancePreference = 'none' | 'auto' | 'always';

const ShippingPreferences: React.FC<ShippingPreferencesProps> = ({
  visible,
  onClose,
  onRateSelect,
  shippingAddress,
  packageValue,
  packageWeight,
}) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'rates' | 'preferences'>('rates');
  
  // Rates data
  const [categorizedRates, setCategorizedRates] = useState<CategorizedRates | null>(null);
  const [recommendedRates, setRecommendedRates] = useState<RecommendedRates | null>(null);
  const [allRates, setAllRates] = useState<ShippingRate[]>([]);
  const [insuranceOptions, setInsuranceOptions] = useState<any[]>([]);
  
  // Selected options
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null);
  const [selectedInsurance, setSelectedInsurance] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<'recommended' | 'economy' | 'standard' | 'express' | 'premium'>('recommended');
  
  // User preferences
  const [priority, setPriority] = useState<PreferencePriority>('balanced');
  const [maxDeliveryTime, setMaxDeliveryTime] = useState('2 days');
  const [insurancePreference, setInsurancePreference] = useState<InsurancePreference>('auto');
  const [preferredCouriers, setPreferredCouriers] = useState<string[]>([]);
  const [notifications, setNotifications] = useState({
    pickup: true,
    in_transit: true,
    delivered: true,
    delays: true,
  });

  useEffect(() => {
    if (visible && shippingAddress) {
      loadShippingRates();
      loadUserPreferences();
    }
  }, [visible, shippingAddress]);

 const loadShippingRates = async () => {
  if (!shippingAddress) return;
  
  setLoading(true);
  try {
    console.log('🔍 Loading enhanced shipping rates...');
    
    const response = await apiClient.post('/api/shipping/rates', {
      ship_to: {
        address: shippingAddress.address,
        city: shippingAddress.city,
        state: shippingAddress.state,
      },
      item_value: packageValue,
      weight: packageWeight,
      preferences: {
        priority,
        max_delivery_time: maxDeliveryTime,
        preferred_couriers: preferredCouriers,
        insurance_preference: insurancePreference,
      }
    });

    console.log('✅ Enhanced rates loaded:', response);
    console.log('📊 Response data:', response.data);
    console.log('📊 Response body:', response.body);
    console.log('📊 Response json:', response.json);

    // Try different response structure possibilities
    let responseData = response.data || response.body || response.json || response;
    
    // If the response data is still undefined, try to parse it manually
    if (!responseData && response.headers && response.headers['content-type']?.includes('application/json')) {
      try {
        // If there's a text method available
        if (typeof response.text === 'function') {
          const textResponse = await response.text();
          responseData = JSON.parse(textResponse);
        }
      } catch (parseError) {
        console.error('Failed to parse response manually:', parseError);
      }
    }

    console.log('🔍 Final response data:', responseData);

    if (responseData && responseData.success) {
      setCategorizedRates(responseData.rate_categories);
      setRecommendedRates(responseData.recommended);
      setAllRates(responseData.all_rates || []);
      setInsuranceOptions(responseData.insurance_options || []);
      
      // Auto-select recommended rate
      if (responseData.recommended?.best_value) {
        setSelectedRate(responseData.recommended.best_value);
        
        // Auto-select insurance if preference is 'auto' and high value
        if (insurancePreference === 'auto' && packageValue > 50000) {
          const basicInsurance = responseData.insurance_options?.find((opt: any) => opt.type === 'basic');
          if (basicInsurance) {
            setSelectedInsurance(basicInsurance);
          }
        }
      }
    } else {
      console.error('❌ Invalid response structure:', responseData);
      Alert.alert('Error', 'Invalid response from server. Please try again.');
    }
  } catch (error: any) {
    console.error('❌ Failed to load shipping rates:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      response: error.response,
    });
    Alert.alert('Error', 'Failed to load shipping options. Please try again.');
  } finally {
    setLoading(false);
  }
};

 const loadUserPreferences = async () => {
  try {
    const response = await apiClient.get('/api/shipping/preferences');
    
    console.log('🔍 User preferences response:', response);
    console.log('📊 Preferences data:', response.data);
    
    // Try different response structure possibilities
    let responseData = response.data || response.body || response.json || response;
    
    console.log('🔍 Final preferences data:', responseData);
    
    if (responseData && responseData.success && responseData.preferences) {
      const prefs = responseData.preferences;
      setPriority(prefs.priority || 'balanced');
      setMaxDeliveryTime(prefs.max_delivery_time || '2 days');
      setInsurancePreference(prefs.insurance_preference || 'auto');
      setPreferredCouriers(prefs.preferred_couriers || []);
      setNotifications({
        pickup: prefs.notifications?.pickup !== false,
        in_transit: prefs.notifications?.in_transit !== false,
        delivered: prefs.notifications?.delivered !== false,
        delays: prefs.notifications?.delays !== false,
      });
      console.log('✅ User preferences loaded successfully');
    } else {
      console.log('ℹ️ No user preferences found or invalid structure, using defaults');
    }
  } catch (error) {
    console.log('⚠️ Could not load user preferences, using defaults:', error);
  }
};

  const saveUserPreferences = async () => {
    try {
      await apiClient.put('/api/shipping/preferences', {
        priority,
        max_delivery_time: maxDeliveryTime,
        preferred_couriers: preferredCouriers,
        insurance_preference: insurancePreference,
        notifications,
      });
      
      Alert.alert('Success', 'Your shipping preferences have been saved!');
      // Reload rates with new preferences
      loadShippingRates();
    } catch (error) {
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    }
  };

  const handleRateSelection = (rate: ShippingRate) => {
    setSelectedRate(rate);
    
    // Auto-apply insurance based on preferences
    if (insurancePreference === 'always' && insuranceOptions.length > 0) {
      const basicInsurance = insuranceOptions.find(opt => opt.type === 'basic');
      if (basicInsurance) {
        setSelectedInsurance(basicInsurance);
      }
    } else if (insurancePreference === 'auto' && packageValue > 50000) {
      const basicInsurance = insuranceOptions.find(opt => opt.type === 'basic');
      if (basicInsurance) {
        setSelectedInsurance(basicInsurance);
      }
    }
  };

  const handleConfirmSelection = () => {
    if (!selectedRate) {
      Alert.alert('Selection Required', 'Please select a shipping option');
      return;
    }

    const insuranceToApply = selectedInsurance && selectedInsurance.type !== 'none' 
      ? selectedInsurance 
      : null;

    onRateSelect(selectedRate, insuranceToApply);
    onClose();
  };

  const getRatesToShow = (): ShippingRate[] => {
    if (!categorizedRates || !recommendedRates) return [];

    switch (selectedCategory) {
      case 'recommended':
        return [
          recommendedRates.fastest,
          recommendedRates.cheapest,
          recommendedRates.best_value,
          ...(recommendedRates.user_favorite ? [recommendedRates.user_favorite] : [])
        ].filter(Boolean);
      case 'economy':
        return categorizedRates.economy;
      case 'standard':
        return categorizedRates.standard;
      case 'express':
        return categorizedRates.express;
      case 'premium':
        return categorizedRates.premium;
      default:
        return [];
    }
  };

  const getSpeedIcon = (speedRating: string) => {
    switch (speedRating) {
      case 'premium': return '🚀';
      case 'express': return '⚡';
      case 'standard': return '🚚';
      case 'economy': return '🐢';
      default: return '📦';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'speed': return '⚡';
      case 'cost': return '💰';
      case 'balanced': return '⚖️';
      default: return '📦';
    }
  };

  const renderRateCard = (rate: ShippingRate, isRecommended = false) => {
    const isSelected = selectedRate?.service_code === rate.service_code;
    const totalCost = rate.fee + (selectedInsurance?.fee || 0);

    return (
      <TouchableOpacity
        key={`${rate.carrier}-${rate.service_code}`}
        style={[
          styles.rateCard,
          isSelected && styles.selectedRateCard,
          isRecommended && styles.recommendedRateCard
        ]}
        onPress={() => handleRateSelection(rate)}
      >
        <View style={styles.rateHeader}>
          <View style={styles.rateTitle}>
            <Text style={styles.rateSpeedIcon}>{getSpeedIcon(rate.speed_rating)}</Text>
            <View>
              <Text style={styles.rateCarrier}>{rate.carrier}</Text>
              <Text style={styles.rateService}>{rate.service}</Text>
            </View>
          </View>
          <View style={styles.ratePrice}>
            <Text style={styles.rateFee}>₦{rate.fee.toLocaleString()}</Text>
            {selectedInsurance && selectedInsurance.fee > 0 && (
              <Text style={styles.insuranceFee}>+₦{selectedInsurance.fee}</Text>
            )}
          </View>
        </View>

        <View style={styles.rateDetails}>
          <View style={styles.rateInfo}>
            <Ionicons name="time-outline" size={14} color="#CCCCCC" />
            <Text style={styles.rateInfoText}>{rate.delivery_time}</Text>
          </View>
          <View style={styles.rateInfo}>
            <Ionicons name="location-outline" size={14} color="#CCCCCC" />
            <Text style={styles.rateInfoText}>{rate.pickup_time || 'Same day pickup'}</Text>
          </View>
          {rate.ratings && (
            <View style={styles.rateInfo}>
              <Ionicons name="star" size={14} color={COLORS.gold} />
              <Text style={styles.rateInfoText}>{rate.ratings.toFixed(1)}</Text>
            </View>
          )}
        </View>

        {rate.features && rate.features.length > 0 && (
          <View style={styles.rateFeatures}>
            {rate.features.slice(0, 2).map((feature, index) => (
              <View key={index} style={styles.featureTag}>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        )}

        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.gold} />
          </View>
        )}

        {isRecommended && (
          <View style={styles.recommendedBadge}>
            <Text style={styles.recommendedText}>RECOMMENDED</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderInsuranceOptions = () => {
    if (!insuranceOptions || insuranceOptions.length === 0) return null;

    return (
      <View style={styles.insuranceSection}>
        <Text style={styles.sectionTitle}>🛡️ Package Protection</Text>
        {insuranceOptions.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.insuranceOption,
              selectedInsurance?.type === option.type && styles.selectedInsuranceOption
            ]}
            onPress={() => setSelectedInsurance(option)}
          >
            <View style={styles.insuranceContent}>
              <Text style={styles.insuranceName}>{option.name}</Text>
              <Text style={styles.insuranceDescription}>{option.description}</Text>
              {option.coverage > 0 && (
                <Text style={styles.insuranceCoverage}>
                  Coverage: ₦{option.coverage.toLocaleString()}
                </Text>
              )}
            </View>
            <View style={styles.insurancePrice}>
              <Text style={styles.insuranceFeeText}>
                {option.fee > 0 ? `+₦${option.fee}` : 'FREE'}
              </Text>
            </View>
            {selectedInsurance?.type === option.type && (
              <Ionicons name="checkmark-circle" size={20} color={COLORS.gold} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderPreferences = () => (
    <ScrollView style={styles.preferencesContainer}>
      <View style={styles.preferenceSection}>
        <Text style={styles.sectionTitle}>⚡ Shipping Priority</Text>
        {[
          { value: 'speed', label: 'Fastest Delivery', desc: 'Get items as quickly as possible' },
          { value: 'cost', label: 'Lowest Cost', desc: 'Save money on shipping' },
          { value: 'balanced', label: 'Best Balance', desc: 'Good value for time and cost' }
        ].map(option => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.preferenceOption,
              priority === option.value && styles.selectedPreferenceOption
            ]}
            onPress={() => setPriority(option.value as PreferencePriority)}
          >
            <Text style={styles.priorityIcon}>{getPriorityIcon(option.value)}</Text>
            <View style={styles.preferenceContent}>
              <Text style={styles.preferenceLabel}>{option.label}</Text>
              <Text style={styles.preferenceDesc}>{option.desc}</Text>
            </View>
            {priority === option.value && (
              <Ionicons name="checkmark-circle" size={20} color={COLORS.gold} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.preferenceSection}>
        <Text style={styles.sectionTitle}>🛡️ Insurance Preference</Text>
        {[
          { value: 'always', label: 'Always Add Insurance', desc: 'Protect all shipments' },
          { value: 'never', label: 'Never Add Insurance', desc: 'Skip insurance to save cost' },
          { value: 'auto', label: 'Auto (High Value Items)', desc: 'Insurance for items >₦50,000' }
        ].map(option => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.preferenceOption,
              insurancePreference === option.value && styles.selectedPreferenceOption
            ]}
            onPress={() => setInsurancePreference(option.value as InsurancePreference)}
          >
            <View style={styles.preferenceContent}>
              <Text style={styles.preferenceLabel}>{option.label}</Text>
              <Text style={styles.preferenceDesc}>{option.desc}</Text>
            </View>
            {insurancePreference === option.value && (
              <Ionicons name="checkmark-circle" size={20} color={COLORS.gold} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.preferenceSection}>
        <Text style={styles.sectionTitle}>🔔 Notification Preferences</Text>
        {Object.entries(notifications).map(([key, value]) => (
          <View key={key} style={styles.notificationOption}>
            <Text style={styles.notificationLabel}>
              {key.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())} updates
            </Text>
            <Switch
              value={value}
              onValueChange={(newValue) => setNotifications(prev => ({ ...prev, [key]: newValue }))}
              trackColor={{ false: '#333', true: COLORS.gold }}
              thumbColor={value ? '#FFFFFF' : '#666'}
            />
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={saveUserPreferences}>
        <Text style={styles.saveButtonText}>💾 Save Preferences</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Shipping Options</Text>
          <TouchableOpacity 
            onPress={handleConfirmSelection}
            style={styles.confirmButton}
            disabled={!selectedRate}
          >
            <Text style={[
              styles.confirmButtonText,
              !selectedRate && styles.disabledText
            ]}>
              Select
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'rates' && styles.activeTab]}
            onPress={() => setActiveTab('rates')}
          >
            <Text style={[styles.tabText, activeTab === 'rates' && styles.activeTabText]}>
              📦 Shipping Options
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'preferences' && styles.activeTab]}
            onPress={() => setActiveTab('preferences')}
          >
            <Text style={[styles.tabText, activeTab === 'preferences' && styles.activeTabText]}>
              ⚙️ Preferences
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'rates' ? (
          <View style={styles.ratesContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.gold} />
                <Text style={styles.loadingText}>Loading shipping options...</Text>
              </View>
            ) : (
              <>
                <View style={styles.categoryTabs}>
                  {[
                    { key: 'recommended', label: '⭐ Recommended' },
                    { key: 'economy', label: '💰 Economy' },
                    { key: 'standard', label: '📦 Standard' },
                    { key: 'express', label: '⚡ Express' },
                    { key: 'premium', label: '🚀 Premium' }
                  ].map(category => (
                    <TouchableOpacity
                      key={category.key}
                      style={[
                        styles.categoryTab,
                        selectedCategory === category.key && styles.activeCategoryTab
                      ]}
                      onPress={() => setSelectedCategory(category.key as any)}
                    >
                      <Text style={[
                        styles.categoryTabText,
                        selectedCategory === category.key && styles.activeCategoryTabText
                      ]}>
                        {category.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <ScrollView style={styles.ratesScrollView}>
                  {getRatesToShow().map((rate, index) => 
                    renderRateCard(rate, selectedCategory === 'recommended')
                  )}
                  
                  {selectedRate && renderInsuranceOptions()}
                  
                  {selectedRate && (
                    <View style={styles.summarySection}>
                      <Text style={styles.summaryTitle}>📋 Order Summary</Text>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Shipping Cost:</Text>
                        <Text style={styles.summaryValue}>₦{selectedRate.fee.toLocaleString()}</Text>
                      </View>
                      {selectedInsurance && selectedInsurance.fee > 0 && (
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Insurance:</Text>
                          <Text style={styles.summaryValue}>₦{selectedInsurance.fee.toLocaleString()}</Text>
                        </View>
                      )}
                      <View style={[styles.summaryRow, styles.summaryTotal]}>
                        <Text style={styles.summaryTotalLabel}>Total Shipping:</Text>
                        <Text style={styles.summaryTotalValue}>
                          ₦{(selectedRate.fee + (selectedInsurance?.fee || 0)).toLocaleString()}
                        </Text>
                      </View>
                      
                      <View style={styles.deliveryInfo}>
                        <View style={styles.deliveryDetail}>
                          <Ionicons name="time-outline" size={16} color={COLORS.gold} />
                          <Text style={styles.deliveryText}>
                            Delivery: {selectedRate.delivery_time}
                          </Text>
                        </View>
                        <View style={styles.deliveryDetail}>
                          <Ionicons name="car-outline" size={16} color={COLORS.gold} />
                          <Text style={styles.deliveryText}>
                            Pickup: {selectedRate.pickup_time || 'Same day'}
                          </Text>
                        </View>
                        {selectedInsurance && selectedInsurance.coverage > 0 && (
                          <View style={styles.deliveryDetail}>
                            <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.gold} />
                            <Text style={styles.deliveryText}>
                              Protected up to ₦{selectedInsurance.coverage.toLocaleString()}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        ) : (
          renderPreferences()
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  confirmButton: {
    padding: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.gold,
  },
  disabledText: {
    color: '#666',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.gold,
  },
  tabText: {
    fontSize: 14,
    color: '#CCCCCC',
    fontWeight: '500',
  },
  activeTabText: {
    color: COLORS.gold,
    fontWeight: 'bold',
  },
  ratesContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#CCCCCC',
    marginTop: 16,
    fontSize: 16,
  },
  categoryTabs: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  categoryTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    marginHorizontal: 2,
    borderRadius: 16,
  },
  activeCategoryTab: {
    backgroundColor: '#2A2A2A',
  },
  categoryTabText: {
    fontSize: 11,
    color: '#CCCCCC',
    fontWeight: '500',
    textAlign: 'center',
  },
  activeCategoryTabText: {
    color: COLORS.gold,
    fontWeight: 'bold',
  },
  ratesScrollView: {
    flex: 1,
    padding: 16,
  },
  rateCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  selectedRateCard: {
    borderColor: COLORS.gold,
    backgroundColor: '#2A2A2A',
  },
  recommendedRateCard: {
    borderColor: '#4CAF50',
  },
  rateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rateTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rateSpeedIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  rateCarrier: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  rateService: {
    fontSize: 12,
    color: '#CCCCCC',
    textTransform: 'capitalize',
  },
  ratePrice: {
    alignItems: 'flex-end',
  },
  rateFee: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.gold,
  },
  insuranceFee: {
    fontSize: 12,
    color: '#CCCCCC',
  },
  rateDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  rateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  rateInfoText: {
    fontSize: 12,
    color: '#CCCCCC',
    marginLeft: 4,
  },
  rateFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  featureTag: {
    backgroundColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  featureText: {
    fontSize: 10,
    color: '#CCCCCC',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  recommendedBadge: {
    position: 'absolute',
    top: -6,
    right: 12,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  recommendedText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  insuranceSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  insuranceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  selectedInsuranceOption: {
    borderColor: COLORS.gold,
    backgroundColor: '#2A2A2A',
  },
  insuranceContent: {
    flex: 1,
  },
  insuranceName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  insuranceDescription: {
    fontSize: 12,
    color: '#CCCCCC',
    marginBottom: 4,
  },
  insuranceCoverage: {
    fontSize: 11,
    color: COLORS.gold,
  },
  insurancePrice: {
    marginRight: 8,
  },
  insuranceFeeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.gold,
  },
  summarySection: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  summaryValue: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 8,
    marginTop: 4,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.gold,
  },
  deliveryInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  deliveryDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  deliveryText: {
    fontSize: 12,
    color: '#CCCCCC',
    marginLeft: 8,
  },
  preferencesContainer: {
    flex: 1,
    padding: 16,
  },
  preferenceSection: {
    marginBottom: 24,
  },
  preferenceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  selectedPreferenceOption: {
    borderColor: COLORS.gold,
    backgroundColor: '#2A2A2A',
  },
  priorityIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  preferenceContent: {
    flex: 1,
  },
  preferenceLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  preferenceDesc: {
    fontSize: 12,
    color: '#CCCCCC',
  },
  notificationOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  notificationLabel: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: COLORS.gold,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#121212',
  },
});

export default ShippingPreferences;