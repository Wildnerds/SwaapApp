import React, { useLayoutEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '@navigation/types';
import { useAppDispatch, useAppSelector } from '@/store/redux/hooks';
import { RootState } from '@store';
import {
  removeFromCart,
  updateQuantity,
  clearCart,
  refreshCart,
  getCurrentUserCartItems, // ✅ Import the new selector
} from '@/store/redux/slices/cartSlice';
import { Product } from '@types';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useSelector } from 'react-redux';
import { useAuth } from '@/context/AuthContext'; // ✅ Import useAuth

import { persistor } from '@/store/store';

type TabNav = BottomTabNavigationProp<MainTabParamList>;

interface CartItem extends Product {
  quantity: number;
  addedAt: string;
  source?: 'purchase' | 'swap' | 'both';
  swapContext?: {
    fromScreen: 'SwapOfferScreen' | 'ProductDetail';
    canSwap: boolean;
    canPurchase: boolean;
  };
}

export default function CartScreen() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth(); // ✅ Get current user
  
  // ✅ FIXED: Use the new user-specific cart selector
  const cartItems = useAppSelector(getCurrentUserCartItems);
  const { loading, refreshing, totalAmount, totalItems } = useAppSelector((state: RootState) => state.cart);
  
  // ✅ SAFE: Ensure cartItems is always an array
  const safeCartItems = Array.isArray(cartItems) ? cartItems : [];

  console.log('🛒 CartScreen render:', {
    userId: user?._id || user?.id || 'anonymous',
    cartItemsLength: safeCartItems.length,
    totalItems,
    totalAmount,
    cartItemsType: typeof cartItems,
    isArray: Array.isArray(cartItems)
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: 'Shopping Cart',
      headerTitleStyle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
      },
      headerStyle: {
        backgroundColor: '#1a1a1a',
        elevation: 0,
        shadowOpacity: 0,
      },
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('FavoriteScreen')}
          style={{ marginLeft: 16, padding: 4 }}
        >
          <Ionicons name="heart-outline" size={22} color="#FFC107" />
        </TouchableOpacity>
      ),
      headerRight: () => (
        safeCartItems.length > 0 ? (
          <TouchableOpacity
            onPress={handleClearCart}
            style={styles.headerButton}
          >
            <Ionicons name="trash-outline" size={20} color="#FF4444" />
          </TouchableOpacity>
        ) : null
      ),
    });
  }, [navigation, safeCartItems.length]); // ✅ Use safeCartItems

  useFocusEffect(
    useCallback(() => {
      dispatch(refreshCart());
    }, [dispatch])
  );

  const handleClearCart = () => {
    Alert.alert(
      'Clear Cart',
      'Are you sure you want to remove all items from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => dispatch(clearCart()),
        },
      ]
    );
  };

  const handleRemoveItem = (productId: string) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => dispatch(removeFromCart(productId)),
        },
      ]
    );
  };

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      handleRemoveItem(productId);
      return;
    }
    dispatch(updateQuantity({ productId, quantity: newQuantity }));
  };

  const handleProductPress = (product: Product) => {
    navigation.navigate('ProductDetail', { productId: product._id });
  };

  const handleCheckout = () => {
    if (safeCartItems.length === 0) { // ✅ Use safeCartItems
      Alert.alert('Empty Cart', 'Please add items to your cart before checkout.');
      return;
    }
    
    // Separate items by source
    const purchaseItems = safeCartItems.filter(item => !item.source || item.source === 'purchase');
    const swapItems = safeCartItems.filter(item => item.source === 'swap' || item.source === 'both');
    
    // If all items are from swap context, show swap options
    if (swapItems.length > 0 && purchaseItems.length === 0) {
      Alert.alert(
        'Swap Items Found',
        `You have ${swapItems.length} item(s) that you originally wanted to swap for. What would you like to do?`,
        [
          {
            text: 'Continue Swapping',
            onPress: () => handleSwapNavigation(swapItems[0]),
          },
          {
            text: 'Buy Directly',
            onPress: () => navigation.navigate('PaymentScreen', {
              cartItems: safeCartItems,
              totalAmount: totalAmount || 0,
            }),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
      return;
    }
    
    // If mixed items, show separation options
    if (swapItems.length > 0 && purchaseItems.length > 0) {
      Alert.alert(
        'Mixed Cart Items',
        `You have both swap items (${swapItems.length}) and purchase items (${purchaseItems.length}). How would you like to proceed?`,
        [
          {
            text: 'Buy All Directly',
            onPress: () => navigation.navigate('PaymentScreen', {
              cartItems: safeCartItems,
              totalAmount: totalAmount || 0,
            }),
          },
          {
            text: 'Separate Items',
            onPress: () => showCartSeparationOptions(purchaseItems, swapItems),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
      return;
    }
    
    // Default: all purchase items
    navigation.navigate('PaymentScreen', {
      cartItems: safeCartItems,
      totalAmount: totalAmount || 0,
    });
  };

  const handleSwapNavigation = (swapItem: CartItem) => {
    // Navigate back to swap screen for the first swap item
    navigation.navigate('SwapOffer', {
      requestedProduct: swapItem,
      requestedProductPrice: swapItem.price,
    });
  };

  const showCartSeparationOptions = (purchaseItems: CartItem[], swapItems: CartItem[]) => {
    Alert.alert(
      'Choose Action',
      'Select what you want to do:',
      [
        {
          text: `Checkout Purchase Items (${purchaseItems.length})`,
          onPress: () => {
            // Calculate total for purchase items only
            const purchaseTotal = purchaseItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            navigation.navigate('PaymentScreen', {
              cartItems: purchaseItems,
              totalAmount: purchaseTotal,
            });
          },
        },
        {
          text: `Continue Swap (${swapItems.length} items)`,
          onPress: () => handleSwapNavigation(swapItems[0]),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const onRefresh = () => {
    dispatch(refreshCart());
  };

 
  const renderCartItem = ({ item }: { item: CartItem }) => {
    // ✅ SAFE: Validate item exists
    if (!item || !item._id) {
      console.warn('⚠️ Invalid cart item:', item);
      return null;
    }

    return (
      <View style={styles.cartItem}>
        <TouchableOpacity onPress={() => handleProductPress(item)}>
          <Image
            source={{
              uri: item.images?.[0] || 'https://via.placeholder.com/80x80/333/fff',
            }}
            style={styles.itemImage}
          />
        </TouchableOpacity>
        
        <View style={styles.itemDetails}>
          <TouchableOpacity onPress={() => handleProductPress(item)}>
            <Text style={styles.itemTitle} numberOfLines={2}>
              {item.title || 'Unknown Item'}
            </Text>
          </TouchableOpacity>
          
          <View style={styles.itemMeta}>
            <View
              style={[
                styles.typeBadge,
                item.type === 'sale' && styles.saleBadge,
                item.type === 'swap' && styles.swapBadge,
                item.type === 'both' && styles.bothBadge,
              ]}
            >
              <Text style={styles.badgeText}>{(item.type || 'UNKNOWN').toUpperCase()}</Text>
            </View>
            
            {/* Source badge to show how item was added to cart */}
            {item.source && (
              <View
                style={[
                  styles.sourceBadge,
                  item.source === 'purchase' && styles.purchaseBadge,
                  item.source === 'swap' && styles.swapSourceBadge,
                  item.source === 'both' && styles.bothSourceBadge,
                ]}
              >
                <Text style={styles.sourceBadgeText}>
                  {item.source === 'swap' ? '🔄 SWAP' : 
                   item.source === 'both' ? '⚡ BOTH' : '🛒 BUY'}
                </Text>
              </View>
            )}
            
            {item.category && (
              <Text style={styles.itemCategory}>{item.category}</Text>
            )}
          </View>
          
          <Text style={styles.itemPrice}>
            ₦{Number(item.price || 0).toLocaleString()}
          </Text>
          
          <Text style={styles.addedAt}>
            Added {item.addedAt ? new Date(item.addedAt).toLocaleDateString() : 'Unknown'}
          </Text>
        </View>
        
        <View style={styles.quantityContainer}>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => handleUpdateQuantity(item._id, (item.quantity || 1) - 1)}
            >
              <Ionicons name="remove" size={16} color="#fff" />
            </TouchableOpacity>
            
            <Text style={styles.quantityText}>{item.quantity || 0}</Text>
            
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => handleUpdateQuantity(item._id, (item.quantity || 0) + 1)}
            >
              <Ionicons name="add" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveItem(item._id)}
          >
            <Ionicons name="trash-outline" size={18} color="#FF4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyCart = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cart-outline" size={80} color="#666" />
      <Text style={styles.emptyTitle}>Your cart is empty</Text>
      <Text style={styles.emptySubtitle}>
        Browse products and add items to your cart
      </Text>
      <Text style={styles.userInfo}>
        User: {user?.email || 'Anonymous'}
      </Text>
      <TouchableOpacity
        style={styles.shopButton}
        onPress={() => navigation.navigate('Home')}
      >
        <Text style={styles.shopButtonText}>Start Shopping</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCartSummary = () => (
    <View style={styles.summaryContainer}>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Items ({totalItems || safeCartItems.length})</Text>
        <Text style={styles.summaryValue}>
          ₦{(totalAmount || 0).toLocaleString()}
        </Text>
      </View>
      
      <View style={[styles.summaryRow, styles.totalRow]}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>
          ₦{(totalAmount || 0).toLocaleString()}
        </Text>
      </View>
      
      <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
        <Text style={styles.checkoutButtonText}>
          Proceed to Checkout (₦{(totalAmount || 0).toLocaleString()})
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={safeCartItems} // ✅ Use safeCartItems
        keyExtractor={(item, index) => item?._id || `item-${index}`}
        renderItem={renderCartItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFC107"
          />
        }
        ListEmptyComponent={renderEmptyCart}
        ListHeaderComponent={
          safeCartItems.length > 0 ? (
            <View style={styles.headerStats}>
              <Text style={styles.statsText}>
                {safeCartItems.length} item{safeCartItems.length !== 1 ? 's' : ''} in your cart
              </Text>
            </View>
          ) : null
        }
      />
      
      {safeCartItems.length > 0 ? renderCartSummary() : null}
    </View>
  );
}

// ✅ Add userInfo style
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  headerButton: {
    marginRight: 16,
    padding: 4,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerStats: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    marginBottom: 16,
  },
  statsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  cartItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  itemTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  saleBadge: {
    backgroundColor: '#FF4444',
  },
  swapBadge: {
    backgroundColor: '#4CAF50',
  },
  bothBadge: {
    backgroundColor: '#FF9800',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  itemCategory: {
    color: '#666',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  itemPrice: {
    color: '#FFC107',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  addedAt: {
    color: '#666',
    fontSize: 12,
  },
  quantityContainer: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 8,
    marginBottom: 12,
  },
  quantityButton: {
    backgroundColor: '#444',
    padding: 8,
    borderRadius: 6,
  },
  quantityText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: 16,
  },
  removeButton: {
    backgroundColor: '#333',
    padding: 8,
    borderRadius: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  userInfo: { // ✅ New style for user info
    color: '#FFC107',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
  },
  shopButton: {
    backgroundColor: '#FFC107',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  shopButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  summaryContainer: {
    backgroundColor: '#2a2a2a',
    padding: 20,
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    color: '#fff',
    fontSize: 16,
  },
  summaryValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#444',
    paddingTop: 12,
    marginBottom: 20,
  },
  totalLabel: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalValue: {
    color: '#FFC107',
    fontSize: 18,
    fontWeight: 'bold',
  },
  checkoutButton: {
    backgroundColor: '#FFC107',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Source badge styles
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
    marginBottom: 4,
  },
  purchaseBadge: {
    backgroundColor: '#4CAF50',
  },
  swapSourceBadge: {
    backgroundColor: '#FF9800',
  },
  bothSourceBadge: {
    backgroundColor: '#9C27B0',
  },
  sourceBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});