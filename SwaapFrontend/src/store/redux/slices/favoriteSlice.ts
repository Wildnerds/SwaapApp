import { createAsyncThunk, createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '@types';
import { apiClient } from '@config/index';
import { logDebug, logInfo, logError } from '@/utils/logger';

// Use the actual Product type instead of defining FavoriteItem
type FavoriteItem = Product;

interface FavoritesState {
  userFavorites: { [userId: string]: FavoriteItem[] }; // Store favorites per user
  currentUserId: string | null; // Track current user
  loading: boolean;
  error: string | null;
}

const FAVORITES_STORAGE_KEY_PREFIX = '@swaap_favorites_';

// Helper functions for user-specific localStorage
const getUserFavoritesKey = (userId: string) => `${FAVORITES_STORAGE_KEY_PREFIX}${userId}`;

const saveFavoritesToStorage = async (favorites: FavoriteItem[], userId: string = 'anonymous') => {
  try {
    const key = getUserFavoritesKey(userId);
    // Serialize safely by ensuring we only store plain objects
    const serializableFavorites = favorites.map(fav => ({
      _id: fav._id,
      title: fav.title,
      price: fav.price,
      images: fav.images,
      description: fav.description,
      category: fav.category,
      condition: fav.condition,
      type: fav.type,
      user: typeof fav.user === 'object' ? fav.user : { _id: fav.user },
      createdAt: fav.createdAt,
      updatedAt: fav.updatedAt
    }));
    
    await AsyncStorage.setItem(key, JSON.stringify(serializableFavorites));
    logInfo('Saved favorites to storage', { count: favorites.length, userId });
  } catch (error) {
    logError('Error saving favorites to storage', error as Error, { userId });
  }
};

const loadFavoritesFromStorage = async (userId: string = 'anonymous'): Promise<FavoriteItem[]> => {
  try {
    const key = getUserFavoritesKey(userId);
    const stored = await AsyncStorage.getItem(key);
    const favorites = stored ? JSON.parse(stored) : [];
    logDebug('Loaded favorites from storage', { count: favorites.length, userId });
    return favorites;
  } catch (error) {
    logError('Error loading favorites from storage', error as Error, { userId });
    return [];
  }
};

const initialState: FavoritesState = {
  userFavorites: {
    anonymous: [] // Always have an anonymous favorites ready
  },
  currentUserId: 'anonymous', // Start with anonymous user
  loading: false,
  error: null,
};

// Load favorites from localStorage
export const loadFavoritesFromLocal = createAsyncThunk(
  'favorites/loadFromLocal',
  async (_, { getState }) => {
    const state = getState() as any;
    const userId = state.favorites?.currentUserId || 'anonymous';
    console.log(`📱 Loading favorites from AsyncStorage for user: ${userId}`);
    const favorites = await loadFavoritesFromStorage(userId);
    console.log(`📱 Loaded ${favorites.length} favorites for user: ${userId}`);
    return { favorites, userId };
  }
);

// Async thunk to fetch user's favorites from backend
export const fetchFavorites = createAsyncThunk(
  'favorites/fetchFavorites',
  async (_, { getState, rejectWithValue, dispatch }) => {
    try {
      const state = getState() as any;
      const token = state.auth.token;
      const userId = state.favorites?.currentUserId || 'anonymous';
      
      if (!token) {
        // If no token, load from local storage for current user
        return await loadFavoritesFromStorage(userId);
      }
      
      const data = await apiClient.get('/api/favorites');
      const favorites = data.favorites || [];
      
      // Save to localStorage as backup
      await saveFavoritesToStorage(favorites, userId);
      
      return favorites;
    } catch (error) {
      logError('Error fetching favorites', error as Error, { userId });
      // Fallback to localStorage
      return await loadFavoritesFromStorage(userId);
    }
  }
);

// Async thunk to toggle favorite status
export const toggleFavorite = createAsyncThunk(
  'favorites/toggleFavorite',
  async (item: FavoriteItem, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const token = state.auth.token;
      const currentUserFavorites = getCurrentUserFavorites(state);
      const isCurrentlyFavorite = currentUserFavorites.some((fav: FavoriteItem) => fav._id === item._id);
      
      // Always update localStorage immediately for instant UI feedback
      let newFavorites;
      if (isCurrentlyFavorite) {
        newFavorites = currentUserFavorites.filter((fav: FavoriteItem) => fav._id !== item._id);
      } else {
        newFavorites = [...currentUserFavorites, item];
      }
      const userId = state.favorites?.currentUserId || 'anonymous';
      await saveFavoritesToStorage(newFavorites, userId);
      
      // Try to sync with backend if token exists
      if (token) {
        try {
          const response = await apiClient.post(`/api/favorites/${item._id}`, { item });
          console.log('✅ Favorite synced with backend:', response);
        } catch (error) {
          console.warn('Backend sync failed:', error);
        }
      }
      
      return { item, isCurrentlyFavorite };
    } catch (error) {
      console.error('Toggle favorite error:', error);
      return rejectWithValue(error.message);
    }
  }
);

