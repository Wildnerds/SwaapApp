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
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { apiClient } from '@config/index';
import COLORS from '@constants/colors';
import { Ionicons } from '@expo/vector-icons';

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

interface Swap {
  _id: string;
  fromUser: User;
  toUser: User;
  offeringProduct: Product;
  requestedProduct: Product;
  extraPayment: number;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  createdAt: string;
  type?: 'sent' | 'received';
}

export default function MySwapsScreen() {
  const navigation = useNavigation();
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'all'>('active');

  const fetchMySwaps = async () => {
    try {
      if (!refreshing) setLoading(true);

      console.log('🔄 Fetching swaps...');

      const [sentResponse, receivedResponse] = await Promise.all([
        apiClient.get('/api/swaps/my-sent'),
        apiClient.get('/api/swaps/my-received')
      ]);

      console.log('📤 Sent swaps response:', sentResponse);
      console.log('📥 Received swaps response:', receivedResponse);

      const sentData = sentResponse.data || sentResponse;
      const receivedData = receivedResponse.data || receivedResponse;

      console.log('📤 Sent data:', sentData);
      console.log('📥 Received data:', receivedData);

      const sentSwaps = Array.isArray(sentData) 
        ? sentData.map((swap: any) => ({
            ...swap,
            type: 'sent'
          }))
        : [];

      const receivedSwaps = Array.isArray(receivedData)
        ? receivedData.map((swap: any) => ({
            ...swap,
            type: 'received'
          }))
        : [];

      console.log('📤 Processed sent swaps:', sentSwaps);
      console.log('📥 Processed received swaps:', receivedSwaps);

      const allSwaps = [...sentSwaps, ...receivedSwaps].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      console.log('📋 All swaps combined:', allSwaps);
      setSwaps(allSwaps);
    } catch (err) {
      console.error('❌ Fetch my swaps error:', err);
      Alert.alert('Error', 'Failed to load your swaps. Please check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMySwaps();
  }, []);

  const getFilteredSwaps = () => {
    switch (activeTab) {
      case 'active':
        return swaps.filter(swap => swap.status === 'pending' || swap.status === 'accepted');
      case 'completed':
        return swaps.filter(swap => swap.status === 'rejected' || swap.status === 'completed');
      case 'all':
        return swaps;
      default:
        return swaps.filter(swap => swap.status === 'pending' || swap.status === 'accepted');
    }
  };

  const handleDeleteSwap = async (swapId: string, otherUserName: string) => {
    Alert.alert(
      'Delete Swap',
      `Are you sure you want to delete this swap with ${otherUserName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Deleting swap:', swapId);
              
              await apiClient.delete(`/api/swaps/${swapId}`);
              
              // Remove from local state
              setSwaps(prevSwaps => prevSwaps.filter(swap => swap._id !== swapId));
              
              Alert.alert('Success', 'Swap deleted successfully');
              console.log('✅ Swap deleted successfully');
              
            } catch (error) {
              console.error('❌ Error deleting swap:', error);
              Alert.alert(
                'Error', 
                'Failed to delete swap. Please check your connection and try again.'
              );
            }
          }
        }
      ]
    );
  };

  const handleAcceptSwap = async (swapId: string, otherUserName: string) => {
    Alert.alert(
      'Accept Swap',
      `Accept swap offer from ${otherUserName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Accept', 
          onPress: async () => {
            try {
              console.log('✅ Accepting swap:', swapId);
              
              await apiClient.put(`/api/swaps/${swapId}/accept`);
              
              // Update local state
              setSwaps(prevSwaps => 
                prevSwaps.map(swap => 
                  swap._id === swapId 
                    ? { ...swap, status: 'accepted' as const }
                    : swap
                )
              );
              
              Alert.alert('Success', 'Swap accepted successfully');
              console.log('✅ Swap accepted successfully');
              
            } catch (error) {
              console.error('❌ Error accepting swap:', error);
              Alert.alert(
                'Error', 
                'Failed to accept swap. Please check your connection and try again.'
              );
            }
          }
        }
      ]
    );
  };

  const handleRejectSwap = async (swapId: string, otherUserName: string) => {
    Alert.alert(
      'Reject Swap',
      `Reject swap offer from ${otherUserName}? It will be moved to your completed history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reject', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('❌ Rejecting swap:', swapId);
              
              await apiClient.put(`/api/swaps/${swapId}/reject`);
              
              // Update local state to mark as rejected
              setSwaps(prevSwaps => 
                prevSwaps.map(swap => 
                  swap._id === swapId 
                    ? { ...swap, status: 'rejected' as const }
                    : swap
                )
              );
              
              Alert.alert('Success', 'Swap rejected and moved to completed history');
              console.log('✅ Swap rejected successfully');
              
            } catch (error) {
              console.error('❌ Error rejecting swap:', error);
              Alert.alert(
                'Error', 
                'Failed to reject swap. Please check your connection and try again.'
              );
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FFA500';
      case 'accepted':
        return '#4CAF50';
      case 'rejected':
        return '#F44336';
      case 'completed':
        return COLORS.gold;
      default:
        return '#888';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'time-outline';
      case 'accepted':
        return 'checkmark-circle-outline';
      case 'rejected':
        return 'close-circle-outline';
      case 'completed':
        return 'trophy-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const renderSwap = ({ item }: { item: Swap }) => {
    console.log('🔍 Rendering swap item:', item);
    
    const isMyOffer = item.type === 'sent';
    const otherUser = isMyOffer ? item.toUser : item.fromUser;
    const myProduct = isMyOffer ? item.offeringProduct : item.requestedProduct;
    const theirProduct = isMyOffer ? item.requestedProduct : item.offeringProduct;

    console.log('👤 Other user:', otherUser);
    console.log('📦 My product:', myProduct);
    console.log('📦 Their product:', theirProduct);

    // Handle missing products gracefully
    if (!otherUser) {
      console.log('⚠️ Skipping swap render - no user data');
      return null;
    }

    if (!myProduct || !theirProduct) {
      console.log('⚠️ Rendering swap with missing products:', {
        hasMyProduct: !!myProduct,
        hasTheirProduct: !!theirProduct,
        hasOtherUser: !!otherUser
      });
      
      // Show swap card but indicate missing products
      return (
        <View style={styles.swapCard}>
          <View style={styles.swapHeader}>
            <View style={styles.statusContainer}>
              <Ionicons 
                name={getStatusIcon(item.status)} 
                size={16} 
                color={getStatusColor(item.status)} 
              />
              <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
            
            <View style={styles.typeContainer}>
              <Ionicons 
                name={isMyOffer ? 'arrow-forward-outline' : 'arrow-back-outline'} 
                size={14} 
                color={COLORS.gold} 
              />
              <Text style={styles.type}>
                {isMyOffer ? 'SENT' : 'RECEIVED'}
              </Text>
              {activeTab === 'completed' && (
                <View style={[styles.completedBadge, { backgroundColor: getStatusColor(item.status) }]}>
                  <Text style={styles.completedBadgeText}>
                    {item.status === 'rejected' ? 'REJ' : 'DONE'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.userText}>
              {isMyOffer ? `To: ${otherUser.fullName}` : `From: ${otherUser.fullName}`}
            </Text>
            <Text style={styles.dateText}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.missingProductsContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" />
            <Text style={styles.missingProductsTitle}>Products Not Available</Text>
            <Text style={styles.missingProductsText}>
              The products in this swap are no longer available or have been removed.
            </Text>
            
            {item.extraPayment && item.extraPayment > 0 && (
              <Text style={styles.extraPay}>
                + ₦{item.extraPayment.toLocaleString()} extra payment
              </Text>
            )}
          </View>

          <View style={styles.actionButtonsContainer}>
            {/* Show Accept/Reject for pending received swaps */}
            {item.type === 'received' && item.status === 'pending' ? (
              <>
                <TouchableOpacity 
                  style={styles.acceptButton}
                  onPress={() => handleAcceptSwap(item._id, otherUser.fullName)}
                >
                  <Ionicons name="checkmark-outline" size={16} color="#fff" />
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.rejectButton}
                  onPress={() => handleRejectSwap(item._id, otherUser.fullName)}
                >
                  <Ionicons name="close-outline" size={16} color="#fff" />
                  <Text style={styles.rejectButtonText}>Reject</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity 
                  style={styles.contactButton}
                  onPress={() => Alert.alert(
                    'Contact User', 
                    `Would you like to contact ${otherUser.fullName} about this swap?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Contact', onPress: () => console.log('Contact user:', otherUser._id) }
                    ]
                  )}
                >
                  <Ionicons name="chatbubble-outline" size={16} color="#000" />
                  <Text style={styles.contactButtonText}>Contact</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.deleteButton}
                  onPress={() => handleDeleteSwap(item._id, otherUser.fullName)}
                >
                  <Ionicons name="trash-outline" size={16} color="#fff" />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={styles.swapCard}
        onPress={() => navigation.navigate('SwapInbox' as never, { swapId: item._id } as never)}
      >
        <View style={styles.swapHeader}>
          <View style={styles.statusContainer}>
            <Ionicons 
              name={getStatusIcon(item.status)} 
              size={16} 
              color={getStatusColor(item.status)} 
            />
            <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
          
          <View style={styles.typeContainer}>
            <Ionicons 
              name={isMyOffer ? 'arrow-forward-outline' : 'arrow-back-outline'} 
              size={14} 
              color={COLORS.gold} 
            />
            <Text style={styles.type}>
              {isMyOffer ? 'SENT' : 'RECEIVED'}
            </Text>
            {activeTab === 'completed' && (
              <View style={[styles.completedBadge, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={styles.completedBadgeText}>
                  {item.status === 'rejected' ? 'REJ' : 'DONE'}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userText}>
            {isMyOffer ? `To: ${otherUser.fullName}` : `From: ${otherUser.fullName}`}
          </Text>
          <Text style={styles.dateText}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.productsRow}>
          <TouchableOpacity 
            style={styles.productBox}
            onPress={() => navigation.navigate('ProductDetail' as never, { productId: myProduct._id } as never)}
          >
            <Image 
              source={{ 
                uri: myProduct.images && myProduct.images.length > 0 
                  ? myProduct.images[0] 
                  : 'https://via.placeholder.com/80x80/333/fff?text=No+Image'
              }} 
              style={styles.image} 
            />
            <Text style={styles.productTitle} numberOfLines={2}>
              {myProduct.title || 'Untitled Product'}
            </Text>
            <Text style={styles.price}>
              ₦{(myProduct.price || 0).toLocaleString()}
            </Text>
            <Text style={styles.subLabel}>Your Item</Text>
          </TouchableOpacity>

          <View style={styles.swapIcon}>
            <Ionicons
              name="swap-horizontal"
              size={24}
              color={COLORS.gold}
            />
          </View>

          <TouchableOpacity 
            style={styles.productBox}
            onPress={() => navigation.navigate('ProductDetail' as never, { productId: theirProduct._id } as never)}
          >
            <Image 
              source={{ 
                uri: theirProduct.images && theirProduct.images.length > 0 
                  ? theirProduct.images[0] 
                  : 'https://via.placeholder.com/80x80/333/fff?text=No+Image'
              }} 
              style={styles.image} 
            />
            <Text style={styles.productTitle} numberOfLines={2}>
              {theirProduct.title || 'Untitled Product'}
            </Text>
            <Text style={styles.price}>
              ₦{(theirProduct.price || 0).toLocaleString()}
            </Text>
            <Text style={styles.subLabel}>Their Item</Text>
          </TouchableOpacity>
        </View>

        {item.extraPayment && item.extraPayment > 0 && (
          <Text style={styles.extraPay}>
            + ₦{item.extraPayment.toLocaleString()} extra payment
          </Text>
        )}

        <View style={styles.swapActions}>
          <View style={styles.tapHint}>
            <Ionicons name="eye-outline" size={12} color="#888" />
            <Text style={styles.tapHintText}>Tap to view details</Text>
          </View>

          <View style={styles.actionIconsContainer}>
            {/* Show Accept/Reject icons for pending received swaps */}
            {item.type === 'received' && item.status === 'pending' ? (
              <>
                <TouchableOpacity 
                  style={styles.acceptIconButton}
                  onPress={() => handleAcceptSwap(item._id, otherUser.fullName)}
                >
                  <Ionicons name="checkmark" size={16} color="#4CAF50" />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.rejectIconButton}
                  onPress={() => handleRejectSwap(item._id, otherUser.fullName)}
                >
                  <Ionicons name="close" size={16} color="#FF6B6B" />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity 
                style={styles.deleteIconButton}
                onPress={() => handleDeleteSwap(item._id, otherUser.fullName)}
              >
                <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.gold} />
        </TouchableOpacity>
        <Text style={styles.title}>My Swaps</Text>
      </View>

      <View style={styles.tabContainer}>
        {(['active', 'completed', 'all'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'active' && ` (${swaps.filter(s => s.status === 'pending' || s.status === 'accepted').length})`}
              {tab === 'completed' && ` (${swaps.filter(s => s.status === 'rejected' || s.status === 'completed').length})`}
              {tab === 'all' && ` (${swaps.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.gold} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
            data={getFilteredSwaps()}
            keyExtractor={(item) => item._id}
            renderItem={renderSwap}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchMySwaps();
                }}
                tintColor={COLORS.gold}
              />
            }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="swap-horizontal-outline" size={64} color="#444" />
              <Text style={styles.emptyText}>No swaps found</Text>
              <Text style={styles.emptySubtext}>
                {activeTab === 'active' 
                  ? 'No active swaps. Make an offer or wait for incoming offers!'
                  : activeTab === 'completed'
                  ? 'No completed swap history yet.'
                  : 'You haven\'t made or received any swap offers yet.'
                }
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
    marginRight: 10,
  },
  title: {
    fontSize: 20,
    color: COLORS.gold,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: COLORS.gold,
  },
  tabText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#121212',
  },
  swapCard: {
    backgroundColor: '#1E1E1E',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 20,
    marginVertical: 8,
  },
  swapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  status: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  type: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  userInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  userText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  dateText: {
    color: '#888',
    fontSize: 12,
  },
  productsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  productBox: {
    width: '42%',
    alignItems: 'center',
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 5,
  },
  productTitle: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 12,
    marginBottom: 2,
  },
  price: {
    color: COLORS.gold,
    fontSize: 11,
    marginBottom: 2,
  },
  subLabel: {
    color: '#999',
    fontSize: 10,
    marginBottom: 6,
  },
  swapIcon: {
    width: '16%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraPay: {
    color: COLORS.gold,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 12,
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  tapHintText: {
    color: '#888',
    fontSize: 10,
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtext: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  missingProductsContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    margin: 10,
  },
  missingProductsTitle: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  missingProductsText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 16,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
    gap: 10,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gold,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    flex: 1,
    justifyContent: 'center',
  },
  contactButtonText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    flex: 1,
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  swapActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  deleteIconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  actionIconsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    flex: 1,
    justifyContent: 'center',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    flex: 1,
    justifyContent: 'center',
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  acceptIconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  rejectIconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  completedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  completedBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
});