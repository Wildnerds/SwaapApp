import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert, Vibration } from 'react-native';
import { useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Product } from '@types';
import { addToCart } from '@/store/redux/slices/cartSlice';
import { useAuth } from '@/context/AuthContext';
import { isUserOwnProduct, getOwnItemMessage } from '@/utils/ownershipHelpers';
import COLORS from '@constants/colors';

type Props = {
  product: Product;
  quantity?: number;
  style?: object;
  source?: 'purchase' | 'swap' | 'both';
  swapContext?: {
    fromScreen: 'SwapOfferScreen' | 'ProductDetail';
    canSwap: boolean;
    canPurchase: boolean;
  };
};

const AddToCartButton: React.FC<Props> = ({ product, quantity = 1, style, source = 'purchase', swapContext }) => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { user } = useAuth();

  const handleAddToCart = () => {
    // ✅ Prevent users from adding their own items to cart
    if (isUserOwnProduct(product, user)) {
      Alert.alert(
        'Cannot Add Item', 
        getOwnItemMessage('cart'),
        [{ text: 'OK' }]
      );
      return;
    }

    dispatch(
      addToCart({
        ...product,
        quantity,
        addedAt: new Date().toISOString(),
        source,
        swapContext,
      })
    );

    // Add haptic feedback
    try {
      Vibration.vibrate(50); // Short vibration for feedback
    } catch (error) {
      // Vibration might not be available on all devices
      console.log('Vibration not available:', error);
    }

    // Show confirmation alert
    const sourceText = source === 'swap' ? '🔄 Ready for swapping' : 
                      source === 'both' ? '⚡ Available for buy or swap' : 
                      '🛒 Ready for purchase';
    
    const totalPrice = (product.price * quantity).toLocaleString();
    
    Alert.alert(
      '✅ Added to Cart!',
      `"${product.title}"\n${sourceText}\n\nQuantity: ${quantity}\nTotal: ₦${totalPrice}`,
      [
        {
          text: 'Continue Shopping',
          style: 'cancel',
        },
        {
          text: 'View Cart',
          onPress: () => {
            // Navigate to cart screen
            try {
              navigation.navigate('Cart' as never);
            } catch (error) {
              console.log('Navigation to cart failed, likely from tab navigator:', error);
              // Fallback - try MainTabs navigation
              try {
                navigation.navigate('MainTabs' as never, { screen: 'Cart' } as never);
              } catch (fallbackError) {
                console.log('Fallback navigation also failed:', fallbackError);
              }
            }
          },
        },
      ]
    );
  };

  return (
    <TouchableOpacity style={[styles.button, style]} onPress={handleAddToCart}>
      <Text style={styles.buttonText}>Add to Cart</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.gold,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddToCartButton;
