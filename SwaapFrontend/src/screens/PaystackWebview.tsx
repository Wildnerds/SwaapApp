import React, { useState, useRef, useEffect } from 'react';
import { View, ActivityIndicator, Alert, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import COLORS from '@constants/colors';
import { apiClient } from '@config/index';
import { getAuthToken } from '@utils/auth';

type Props = NativeStackScreenProps<RootStackParamList, 'PaystackWebview'>;

const PaystackWebview: React.FC<Props> = ({ route, navigation }) => {
  const {
    url,
    reference,
    orderId,
    product,
    quantity,
    totalAmount,
    onSuccess,
  } = route.params;

  const [loading, setLoading] = useState(false);
  const [processed, setProcessed] = useState(false); // Prevent double processing
  const processedRef = useRef(false); // Persistent ref to prevent reprocessing

  // Check if this is a mock URL for development
  const isMockUrl = url.includes('/mock/');

  // Handle mock payments immediately
  React.useEffect(() => {
    if (isMockUrl && !processed && !processedRef.current) {
      console.log('🔄 Mock payment detected, simulating success...');
      setProcessed(true);
      processedRef.current = true;
      
      // Simulate a delay like a real payment
      setTimeout(async () => {
        console.log('✅ Mock payment completed');
        console.log('📊 Route params:', route.params);
        
        try {
          // Debug route params
          console.log('🔍 PaystackWebview route params:', route.params);
          console.log('🔍 Reference value:', reference);
          console.log('🔍 URL value:', url);
          
          // Trigger mock webhook for notifications and order creation
          const token = await getAuthToken();
          const userResponse = await apiClient.get('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          console.log('🔍 User response:', userResponse);
          const userEmail = userResponse.user?.email || userResponse.email;
          console.log('📧 Extracted email:', userEmail);
          
          // Extract payment metadata from route params including cart items
          const metadata = route.params.metadata || route.params.paymentData || {
            purpose: route.params.purpose || 'cart_payment',
            cartItems: route.params.cartItems || []
          };
          
          // Extract reference from URL if not in params
          let paymentReference = reference;
          if (!paymentReference && url) {
            const urlMatch = url.match(/reference=([^&]+)/);
            paymentReference = urlMatch ? urlMatch[1] : `MOCK-${Date.now()}`;
          }
          
          console.log('🧪 Triggering mock webhook with:', {
            reference: paymentReference,
            email: userEmail,
            amount: totalAmount,
            metadata
          });
          
          // Call our mock webhook endpoint
          await apiClient.post('/api/webhook/paystack/mock-payment-success', {
            reference: paymentReference,
            email: userEmail,
            amount: totalAmount,
            metadata
          });
          
          console.log('✅ Mock webhook processed');
          
          if (onSuccess) {
            console.log('✅ Calling onSuccess callback');
            onSuccess(paymentReference);
          } else {
            console.log('❌ No onSuccess callback found, navigating to Home');
            // Navigate to home to prevent going back to payment screen
            navigation.reset({
              index: 0,
              routes: [
                {
                  name: 'MainTabs',
                  state: {
                    index: 0,
                    routes: [{ name: 'Home' }],
                  },
                },
              ],
            });
          }
        } catch (error) {
          console.error('❌ Error in mock payment completion:', error);
          // Still continue with success flow even if webhook fails
          if (onSuccess) {
            onSuccess(paymentReference || reference);
          } else {
            // Navigate to home to prevent going back to payment screen
            navigation.reset({
              index: 0,
              routes: [
                {
                  name: 'MainTabs',
                  state: {
                    index: 0,
                    routes: [{ name: 'Home' }],
                  },
                },
              ],
            });
          }
        }
      }, 2000);
    }
  }, [isMockUrl, processed]); // Simplified dependency array

  // Add navigation focus listener to prevent reprocessing
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('🔍 PaystackWebview focused, processedRef:', processedRef.current);
      // Don't do anything on focus - payment should only process once
    });

    return unsubscribe;
  }, [navigation]);

  const handleNavigationStateChange = async (navState: any) => {
    const currentUrl = navState.url;
    console.log('Current URL:', currentUrl); // Debug log

    // More reliable success detection
    const isSuccess = 
      currentUrl.includes('payment-success') || 
      currentUrl.includes('close') ||
      currentUrl.includes('callback') ||
      currentUrl.includes('success') ||
      (currentUrl.includes('trxref=') && currentUrl.includes('reference='));

    if (isSuccess && !loading && !processed && !processedRef.current) {
      try {
        setLoading(true);
        setProcessed(true); // Prevent multiple calls
        processedRef.current = true;
        const token = await getAuthToken();

        // ✅ CASE 1: Funding wallet (no orderId)
        if (!orderId && reference) {
          console.log('Processing wallet funding with reference:', reference);
          
          // First verify the transaction with Paystack directly
          const verifyResponse = await apiClient.get(`/wallet/verify/${reference}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          console.log('Wallet verification response:', verifyResponse.data);

      // Successful verification case
if (verifyResponse.data?.success || verifyResponse.data?.status === 'success') {
  const paymentAmount = verifyResponse.data?.amount || totalAmount || 0;
  
  navigation.replace('FundSuccess', {
    // Required properties
    amount: paymentAmount,
    date: new Date().toISOString(),
    reference: reference,
    
    // Optional properties (only include if needed)
    title: 'Payment Successful',
    message: `₦${paymentAmount.toLocaleString()} credited successfully`,
    newBalance: verifyResponse.data?.newBalance,
    // redirectTo: 'Home' // Only include if you need this
  });

  if (onSuccess) onSuccess(reference);
  return;
}else {
            throw new Error('Wallet funding verification failed');
          }
        }

        // ✅ CASE 2: Product order
        if (orderId) {
          console.log('Processing product order with orderId:', orderId);
          
          const res = await apiClient.get(`/paystack/verify/${orderId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          console.log('Order verification response:', res.data);

          const verified =
            res.data?.data?.status === 'success' || res.data?.status === 'success';

          if (verified) {
            // Also verify wallet transaction if reference exists
            if (reference) {
              await apiClient.get(`/wallet/verify/${reference}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
            }

            navigation.reset({
              index: 0,
              routes: [
                {
                  name: 'PaymentSuccess',
                  params: {
                    product: product!,
                    quantity: quantity!,
                    totalAmount: totalAmount!,
                    orderId,
                  },
                },
              ],
            });
          } else {
            throw new Error('Order verification failed');
          }
        }

        // If neither case applies, something went wrong
        if (!orderId && !reference) {
          throw new Error('No order ID or reference found');
        }

      } catch (err: any) {
        console.error('Verification failed:', err);
        
        // More specific error messages
        let errorMessage = 'Something went wrong while verifying your payment.';
        
        if (err.response?.status === 404) {
          errorMessage = 'Transaction not found. Please try again.';
        } else if (err.response?.status === 400) {
          errorMessage = 'Invalid transaction. Please contact support.';
        } else if (err.message?.includes('Network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        }

        Alert.alert(
          'Payment Verification Failed',
          errorMessage,
          [
            {
              text: 'Try Again',
              onPress: () => {
                setProcessed(false); // Allow retry
                processedRef.current = false; // Reset ref for retry
                setLoading(false);
              }
            },
            {
              text: 'Go Back',
              onPress: () => navigation.goBack(),
              style: 'cancel'
            }
          ]
        );
      } finally {
        setLoading(false);
      }
    }
  };

  const handleLoadError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView load error:', nativeEvent);
    
    Alert.alert(
      'Loading Error',
      'Failed to load payment page. Please try again.',
      [{ text: 'Go Back', onPress: () => navigation.goBack() }]
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {isMockUrl ? (
        // Show loading screen for mock payments
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' }}>
          <ActivityIndicator color={COLORS.gold} size="large" />
          <View style={{ marginTop: 20, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Processing Payment</Text>
            <Text style={{ color: '#ccc', fontSize: 14, marginTop: 8 }}>Please wait while we process your payment...</Text>
            <Text style={{ color: COLORS.gold, fontSize: 12, marginTop: 16 }}>Development Mode - Mock Payment</Text>
          </View>
        </View>
      ) : (
        <WebView
          source={{ uri: url }}
          onNavigationStateChange={handleNavigationStateChange}
          onError={handleLoadError}
          startInLoadingState
          javaScriptEnabled
          domStorageEnabled
          renderLoading={() => (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator color={COLORS.gold} size="large" />
            </View>
          )}
        />
      )}
      {loading && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <ActivityIndicator size="large" color={COLORS.gold} />
        </View>
      )}
    </View>
  );
};

export default PaystackWebview;