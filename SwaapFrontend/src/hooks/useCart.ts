// Create this file: hooks/useCart.ts or utils/useCart.ts
import { useSelector } from 'react-redux';
import { getCurrentUserCartItems } from '@/store/redux/slices/cartSlice';
import { useAuth } from '@/context/AuthContext';

export const useCart = () => {
  const { user } = useAuth();
  const cartItems = useSelector(getCurrentUserCartItems);
  const cartState = useSelector((state: any) => state?.cart || {});

  // Safe fallbacks for all cart data
  const safeCartItems = Array.isArray(cartItems) ? cartItems : [];
  const totalItems = cartState.totalItems || 0;
  const totalAmount = cartState.totalAmount || 0;
  const isLoading = cartState.loading || false;

  console.log('🛒 useCart hook:', {
    userId: user?._id || user?.id,
    currentUserId: cartState.currentUserId,
    itemsLength: safeCartItems.length,
    totalItems,
    totalAmount,
    hasCartState: !!cartState,
    userCartsKeys: Object.keys(cartState.userCarts || {})
  });

  return {
    cartItems: safeCartItems,
    totalItems,
    totalAmount,
    isLoading,
    isEmpty: safeCartItems.length === 0,
    itemCount: safeCartItems.length,
    // Helper functions
    getItemQuantity: (productId: string) => {
      const item = safeCartItems.find(item => item._id === productId);
      return item?.quantity || 0;
    },
    isInCart: (productId: string) => {
      return safeCartItems.some(item => item._id === productId);
    }
  };
};