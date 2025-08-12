import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { apiClient } from '@config/index';
import COLORS from '@constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@context/AuthContext';
import { NegotiationAssistant } from '@/components/ai';

interface User {
  _id: string;
  fullName: string;
  email: string;
}

interface Product {
  _id: string;
  title: string;
  price: number;
  images: string[];
}

interface SwapOffer {
  _id: string;
  fromUser: User;
  toUser: User;
  offeringProduct: Product;
  requestedProduct: Product;
  extraPayment: number;
  status: 'pending' | 'accepted' | 'rejected';
}

export default function SwapInboxScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const [offers, setOffers] = useState<SwapOffer[]>([]);
  const [singleSwap, setSingleSwap] = useState<SwapOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Check if we're viewing a specific swap (from deep link)
  const swapId = (route.params as any)?.swapId;
  const isDetailView = !!swapId;

  const fetchInbox = async () => {
    try {
      if (!refreshing) setLoading(true);

      // ✅ Fixed: Use the correct endpoint for received swaps
      const res = await apiClient.get('/api/swaps/my-received');
      console.log('📥 Received swaps (inbox):', res);
      
      const receivedData = res.data || res;
      // Only show pending swaps in inbox
      const pendingSwaps = Array.isArray(receivedData) 
        ? receivedData.filter(swap => swap.status === 'pending')
        : [];
        
      console.log('📥 Filtered pending received swaps:', pendingSwaps);
      setOffers(pendingSwaps);
    } catch (err) {
      console.error('Fetch swap inbox error:', err);
      Alert.alert('Error', 'Failed to load swap offers.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSingleSwap = async (id: string) => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/api/swaps/${id}`);
      const swapData = res.data || res;
      
      console.log('🔍 Single swap data:', swapData);
      console.log('👤 Current user:', user?._id);
      console.log('🔍 Full user context:', user);
      
      // Wait for user to load if it's not available yet
      if (!user) {
        console.log('⏳ User context not loaded yet, retrying...');
        setTimeout(() => fetchSingleSwap(id), 1000);
        return;
      }
      
      // ✅ Check if current user is either the sender or recipient
      const currentUserId = user._id || user.id;
      const isRecipient = user && swapData.toUser && swapData.toUser._id === currentUserId;
      const isSender = user && swapData.fromUser && swapData.fromUser._id === currentUserId;
      
      console.log('🔍 Access check:', {
        userId: currentUserId,
        toUserId: swapData.toUser?._id,
        fromUserId: swapData.fromUser?._id,
        isRecipient,
        isSender
      });
      
      if (!isRecipient && !isSender) {
        console.log('❌ User is not a participant in this swap');
        Alert.alert(
          'Access Denied', 
          'You can only view swaps you are involved in.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }
      
      console.log('✅ User authorized to view this swap');
      setSingleSwap(swapData);
    } catch (err) {
      console.error('Fetch single swap error:', err);
      Alert.alert('Error', 'Failed to load swap details.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: 'accepted' | 'rejected') => {
    try {
      console.log(`🔄 Updating swap ${id} status to: ${status}`);
      console.log('👤 Current user ID:', user?._id || user?.id);
      
      if (!user) {
        Alert.alert('Error', 'You must be logged in to update swap status.');
        return;
      }
      
      // Use the correct backend endpoints: /accept or /reject
      const endpoint = `/api/swaps/${id}/${status === 'accepted' ? 'accept' : 'reject'}`;
      console.log('📡 Making request to:', endpoint);
      
      const response = await apiClient.put(endpoint);
      
      // If swap was accepted and there's extra payment, redirect to payment screen
      if (status === 'accepted') {
        const swapToCheck = isDetailView ? singleSwap : offers.find(offer => offer._id === id);
        if (swapToCheck && swapToCheck.extraPayment > 0) {
          // Check if current user needs to pay (they are the one accepting the swap)
          const currentUserId = user._id || user.id;
          const shouldPay = swapToCheck.toUser._id === currentUserId && 
                           swapToCheck.offeringProduct.price < swapToCheck.requestedProduct.price;
          
          if (shouldPay) {
            Alert.alert(
              'Payment Required',
              `This swap requires an additional payment of ₦${swapToCheck.extraPayment.toLocaleString()}. You will be redirected to complete the payment.`,
              [
                {
                  text: 'Pay Now',
                  onPress: () => {
                    navigation.navigate('Payment' as never, {
                      swapPayment: true,
                      swapId: swapToCheck._id,
                      amount: swapToCheck.extraPayment,
                      description: `Swap payment for ${swapToCheck.offeringProduct.title}`,
                      recipient: swapToCheck.fromUser.fullName || swapToCheck.fromUser.email,
                    } as never);
                  }
                },
                {
                  text: 'Later',
                  style: 'cancel',
                  onPress: () => {
                    Alert.alert('Info', 'The swap has been accepted, but payment is still required to complete the transaction.');
                  }
                }
              ]
            );
          } else {
            Alert.alert('Success', `Offer ${status}`);
          }
        } else {
          Alert.alert('Success', `Offer ${status}`);
        }
      } else {
        Alert.alert('Success', `Offer ${status}`);
      }
      
      if (isDetailView) {
        // Refresh single swap data
        fetchSingleSwap(id);
      } else {
        // Refresh inbox list
        fetchInbox();
      }
    } catch (err: any) {
      console.error('Update swap status error:', err);
      
      // Check if it's a 400 error, which might mean it was already processed
      if (err.message?.includes('HTTP 400')) {
        console.log('🔄 400 error - checking if swap was actually updated...');
        
        // Refresh to see current state
        if (isDetailView) {
          await fetchSingleSwap(id);
        } else {
          await fetchInbox();
        }
        
        // Don't show error alert for 400 - let the refresh show current state
        return;
      }
      
      const errorMessage = err.message || 'Failed to update offer status.';
      console.error('Full error details:', err);
      Alert.alert('Error', errorMessage);
    }
  };

  useEffect(() => {
    if (isDetailView && swapId) {
      fetchSingleSwap(swapId);
    } else {
      fetchInbox();
    }
  }, [isDetailView, swapId]);

  const renderOffer = ({ item }: { item: SwapOffer }) => (
    <View style={styles.offerCard}>
      <Text style={styles.status}>Status: {item.status}</Text>
      <Text style={styles.fromText}>From: {item.fromUser.fullName}</Text>
      <Text style={styles.email}>{item.fromUser.email}</Text>

      <View style={styles.productsRow}>
        <TouchableOpacity 
          style={styles.productBox}
          onPress={() => navigation.navigate('ProductDetail' as never, { productId: item.offeringProduct._id } as never)}
        >
          <Image source={{ uri: item.offeringProduct.images[0] }} style={styles.image} />
          <Text style={styles.productTitle}>{item.offeringProduct.title}</Text>
          <Text style={styles.price}>₦{item.offeringProduct.price.toLocaleString()}</Text>
          <Text style={styles.subLabel}>Their Item</Text>
          <View style={styles.tapHint}>
            <Ionicons name="eye-outline" size={12} color="#888" />
            <Text style={styles.tapHintText}>Tap to view</Text>
          </View>
        </TouchableOpacity>

        <Ionicons
          name="swap-horizontal"
          size={30}
          color={COLORS.gold}
          style={{ marginHorizontal: 10 }}
        />

        <TouchableOpacity 
          style={styles.productBox}
          onPress={() => navigation.navigate('ProductDetail' as never, { productId: item.requestedProduct._id } as never)}
        >
          <Image source={{ uri: item.requestedProduct.images[0] }} style={styles.image} />
          <Text style={styles.productTitle}>{item.requestedProduct.title}</Text>
          <Text style={styles.price}>₦{item.requestedProduct.price.toLocaleString()}</Text>
          <Text style={styles.subLabel}>Your Item</Text>
          <View style={styles.tapHint}>
            <Ionicons name="eye-outline" size={12} color="#888" />
            <Text style={styles.tapHintText}>Tap to view</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Extra Payment Details Section */}
      <View style={styles.extraPaymentSection}>
        {item.extraPayment > 0 ? (
          <View style={styles.extraPaymentContainer}>
            <Text style={styles.extraPayTitle}>💰 Extra Payment Required:</Text>
            <Text style={styles.extraPay}>
              + ₦{item.extraPayment.toLocaleString()}
            </Text>
            <Text style={styles.extraPayNote}>
              {item.offeringProduct.price < item.requestedProduct.price 
                ? "They pay this amount (their item is worth less)"
                : "You receive this amount (your item is worth less)"}
            </Text>
          </View>
        ) : (
          <View style={styles.evenSwapContainer}>
            {item.offeringProduct.price === item.requestedProduct.price ? (
              <>
                <Text style={styles.evenSwapText}>⚖️ Perfect Even Swap!</Text>
                <Text style={styles.extraPayNote}>
                  Both items valued at ₦{item.offeringProduct.price.toLocaleString()}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.evenSwapText}>💰 Payment Required</Text>
                <Text style={styles.extraPayNote}>
                  Their item: ₦{item.offeringProduct.price.toLocaleString()} vs Your item: ₦{item.requestedProduct.price.toLocaleString()}
                  {'\n'}The person with the lower-priced item should add ₦{Math.abs(item.offeringProduct.price - item.requestedProduct.price).toLocaleString()}
                </Text>
              </>
            )}
          </View>
        )}
      </View>

      {item.status === 'pending' && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={() => updateStatus(item._id, 'accepted')}
          >
            <Text style={styles.btnText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={() => updateStatus(item._id, 'rejected')}
          >
            <Text style={styles.btnText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (isDetailView && singleSwap) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.detailHeader}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.gold} />
          </TouchableOpacity>
          <Text style={styles.title}>Swap Details</Text>
        </View>
        
        {renderOffer({ item: singleSwap })}
        
        {/* AI Negotiation Assistant */}
        <NegotiationAssistant 
          swapId={singleSwap._id}
          showInline={true}
        />
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Swap Inbox</Text>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.gold} />
      ) : (
        <FlatList
          data={offers}
          keyExtractor={(item) => item._id}
          renderItem={renderOffer}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            if (isDetailView && swapId) {
              fetchSingleSwap(swapId);
            } else {
              fetchInbox();
            }
          }}
          ListEmptyComponent={
            <Text style={{ color: '#aaa', marginTop: 30, textAlign: 'center' }}>
              No swap offers yet
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 20 },
  title: {
    fontSize: 20,
    color: COLORS.gold,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  offerCard: {
    backgroundColor: '#1E1E1E',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  fromText: { color: '#fff', fontWeight: 'bold' },
  email: { color: '#aaa', marginBottom: 10 },
  status: { color: COLORS.gold, fontWeight: '600', marginBottom: 5 },
  productsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  productBox: { width: '40%', alignItems: 'center' },
  image: {
    width: 90,
    height: 90,
    borderRadius: 8,
    marginBottom: 5,
  },
  productTitle: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  price: { color: COLORS.gold, fontSize: 12 },
  subLabel: { color: '#999', fontSize: 12 },
  // Extra Payment Section Styles
  extraPaymentSection: {
    marginTop: 15,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  extraPaymentContainer: {
    alignItems: 'center',
  },
  extraPayTitle: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  extraPay: {
    color: COLORS.gold,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  extraPayNote: {
    color: '#ccc',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  evenSwapContainer: {
    alignItems: 'center',
  },
  evenSwapText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  fairTradeNote: {
    color: '#4CAF50',
    fontSize: 11,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  acceptBtn: {
    backgroundColor: COLORS.gold,
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginRight: 5,
  },
  rejectBtn: {
    backgroundColor: '#d9534f',
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginLeft: 5,
  },
  btnText: {
    color: '#121212',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 10,
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  tapHintText: {
    color: '#888',
    fontSize: 10,
    marginLeft: 2,
  },
});