// Create the slice
const favoriteSlice = createSlice({
  name: 'favorites',
  initialState,
  reducers: {
    // Set current user for favorites isolation
    setCurrentUserFavorites(state, action: PayloadAction<string | null>) {
      try {
        console.log('🔄 Favorites: setCurrentUserFavorites called with payload:', action?.payload);
        
        const newUserId = action?.payload || 'anonymous';
        console.log('🔄 Favorites: Setting current user to:', newUserId);
        
        state.currentUserId = newUserId;
        
        // Ensure userFavorites object exists
        if (!state.userFavorites || typeof state.userFavorites !== 'object') {
          console.log('🔧 Favorites: Initializing userFavorites object');
          state.userFavorites = {};
        }
        
        // Initialize favorites array for this user if it doesn't exist
        if (!state.userFavorites[newUserId]) {
          state.userFavorites[newUserId] = [];
          console.log('🆕 Favorites: Initialized empty favorites for user:', newUserId);
        }
        
        console.log('✅ Favorites: setCurrentUserFavorites completed successfully');
        console.log('📊 Favorites: Current state:', {
          currentUserId: state.currentUserId,
          userFavoritesKeys: Object.keys(state.userFavorites || {}),
          currentUserFavoritesCount: (state.userFavorites[newUserId] || []).length
        });
        
      } catch (error) {
        console.error('❌ Favorites: Error in setCurrentUserFavorites:', error);
        // Fallback to safe state
        state.currentUserId = 'anonymous';
        if (!state.userFavorites) {
          state.userFavorites = {};
        }
        if (!state.userFavorites['anonymous']) {
          state.userFavorites['anonymous'] = [];
        }
      }
    },

    clearFavorites: (state) => {
      if (state.currentUserId) {
        state.userFavorites[state.currentUserId] = [];
      }
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    // Simple synchronous toggle for testing
    toggleFavoriteSync: (state, action: PayloadAction<FavoriteItem>) => {
      try {
        console.log('🔄 toggleFavoriteSync: Starting with payload:', {
          hasItem: !!action.payload,
          itemId: action.payload?._id,
          itemTitle: action.payload?.title
        });
        
        const item = action.payload;
        if (!item || !item._id) {
          console.error('❌ toggleFavoriteSync: Invalid item payload:', item);
          return;
        }
        
        const userId = state.currentUserId || 'anonymous';
        console.log('🔄 toggleFavoriteSync: Using userId:', userId);
        
        // Ensure state structure exists
        if (!state.userFavorites || typeof state.userFavorites !== 'object') {
          console.log('🔧 toggleFavoriteSync: Initializing userFavorites');
          state.userFavorites = {};
        }
        
        // Ensure user favorites exists
        if (!state.userFavorites[userId]) {
          state.userFavorites[userId] = [];
          console.log('🆕 toggleFavoriteSync: Created favorites array for user:', userId);
        }
        
        const userFavorites = state.userFavorites[userId];
        const isCurrentlyFavorite = userFavorites.some(fav => fav && fav._id === item._id);
      
        console.log('🔄 toggleFavoriteSync:', {
          userId,
          itemId: item._id,
          itemTitle: item.title,
          isCurrentlyFavorite,
          currentFavoritesCount: userFavorites.length
        });
        
        if (isCurrentlyFavorite) {
          state.userFavorites[userId] = userFavorites.filter(fav => fav && fav._id !== item._id);
          console.log('❌ Sync removed from favorites:', item.title);
        } else {
          state.userFavorites[userId].push(item);
          console.log('✅ Sync added to favorites:', item.title);
        }
        
        // Save to localStorage with user-specific key
        try {
          saveFavoritesToStorage(state.userFavorites[userId], userId);
          console.log('📊 New sync favorites count:', state.userFavorites[userId].length);
        } catch (storageError) {
          console.error('❌ toggleFavoriteSync: Storage error:', storageError);
        }
        
      } catch (error) {
        console.error('❌ toggleFavoriteSync: Error:', error);
        console.error('❌ toggleFavoriteSync: Error details:', {
          errorMessage: error?.message,
          hasState: !!state,
          hasAction: !!action,
          hasPayload: !!action?.payload
        });
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Load favorites from local storage
      .addCase(loadFavoritesFromLocal.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadFavoritesFromLocal.fulfilled, (state, action) => {
        state.loading = false;
        // Load into specific user's favorites
        const { favorites, userId } = action.payload;
        const targetUserId = userId || state.currentUserId || 'anonymous';
        if (!state.userFavorites[targetUserId]) {
          state.userFavorites[targetUserId] = [];
        }
        state.userFavorites[targetUserId] = favorites;
        state.error = null;
        console.log(`📥 Loaded ${favorites.length} favorites for user: ${targetUserId}`);
      })
      .addCase(loadFavoritesFromLocal.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load favorites';
      })
      
      // Fetch favorites cases
      .addCase(fetchFavorites.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFavorites.fulfilled, (state, action) => {
        state.loading = false;
        // Load into current user's favorites (or anonymous if no user)
        const userId = state.currentUserId || 'anonymous';
        if (!state.userFavorites[userId]) {
          state.userFavorites[userId] = [];
        }
        state.userFavorites[userId] = action.payload;
        state.error = null;
      })
      .addCase(fetchFavorites.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Toggle favorite cases - optimistic update
      .addCase(toggleFavorite.pending, (state, action) => {
        const item = action.meta.arg;
        const userId = state.currentUserId || 'anonymous';
        
        // Ensure user favorites exists
        if (!state.userFavorites[userId]) {
          state.userFavorites[userId] = [];
        }
        
        const userFavorites = state.userFavorites[userId];
        const isCurrentlyFavorite = userFavorites.some(fav => fav._id === item._id);
        
        console.log('🔄 toggleFavorite.pending:', {
          userId,
          itemId: item._id,
          itemTitle: item.title,
          isCurrentlyFavorite,
          currentFavoritesCount: userFavorites.length
        });
        
        if (isCurrentlyFavorite) {
          // Optimistically remove from favorites
          state.userFavorites[userId] = userFavorites.filter(fav => fav._id !== item._id);
          console.log('❌ Removed from favorites:', item.title);
        } else {
          // Optimistically add to favorites
          state.userFavorites[userId].push(item);
          console.log('✅ Added to favorites:', item.title);
        }
        
        console.log('📊 New favorites count:', state.userFavorites[userId].length);
        state.error = null;
      })
      .addCase(toggleFavorite.fulfilled, (state, action) => {
        // State already updated optimistically, just clear error
        state.error = null;
      })
      .addCase(toggleFavorite.rejected, (state, action) => {
        // Revert optimistic update on error
        const item = action.meta.arg;
        const userId = state.currentUserId || 'anonymous';
        
        // Ensure user favorites exists
        if (!state.userFavorites[userId]) {
          state.userFavorites[userId] = [];
        }
        
        const userFavorites = state.userFavorites[userId];
        const { isCurrentlyFavorite } = action.meta.arg;
        
        if (isCurrentlyFavorite) {
          // Was removed optimistically, add it back
          state.userFavorites[userId].push(item);
        } else {
          // Was added optimistically, remove it
          state.userFavorites[userId] = userFavorites.filter(fav => fav._id !== item._id);
        }
        state.error = action.payload as string;
      });
  },
});

// Export actions
export const { setCurrentUserFavorites, clearFavorites, clearError, toggleFavoriteSync } = favoriteSlice.actions;

// Base selectors - these must return stable references
const selectFavoritesState = (state: any) => state.favorites;
const selectCurrentUserId = (state: any) => state.favorites?.currentUserId;
const selectUserFavorites = (state: any) => state.favorites?.userFavorites;

// Memoized selector to prevent unnecessary re-renders
export const getCurrentUserFavorites = createSelector(
  [selectCurrentUserId, selectUserFavorites],
  (currentUserId, userFavorites) => {
    try {
      // If no current user or no userFavorites, return empty array
      if (!currentUserId || !userFavorites) {
        return [];
      }
      
      // Get user's favorites, fallback to empty array
      const items = userFavorites[currentUserId] || [];
      
      // Only log when favorites change, not on every call
      if (items.length > 0) {
        console.log('🔍 getCurrentUserFavorites found items:', {
          currentUserId,
          itemsLength: items.length,
        });
      }
      
      return items;
    } catch (error) {
      console.error('❌ getCurrentUserFavorites error:', error);
      return [];
    }
  }
);

export const selectFavorites = getCurrentUserFavorites; // Alias for compatibility
export const selectFavoritesLoading = (state: any) => state.favorites?.loading || false;
export const selectFavoritesError = (state: any) => state.favorites?.error || null;
export const selectIsFavorite = (itemId: string) => createSelector(
  [getCurrentUserFavorites],
  (userFavorites) => {
    return userFavorites.some((item: FavoriteItem) => item._id === itemId) || false;
  }
);

// Helper to initialize favorites on app start
export const initializeFavorites = () => (dispatch: any) => {
  console.log('🚀 Initializing favorites from localStorage...');
  dispatch(loadFavoritesFromLocal());
};

// Export reducer
export default favoriteSlice.reducer;