import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Alert,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';

import COLORS from '@constants/colors';
import Button from '@components/Button';
import { addToCart } from '@store/redux/slices/cartSlice';
import { useAuth } from '@/context/AuthContext';
import { isUserOwnProduct, getOwnItemMessage } from '@/utils/ownershipHelpers';

const { width } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'Buy'>;

const BuyScreen: React.FC<Props> = ({ navigation, route }) => {
  const { product } = route.params;
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const dispatch = useDispatch();
  const { user } = useAuth(); // ✅ Add auth hook for ownership checks

  // Debug logging to see what we're receiving
  console.log('🔍 BuyScreen - Product:', product);
  console.log('🔍 BuyScreen - Price value:', product.price);
  console.log('🔍 BuyScreen - Price type:', typeof product.price);

  const increaseQuantity = () => setQuantity(prev => prev + 1);
  const decreaseQuantity = () => quantity > 1 && setQuantity(prev => prev - 1);

  // Safe price conversion with additional debugging
  const safePrice = Number(product.price) || 0;
  const totalPrice = safePrice * quantity;
  
  console.log('🔍 BuyScreen - Safe price:', safePrice);
  console.log('🔍 BuyScreen - Total price:', totalPrice);
  console.log('🔍 BuyScreen - Formatted price:', safePrice.toLocaleString());

  const handleCheckout = () => {
  console.log('🔍 BuyScreen handleCheckout - FIXED - NOT adding to cart');
  console.log('🔍 BuyScreen handleCheckout - Product:', product);
  console.log('🔍 BuyScreen handleCheckout - Quantity:', quantity);
  console.log('🔍 BuyScreen handleCheckout - Total Amount:', totalPrice);
  
  navigation.navigate('PaymentScreen', {
    product,
    quantity,
    totalAmount: totalPrice,
  } as any);
  
  console.log('🔍 BuyScreen handleCheckout - Navigation completed');
};

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
      })
    );

    Toast.show({
      type: 'success',
      text1: '✅ Added to Cart',
      text2: `${product.title} x${quantity}`,
      position: 'bottom',
      visibilityTime: 1500,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        <FlatList
          data={product.images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, index) => index.toString()}
          onScroll={e => {
            const index = Math.round(e.nativeEvent.contentOffset.x / width);
            setCurrentImageIndex(index);
          }}
          renderItem={({ item }) => (
            <Image source={{ uri: item }} style={styles.productImage} />
          )}
        />

        <ExpoLinearGradient
          colors={['rgba(0,0,0,0.5)', 'transparent']}
          style={styles.gradientOverlay}
        />

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.detailsContainer}>
          <Text style={styles.productTitle}>{product.title}</Text>
          
          {/* Fixed price display with proper gold color */}
          <Text style={[styles.productPrice, { color: '#FFD700' }]}>
            ₦{Number(product.price || 0).toLocaleString()}
          </Text>
          
          <Text style={styles.productDescription}>{product.description}</Text>

          <View style={styles.quantityContainer}>
            <Text style={styles.quantityLabel}>Quantity:</Text>
            <View style={styles.quantityControls}>
              <TouchableOpacity onPress={decreaseQuantity} style={styles.quantityButton}>
                <Ionicons name="remove" size={20} color={COLORS.black} />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{quantity}</Text>
              <TouchableOpacity onPress={increaseQuantity} style={styles.quantityButton}>
                <Ionicons name="add" size={20} color={COLORS.black} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total:</Text>
            {/* Fixed total price display with proper gold color */}
            <Text style={[styles.totalPrice, { color: '#FFD700' }]}>
              ₦{(Number(product.price || 0) * quantity).toLocaleString()}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomActionContainer}>
        <TouchableOpacity onPress={handleAddToCart} style={styles.addToCartBtn}>
          <Text style={styles.addToCartText}>Add to Cart</Text>
        </TouchableOpacity>
        <Button
          title="Proceed to Checkout"
          onPress={handleCheckout}
          filled
          style={styles.checkoutButton}
        />
      </View>
    </View>
  );
};

export default BuyScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  imageContainer: {
    position: 'relative',
  },
  productImage: {
    width: width,
    height: 300,
    resizeMode: 'cover',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 2,
    padding: 10,
    backgroundColor: COLORS.gray,
    borderRadius: 20,
  },
  scrollContainer: {
    paddingBottom: 140,
  },
  detailsContainer: {
    padding: 20,
  },
  productTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: COLORS.primary,
  },
  productPrice: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFD700', // Fixed gold color instead of COLORS.gold
    marginBottom: 16,
  },
  productDescription: {
    fontSize: 16,
    color: COLORS.primary,
    marginBottom: 24,
    lineHeight: 24,
    opacity: 0.8,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.gray,
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.primary,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '500',
    marginHorizontal: 16,
    color: COLORS.primary,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.primary,
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700', // Fixed gold color instead of COLORS.gold
  },
  bottomActionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.black,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray,
  },
  addToCartBtn: {
    backgroundColor: COLORS.gold,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  addToCartText: {
    color: COLORS.black,
    fontWeight: 'bold',
    fontSize: 16,
  },
  checkoutButton: {
    width: '100%',
  },
});