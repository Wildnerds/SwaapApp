// src/store/slices/productSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Product } from '@types'; // ✅ Updated import
import { apiClient } from '@config/index'; // ✅ Use consistent apiClient

const PAGE_SIZE = 10;

// ✅ Define ProductsState interface here to match your slice usage
export interface ProductsState {
  products: Product[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
  selectedCategory: string;
  myProducts: Product[];
  searchResults: Product[];
  searchLoading: boolean; // ✅ This fixes your original error
}

export const fetchProducts = createAsyncThunk<Product[], void>(
  'products/fetchProducts',
  async (_, { rejectWithValue }) => {
    try {
      // ✅ Use relative URL with apiClient
      const data = await apiClient.get('/api/products', {
        params: { page: 1, limit: PAGE_SIZE }
      });

      await AsyncStorage.setItem('@cached_products', JSON.stringify(data));
      return data;
    } catch (error: any) {
      console.error('❌ fetchProducts error:', error);
      
      // Try to return cached data on error
      const cached = await AsyncStorage.getItem('@cached_products');
      if (cached) {
        console.log('📦 Using cached products data');
        return JSON.parse(cached);
      }
      return rejectWithValue('Network error and no cached data');
    }
  }
);

export const loadMoreProducts = createAsyncThunk<Product[], number>(
  'products/loadMore',
  async (page, { rejectWithValue }) => {
    try {
      // ✅ Use relative URL with apiClient
      const response = await apiClient.get('/api/products', {
        params: { limit: 10, page, sort: '-createdAt' }
      });

      return response; // apiClient already returns the data directly
    } catch (err: any) {
      console.error('❌ loadMoreProducts error:', err);
      return rejectWithValue('Failed to load more');
    }
  }
);

export const resetAndFetchProducts = createAsyncThunk<Product[], void>(
  'products/resetAndFetch',
  async (_, { rejectWithValue }) => {
    try {
      // ✅ Use relative URL with apiClient
      const data = await apiClient.get('/api/products', {
        params: { page: 1, limit: PAGE_SIZE }
      });

      await AsyncStorage.setItem('@cached_products', JSON.stringify(data));
      return data;
    } catch (error: any) {
      console.error('❌ resetAndFetchProducts error:', error);
      return rejectWithValue('Failed to refresh products');
    }
  }
);

// ✅ Add new thunk for searching products
export const searchProducts = createAsyncThunk<Product[], string>(
  'products/search',
  async (searchTerm, { rejectWithValue }) => {
    try {
      const data = await apiClient.get(`/api/products/search?q=${encodeURIComponent(searchTerm)}`);
      return data;
    } catch (error: any) {
      console.error('❌ searchProducts error:', error);
      return rejectWithValue('Failed to search products');
    }
  }
);

// ✅ Add new thunk for fetching my products
export const fetchMyProducts = createAsyncThunk<Product[], void>(
  'products/fetchMyProducts',
  async (_, { rejectWithValue }) => {
    try {
      const data = await apiClient.get('/api/products/my');
      return data;
    } catch (error: any) {
      console.error('❌ fetchMyProducts error:', error);
      return rejectWithValue('Failed to fetch my products');
    }
  }
);

// ✅ Add new thunk for deleting a product
export const deleteProduct = createAsyncThunk<string, string>(
  'products/delete',
  async (productId, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/api/products/${productId}`);
      return productId;
    } catch (error: any) {
      console.error('❌ deleteProduct error:', error);
      return rejectWithValue('Failed to delete product');
    }
  }
);

// ✅ Add new thunk for updating a product
export const updateProduct = createAsyncThunk<Product, { productId: string; productData: Partial<Product> }>(
  'products/update',
  async ({ productId, productData }, { rejectWithValue }) => {
    try {
      const data = await apiClient.put(`/api/products/${productId}`, productData);
      return data;
    } catch (error: any) {
      console.error('❌ updateProduct error:', error);
      return rejectWithValue('Failed to update product');
    }
  }
);

const initialState: ProductsState = {
  products: [],
  loading: false,
  refreshing: false,
  error: null,
  page: 1,
  hasMore: true,
  selectedCategory: 'All',
  // ✅ Add new state for my products and search
  myProducts: [],
  searchResults: [],
  searchLoading: false,
};

const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setCategory(state, action: PayloadAction<string>) {
      state.selectedCategory = action.payload;
    },
    resetProducts(state) {
      state.products = [];
      state.page = 1;
      state.hasMore = true;
    },
    addNewProduct(state, action: PayloadAction<Product>) {
      state.products.unshift(action.payload);
      // Also add to myProducts if it's the user's product
      state.myProducts.unshift(action.payload);
    },
    clearProducts(state) {
      state.products = [];
    },
    clearSearchResults(state) {
      state.searchResults = [];
    },
    // ✅ Add new reducer for clearing errors
    clearError(state) {
      state.error = null;
    },
    // ✅ Add reducer for removing product from local state
    removeProductFromState(state, action: PayloadAction<string>) {
      state.products = state.products.filter(product => product._id !== action.payload);
      state.myProducts = state.myProducts.filter(product => product._id !== action.payload);
      state.searchResults = state.searchResults.filter(product => product._id !== action.payload);
    }
  },
  extraReducers: builder => {
    builder
      // ✅ Existing fetchProducts cases
      .addCase(fetchProducts.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        // ✅ Remove duplicates before setting products
        const uniqueProducts = action.payload.filter((product, index, self) => 
          index === self.findIndex(p => p._id === product._id)
        );
        state.products = uniqueProducts;
        state.page = 1;
        state.hasMore = action.payload.length >= PAGE_SIZE;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // ✅ loadMoreProducts cases
      .addCase(loadMoreProducts.pending, state => {
        state.loading = true;
      })
      .addCase(loadMoreProducts.fulfilled, (state, action) => {
        state.loading = false;
        // ✅ Prevent duplicates when loading more
        const newProducts = action.payload.filter(newProduct => 
          !state.products.some(existingProduct => existingProduct._id === newProduct._id)
        );
        state.products = [...state.products, ...newProducts];
        state.page += 1;
        state.hasMore = action.payload.length >= PAGE_SIZE;
      })
      .addCase(loadMoreProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // ✅ resetAndFetchProducts cases
      .addCase(resetAndFetchProducts.pending, state => {
        state.refreshing = true;
        state.error = null;
      })
      .addCase(resetAndFetchProducts.fulfilled, (state, action) => {
        state.refreshing = false;
        state.products = action.payload;
        state.page = 1;
        state.hasMore = action.payload.length >= PAGE_SIZE;
      })
      .addCase(resetAndFetchProducts.rejected, (state, action) => {
        state.refreshing = false;
        state.error = action.payload as string;
      })
      
      // ✅ New searchProducts cases
      .addCase(searchProducts.pending, state => {
        state.searchLoading = true;
        state.error = null;
      })
      .addCase(searchProducts.fulfilled, (state, action) => {
        state.searchLoading = false;
        state.searchResults = action.payload;
      })
      .addCase(searchProducts.rejected, (state, action) => {
        state.searchLoading = false;
        state.error = action.payload as string;
      })
      
      // ✅ New fetchMyProducts cases
      .addCase(fetchMyProducts.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.myProducts = action.payload;
      })
      .addCase(fetchMyProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // ✅ New deleteProduct cases
      .addCase(deleteProduct.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.loading = false;
        const productId = action.payload;
        // Remove from all arrays
        state.products = state.products.filter(product => product._id !== productId);
        state.myProducts = state.myProducts.filter(product => product._id !== productId);
        state.searchResults = state.searchResults.filter(product => product._id !== productId);
      })
      .addCase(deleteProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // ✅ New updateProduct cases
      .addCase(updateProduct.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.loading = false;
        const updatedProduct = action.payload;
        
        // Update in all arrays where the product exists
        const updateInArray = (array: Product[]) => {
          const index = array.findIndex(product => product._id === updatedProduct._id);
          if (index !== -1) {
            array[index] = updatedProduct;
          }
        };
        
        updateInArray(state.products);
        updateInArray(state.myProducts);
        updateInArray(state.searchResults);
      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { 
  setCategory, 
  resetProducts, 
  addNewProduct, 
  clearProducts, 
  clearSearchResults,
  clearError,
  removeProductFromState
} = productSlice.actions;

export default productSlice.reducer;