import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Product } from '@types';

// Enhanced CartItem interface with source tracking
interface CartItem extends Product {
  quantity: number;
  addedAt: string;
  source?: 'purchase' | 'swap' | 'both'; // Track how item was added
  swapContext?: {
    fromScreen: 'SwapOfferScreen' | 'ProductDetail';
    canSwap: boolean;
    canPurchase: boolean;
  };
}

// ✅ UPDATED: Match the CartState interface from types.ts
interface CartState {
  userCarts: { [userId: string]: CartItem[] }; // Store carts per user
  currentUserId: string | null; // Track current user
  loading: boolean;
  refreshing: boolean;
  totalItems: number;
  totalAmount: number;
}

const initialState: CartState = {
  userCarts: {
    anonymous: [] // Always have an anonymous cart ready
  },
  currentUserId: 'anonymous', // ✅ CRITICAL FIX: Start with anonymous to prevent sharing
  loading: false,
  refreshing: false,
  totalItems: 0,
  totalAmount: 0,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    // ✅ REFINED FIX: Set current user with preserved carts but strict isolation
    setCurrentUser(state, action: PayloadAction<string | null>) {
      try {
        console.log('🔄 Cart: Starting setCurrentUser with action:', {
          hasAction: !!action,
          actionType: typeof action,
          hasPayload: action && 'payload' in action,
          payloadValue: action?.payload,
          payloadType: typeof action?.payload
        });
        
        const newUserId = action.payload || 'anonymous';
        const previousUserId = state.currentUserId;
        
        console.log('🔄 Cart: Switching user from', previousUserId, 'to', newUserId);
        
        // ✅ REFINED: Switch user context while preserving all user carts
        state.currentUserId = newUserId;
        
        // ✅ REFINED: Only initialize cart if user doesn't have one yet
        if (!state.userCarts[newUserId]) {
          state.userCarts[newUserId] = [];
          console.log('🆕 Cart: Initialized empty cart for new user:', newUserId);
        } else {
          console.log('🔄 Cart: Restored existing cart for user:', newUserId, 'with', state.userCarts[newUserId].length, 'items');
        }
        
        // ✅ REFINED: Recalculate totals for current user's cart only
        cartSlice.caseReducers.recalculateTotals(state);
        
        console.log('✅ Cart: setCurrentUser completed with preserved carts');
        console.log('📊 Cart: Final state check:', {
          currentUserId: state.currentUserId,
          userCartsKeys: Object.keys(state.userCarts),
          currentUserItems: state.userCarts[newUserId]?.length || 0,
          totalItems: state.totalItems,
          totalAmount: state.totalAmount
        });
      } catch (error) {
        console.error('❌ Cart: Error in setCurrentUser:', error);
        console.error('❌ Cart: setCurrentUser error details:', {
          errorMessage: error?.message,
          errorStack: error?.stack,
          hasState: !!state,
          hasAction: !!action
        });
      }
    },

    // ✅ NEW: Load user's cart from storage
    loadUserCart(state, action: PayloadAction<{ userId: string; items: CartItem[] }>) {
      try {
        const { userId, items } = action.payload;
        
        if (!userId || !Array.isArray(items)) {
          console.warn('⚠️ Cart: Invalid data for loadUserCart:', { userId, itemsType: typeof items });
          return;
        }
        
        console.log('📥 Cart: Loading cart for user:', userId, 'with', items.length, 'items');
        
        state.userCarts[userId] = items;
        
        // If this is the current user, recalculate totals
        if (state.currentUserId === userId) {
          cartSlice.caseReducers.recalculateTotals(state);
        }
        
        console.log('✅ Cart: loadUserCart completed successfully');
      } catch (error) {
        console.error('❌ Cart: Error in loadUserCart:', error);
      }
    },

    addToCart(state, action: PayloadAction<CartItem>) {
      // ✅ CRITICAL FIX: Force anonymous cart if no current user
      let userId = state.currentUserId;
      
      if (!userId) {
        console.warn('⚠️ Cart: No current user set, using anonymous cart');
        userId = 'anonymous';
        state.currentUserId = 'anonymous';
      }

      // Ensure user cart exists
      if (!state.userCarts[userId]) {
        state.userCarts[userId] = [];
        console.log('🆕 Cart: Created new cart for user:', userId);
      }

      const userCart = state.userCarts[userId];
      const existingItem = userCart.find(item => item._id === action.payload._id);
      
      console.log('➕ Cart: Adding item to cart for user:', userId, 'Item:', action.payload.title);
      
      if (existingItem) {
        // Update quantity if item already exists
        existingItem.quantity += action.payload.quantity;
        existingItem.addedAt = new Date().toISOString();
        // Update source info if provided
        if (action.payload.source) {
          existingItem.source = action.payload.source;
        }
        if (action.payload.swapContext) {
          existingItem.swapContext = action.payload.swapContext;
        }
        console.log('🔄 Cart: Updated quantity for existing item:', action.payload.title, 'Source:', action.payload.source, 'User:', userId);
      } else {
        // Add new item with current timestamp and source info
        userCart.push({
          ...action.payload,
          addedAt: new Date().toISOString(),
          source: action.payload.source || 'purchase',
          swapContext: action.payload.swapContext,
        });
        console.log('➕ Cart: Added new item:', action.payload.title, 'Source:', action.payload.source, 'User:', userId);
      }
      
      // Debug current state
      console.log('🔍 Cart state after add:', {
        currentUserId: state.currentUserId,
        availableUsers: Object.keys(state.userCarts),
        currentUserItemCount: state.userCarts[userId]?.length || 0
      });
      
      cartSlice.caseReducers.recalculateTotals(state);
    },
    
    removeFromCart(state, action: PayloadAction<string>) {
      // ✅ CRITICAL FIX: Force anonymous cart if no current user
      let userId = state.currentUserId;
      
      if (!userId) {
        console.warn('⚠️ Cart: No current user set, using anonymous cart for removal');
        userId = 'anonymous';
        state.currentUserId = 'anonymous';
      }

      if (!state.userCarts[userId]) {
        console.warn('⚠️ Cart: No cart found for user:', userId);
        return;
      }

      const userCart = state.userCarts[userId];
      state.userCarts[userId] = userCart.filter(item => item._id !== action.payload);
      
      console.log('➖ Cart: Removed item with ID:', action.payload, 'from user:', userId);
      cartSlice.caseReducers.recalculateTotals(state);
    },
    
    updateQuantity(state, action: PayloadAction<{ productId: string; quantity: number }>) {
      // ✅ CRITICAL FIX: Force anonymous cart if no current user
      let userId = state.currentUserId;
      
      if (!userId) {
        console.warn('⚠️ Cart: No current user set, using anonymous cart for quantity update');
        userId = 'anonymous';
        state.currentUserId = 'anonymous';
      }

      if (!state.userCarts[userId]) {
        console.warn('⚠️ Cart: No cart found for user:', userId);
        return;
      }

      const userCart = state.userCarts[userId];
      const item = userCart.find(i => i._id === action.payload.productId);
      
      if (item) {
        item.quantity = action.payload.quantity;
        item.addedAt = new Date().toISOString(); // Update timestamp
        console.log('🔄 Cart: Updated quantity for:', item.title, 'to:', action.payload.quantity, 'User:', userId);
      }
      
      cartSlice.caseReducers.recalculateTotals(state);
    },
    
    clearCart(state) {
      // ✅ CRITICAL FIX: Force anonymous cart if no current user
      let userId = state.currentUserId;
      
      if (!userId) {
        console.warn('⚠️ Cart: No current user set, using anonymous cart for clear');
        userId = 'anonymous';
        state.currentUserId = 'anonymous';
      }

      // Ensure user cart exists before clearing
      if (!state.userCarts[userId]) {
        state.userCarts[userId] = [];
      }

      state.userCarts[userId] = [];
      console.log('🧹 Cart: Cleared cart for user:', userId);
      cartSlice.caseReducers.recalculateTotals(state);
    },

    // ✅ NEW: Clear all carts (use on logout)
    clearAllCarts(state) {
      console.log('🧹 Cart: Clearing all carts');
      state.userCarts = {};
      state.currentUserId = null;
      state.totalItems = 0;
      state.totalAmount = 0;
    },

    // ✅ NEW: Transfer anonymous cart to user cart (use on login)
    transferAnonymousCart(state, action: PayloadAction<{ fromUserId: string; toUserId: string }>) {
      try {
        const { fromUserId, toUserId } = action.payload;
        
        if (!fromUserId || !toUserId) {
          console.warn('⚠️ Cart: Invalid user IDs for transfer:', { fromUserId, toUserId });
          return;
        }
        
        if (state.userCarts[fromUserId] && state.userCarts[fromUserId].length > 0) {
          console.log('🔄 Cart: Transferring cart from', fromUserId, 'to', toUserId);
          
          // If target user has no cart, just move it
          if (!state.userCarts[toUserId] || state.userCarts[toUserId].length === 0) {
            state.userCarts[toUserId] = [...state.userCarts[fromUserId]]; // Create a copy
          } else {
            // Merge carts if both exist
            const fromCart = state.userCarts[fromUserId];
            const toCart = state.userCarts[toUserId];
            
            fromCart.forEach(fromItem => {
              const existingItem = toCart.find(item => item._id === fromItem._id);
              if (existingItem) {
                existingItem.quantity += fromItem.quantity;
              } else {
                toCart.push({ ...fromItem }); // Create a copy
              }
            });
          }
          
          // Clear the source cart
          delete state.userCarts[fromUserId];
          console.log('✅ Cart: Transfer completed');
        } else {
          console.log('ℹ️ Cart: No items to transfer from', fromUserId);
        }
      } catch (error) {
        console.error('❌ Cart: Error in transferAnonymousCart:', error);
      }
    },
    
    refreshCart(state) {
      state.refreshing = true;
      // Optionally add logic to re-fetch or re-sync cart items
      state.refreshing = false;
    },
    
    recalculateTotals(state) {
      if (!state.currentUserId || !state.userCarts[state.currentUserId]) {
        state.totalItems = 0;
        state.totalAmount = 0;
        return;
      }

      const currentUserCart = state.userCarts[state.currentUserId];
      
      // Add safety checks for cart items
      if (!Array.isArray(currentUserCart)) {
        console.warn('⚠️ Cart: currentUserCart is not an array:', typeof currentUserCart);
        state.totalItems = 0;
        state.totalAmount = 0;
        return;
      }

      try {
        state.totalItems = currentUserCart.reduce((sum, item) => {
          if (!item || typeof item !== 'object') {
            console.warn('⚠️ Cart: Invalid item in cart:', item);
            return sum;
          }
          return sum + (item.quantity || 0);
        }, 0);
        
        state.totalAmount = currentUserCart.reduce((sum, item) => {
          if (!item || typeof item !== 'object') {
            console.warn('⚠️ Cart: Invalid item in cart:', item);
            return sum;
          }
          const price = item.price || 0;
          const quantity = item.quantity || 0;
          return sum + (price * quantity);
        }, 0);
      } catch (error) {
        console.error('❌ Cart: Error in recalculateTotals:', error);
        state.totalItems = 0;
        state.totalAmount = 0;
      }
    },
  },
});

