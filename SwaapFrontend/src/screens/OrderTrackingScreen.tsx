import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  TextInput,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@config/index';
import { getAuthToken } from '@utils/auth';
import COLORS from '@constants/colors';

type OrderTrackingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'OrderTrackingScreen'>;
type OrderTrackingScreenRouteProp = RouteProp<RootStackParamList, 'OrderTrackingScreen'>;

interface Props {
  navigation: OrderTrackingScreenNavigationProp;
  route: OrderTrackingScreenRouteProp;
}

interface TrackingStep {
  id: string;
  title: string;
  description: string;
  timestamp?: string;
  completed: boolean;
  current: boolean;
}

const OrderTrackingScreen: React.FC<Props> = ({ navigation, route }) => {
  const [loading, setLoading] = useState(true);
  const [orderData, setOrderData] = useState<any>(null);
  const [trackingSteps, setTrackingSteps] = useState<TrackingStep[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // ✅ NEW: Escrow confirmation state
  const [escrowStatus, setEscrowStatus] = useState<any>(null);
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [qualityRating, setQualityRating] = useState(5);
  const [qualityNotes, setQualityNotes] = useState('');
  const [confirmingQuality, setConfirmingQuality] = useState(false);

  useEffect(() => {
    const orderId = route.params?.orderId;
    if (orderId === 'test' || !orderId) {
      // Load test data for demo
      loadTestData();
    } else {
      loadOrderData();
    }
  }, []);

  // ✅ NEW: Fetch escrow status
  const fetchEscrowStatus = async (orderId: string) => {
    try {
      const response = await apiClient.get(`/api/orders/${orderId}/escrow-status`);
      setEscrowStatus(response);
      console.log('✅ Escrow status fetched:', response);
    } catch (error) {
      console.error('❌ Error fetching escrow status:', error);
    }
  };

  // ✅ NEW: Confirm product quality and release escrow
  const confirmProductQuality = async () => {
    if (!orderData?._id) return;

    setConfirmingQuality(true);
    try {
      console.log('🔍 Confirming product quality for order:', orderData._id);
      
      const response = await apiClient.post(`/api/orders/${orderData._id}/confirm-quality`, {
        qualityRating,
        qualityNotes: qualityNotes.trim() || undefined
      });

      console.log('✅ Product quality confirmed:', response);
      
      Alert.alert(
        'Quality Confirmed! 🎉',
        'Thank you for confirming the product quality. The payment has been released to the seller.',
        [{ 
          text: 'OK', 
          onPress: () => {
            setShowQualityModal(false);
            // Refresh escrow status
            fetchEscrowStatus(orderData._id);
            loadOrderData();
          }
        }]
      );
    } catch (error: any) {
      console.error('❌ Error confirming quality:', error);
      Alert.alert(
        'Error', 
        error.response?.data?.message || 'Failed to confirm product quality'
      );
    } finally {
      setConfirmingQuality(false);
    }
  };

  const loadOrderData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const orderId = route.params?.orderId;
      if (!orderId) {
        throw new Error('No order ID provided');
      }

      console.log('📦 Loading tracking data for order:', orderId);
      
      const response = await apiClient.get(`/api/orders/${orderId}/tracking`);
      const { order, tracking } = response;
      
      console.log('✅ Order tracking data received:', { order, tracking });
      
      setOrderData(order);
      setTrackingSteps(tracking.steps || []);
      
      // ✅ NEW: Fetch escrow status for this order
      await fetchEscrowStatus(orderId);
      
    } catch (error: any) {
      console.error('❌ Error loading order data:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load order tracking information';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadTestData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🧪 Loading test tracking data...');
      
      const response = await apiClient.get('/api/orders/test-tracking');
      const { order, tracking } = response;
      
      console.log('✅ Test tracking data received:', { order, tracking });
      
      setOrderData(order);
      setTrackingSteps(tracking.steps || []);
      
    } catch (error: any) {
      console.error('❌ Error loading test data:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load test tracking data';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStepIcon = (step: TrackingStep) => {
    if (step.completed) {
      return <Ionicons name="checkmark-circle" size={24} color="#28a745" />;
    } else if (step.current) {
      return <Ionicons name="radio-button-on" size={24} color="#007bff" />;
    } else {
      return <Ionicons name="radio-button-off" size={24} color="#ccc" />;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Loading order tracking...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.background} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track Order</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {orderData && (
          <View style={styles.orderInfo}>
            <Text style={styles.orderTitle}>Order #{orderData.id}</Text>
            <Text style={styles.orderStatus}>Status: {orderData.status}</Text>
            <Text style={styles.orderTotal}>Total: �{orderData.total?.toLocaleString()}</Text>
          </View>
        )}

        <View style={styles.trackingContainer}>
          <Text style={styles.trackingTitle}>Tracking Progress</Text>
          
          {trackingSteps.map((step, index) => (
            <View key={step.id} style={styles.trackingStep}>
              <View style={styles.stepIndicator}>
                {getStepIcon(step)}
                {index < trackingSteps.length - 1 && (
                  <View style={[
                    styles.stepLine,
                    { backgroundColor: step.completed ? '#28a745' : '#ccc' }
                  ]} />
                )}
              </View>
              
              <View style={styles.stepContent}>
                <Text style={[
                  styles.stepTitle,
                  { color: step.completed || step.current ? COLORS.background : '#666' }
                ]}>
                  {step.title}
                </Text>
                <Text style={[
                  styles.stepDescription,
                  { color: step.completed || step.current ? '#ccc' : '#666' }
                ]}>
                  {step.description}
                </Text>
                {step.timestamp && (
                  <Text style={styles.stepTimestamp}>{step.timestamp}</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* ✅ NEW: Escrow Status Section */}
        {escrowStatus && (
          <View style={styles.escrowContainer}>
            <Text style={styles.escrowTitle}>Payment Status</Text>
            
            <View style={styles.escrowStatusCard}>
              <View style={styles.escrowRow}>
                <Text style={styles.escrowLabel}>Verification Level:</Text>
                <Text style={styles.escrowValue}>
                  {escrowStatus.verificationLevel === 'basic' ? 'Basic' : 
                   escrowStatus.verificationLevel === 'premium' ? 'Premium' : 'Self-arranged'}
                </Text>
              </View>
              
              <View style={styles.escrowRow}>
                <Text style={styles.escrowLabel}>Payment Status:</Text>
                <Text style={[styles.escrowValue, { 
                  color: escrowStatus.escrowReleased ? '#28a745' : '#ffc107' 
                }]}>
                  {escrowStatus.escrowReleased ? 'Released ✅' : 'In Escrow 🔒'}
                </Text>
              </View>

              {!escrowStatus.escrowReleased && escrowStatus.hoursRemaining && (
                <View style={styles.escrowRow}>
                  <Text style={styles.escrowLabel}>Inspection Period:</Text>
                  <Text style={styles.escrowValue}>
                    {escrowStatus.hoursRemaining} hours remaining
                  </Text>
                </View>
              )}

              {escrowStatus.qualityRating && (
                <View style={styles.escrowRow}>
                  <Text style={styles.escrowLabel}>Quality Rating:</Text>
                  <Text style={styles.escrowValue}>
                    {'⭐'.repeat(escrowStatus.qualityRating)} ({escrowStatus.qualityRating}/5)
                  </Text>
                </View>
              )}
            </View>

            {/* Quality Confirmation Button */}
            {escrowStatus.canConfirmQuality && (
              <TouchableOpacity
                style={styles.qualityButton}
                onPress={() => setShowQualityModal(true)}
              >
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.qualityButtonText}>Confirm Product Quality</Text>
              </TouchableOpacity>
            )}

            {escrowStatus.actions?.waitForInspectionPeriod && (
              <View style={styles.waitingNotice}>
                <Ionicons name="time" size={20} color="#ffc107" />
                <Text style={styles.waitingText}>
                  Waiting for inspection period to end or quality confirmation
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.actionContainer}>
          {orderData?.trackingUrl && (
            <TouchableOpacity
              style={styles.trackingButton}
              onPress={() => Linking.openURL(orderData.trackingUrl)}
            >
              <Ionicons name="open-outline" size={20} color="white" />
              <Text style={styles.trackingButtonText}>Track with Shipbubble</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => Alert.alert('Contact Support', 'Support feature coming soon!')}
          >
            <Ionicons name="headset" size={20} color="white" />
            <Text style={styles.contactButtonText}>Contact Support</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => {
              const orderId = route.params?.orderId;
              if (orderId === 'test' || !orderId) {
                loadTestData();
              } else {
                loadOrderData();
              }
            }}
          >
            <Ionicons name="refresh" size={20} color="#007bff" />
            <Text style={styles.refreshButtonText}>Refresh Status</Text>
          </TouchableOpacity>
          
          {(!route.params?.orderId || route.params?.orderId === 'test') && (
            <TouchableOpacity
              style={styles.testButton}
              onPress={loadTestData}
            >
              <Ionicons name="flask" size={20} color="#ff6b35" />
              <Text style={styles.testButtonText}>Load Test Data</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* ✅ NEW: Quality Confirmation Modal */}
      <Modal
        visible={showQualityModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQualityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Product Quality</Text>
              <TouchableOpacity
                onPress={() => setShowQualityModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              By confirming the product quality, you're approving the release of payment to the seller.
            </Text>

            <View style={styles.ratingSection}>
              <Text style={styles.ratingLabel}>Rate Product Quality (1-5 stars):</Text>
              <View style={styles.starContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setQualityRating(star)}
                    style={styles.starButton}
                  >
                    <Ionicons
                      name={star <= qualityRating ? "star" : "star-outline"}
                      size={30}
                      color={star <= qualityRating ? "#ffc107" : "#666"}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>Additional Notes (Optional):</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Share your thoughts about the product..."
                placeholderTextColor="#666"
                value={qualityNotes}
                onChangeText={setQualityNotes}
                multiline
                numberOfLines={3}
                maxLength={500}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowQualityModal(false)}
                disabled={confirmingQuality}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.confirmButton, confirmingQuality && styles.confirmButtonDisabled]}
                onPress={confirmProductQuality}
                disabled={confirmingQuality}
              >
                {confirmingQuality ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="white" />
                    <Text style={styles.confirmButtonText}>Confirm & Release Payment</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.darkbackground,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.darkbackground,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.darkbackground,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.background,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  orderInfo: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  orderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.background,
    marginBottom: 8,
  },
  orderStatus: {
    fontSize: 16,
    color: COLORS.gold,
    marginBottom: 4,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
  },
  trackingContainer: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  trackingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.background,
    marginBottom: 20,
  },
  trackingStep: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  stepIndicator: {
    alignItems: 'center',
    marginRight: 16,
  },
  stepLine: {
    width: 2,
    height: 40,
    marginTop: 8,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  stepTimestamp: {
    fontSize: 12,
    color: '#aaa',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  contactButton: {
    flex: 1,
    backgroundColor: COLORS.gold,
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactButtonText: {
    color: COLORS.black,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  refreshButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.gold,
  },
  refreshButtonText: {
    color: COLORS.gold,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  trackingButton: {
    flex: 1,
    backgroundColor: COLORS.green,
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackingButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  testButton: {
    flex: 1,
    backgroundColor: '#ff6b35',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // ✅ NEW: Escrow Status Styles
  escrowContainer: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  escrowTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.background,
    marginBottom: 16,
  },
  escrowStatusCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  escrowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  escrowLabel: {
    fontSize: 14,
    color: '#ccc',
    flex: 1,
  },
  escrowValue: {
    fontSize: 14,
    color: COLORS.background,
    fontWeight: '600',
    textAlign: 'right',
  },
  qualityButton: {
    backgroundColor: '#28a745',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  qualityButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  waitingNotice: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  waitingText: {
    color: '#ffc107',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  
  // ✅ NEW: Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.background,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalDescription: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 20,
    lineHeight: 20,
  },
  ratingSection: {
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 16,
    color: COLORS.background,
    marginBottom: 10,
  },
  starContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  notesSection: {
    marginBottom: 24,
  },
  notesLabel: {
    fontSize: 16,
    color: COLORS.background,
    marginBottom: 10,
  },
  notesInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    color: COLORS.background,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#666',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 2,
    backgroundColor: '#28a745',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonDisabled: {
    backgroundColor: '#555',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OrderTrackingScreen;