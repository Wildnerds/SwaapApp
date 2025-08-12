import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer, createMigrate } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from 'redux';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';

import authReducer from './redux/slices/authSlice';
import productsReducer from './redux/slices/productSlice';
import favoritesReducer from './redux/slices/favoriteSlice';
import cartReducer from './redux/slices/cartSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  products: productsReducer,
  favorites: favoritesReducer,
  cart: cartReducer,
});

// ✅ FIXED: Define migrations properly
const migrations = {
  0: (state: any) => {
    // Initial state - no migration needed
    return state;
  },
  1: (state: any) => {
    // Migration from version 0 to 1
    if (state?.cart?.items && Array.isArray(state.cart.items)) {
      console.log('🔄 Redux Persist: Migrating cart from v0 to v1');
      
      const oldItems = state.cart.items;
      const newCartState = {
        userCarts: {},
        currentUserId: null,
        loading: false,
        refreshing: false,
        totalItems: 0,
        totalAmount: 0,
      };
      
      // Move old items to anonymous cart
      if (oldItems.length > 0) {
        console.log(`🔄 Moving ${oldItems.length} items to anonymous cart`);
        newCartState.userCarts = { anonymous: oldItems };
      }
      
      return {
        ...state,
        cart: newCartState
      };
    }
    return state;
  }
};

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'cart', 'favorites'],
  version: 1, // ✅ Set to version 1
  migrate: createMigrate(migrations, { debug: __DEV__ }), // ✅ Use createMigrate
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'persist/PAUSE',
          'persist/PURGE',
          'persist/FLUSH',
          'persist/REGISTER',
        ],
      },
    }),
});

const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks for better TypeScript support
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export { store, persistor };