// ✅ CRITICAL FIX: Aggressive selector with strict user isolation
export const getCurrentUserCartItems = (state: any) => {
  try {
    // Handle Redux Persist structure
    const cartState = state.cart || state._persist?.cart || {};
    const { currentUserId, userCarts } = cartState;
    
    // ✅ CRITICAL: Strict user validation
    if (!currentUserId) {
      console.log('🔍 getCurrentUserCartItems: No current user - returning empty array');
      return [];
    }
    
    // ✅ CRITICAL: Only return items for the EXACT current user
    const userSpecificCart = userCarts?.[currentUserId];
    
    if (!userSpecificCart || !Array.isArray(userSpecificCart)) {
      console.log('🔍 getCurrentUserCartItems: No cart for user', currentUserId, '- returning empty array');
      return [];
    }
    
    console.log('🔍 getCurrentUserCartItems STRICT RESULT:', {
      currentUserId,
      itemCount: userSpecificCart.length,
      firstItem: userSpecificCart[0]?.title || 'none',
      // Only show current user's cart count for security
      returnedItems: userSpecificCart.length
    });
    
    return userSpecificCart;
  } catch (error) {
    console.error('❌ getCurrentUserCartItems error:', error);
    return [];
  }
};

export const {
  setCurrentUser,
  loadUserCart,
  addToCart,
  removeFromCart,
  updateQuantity,
  clearCart,
  clearAllCarts,
  transferAnonymousCart,
  refreshCart,
} = cartSlice.actions;

export default cartSlice.reducer;