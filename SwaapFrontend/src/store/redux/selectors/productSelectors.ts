import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '@store';
import { Product } from '@types';

// Memoized selectors for better performance
export const selectProductsState = (state: RootState) => state.products;

export const selectProducts = createSelector(
  [selectProductsState],
  (productState) => productState.products
);

export const selectProductsLoading = createSelector(
  [selectProductsState],
  (productState) => productState.loading
);

export const selectProductsError = createSelector(
  [selectProductsState],
  (productState) => productState.error
);

export const selectSelectedCategory = createSelector(
  [selectProductsState],
  (productState) => productState.selectedCategory
);

export const selectHasMoreProducts = createSelector(
  [selectProductsState],
  (productState) => productState.hasMore
);

export const selectProductsByCategory = createSelector(
  [selectProducts, selectSelectedCategory],
  (products, selectedCategory) => {
    if (selectedCategory === 'All') {
      return products;
    }
    
    return products.filter(product => {
      if (!product?.category) return false;
      
      const productCategory = product.category.toLowerCase().trim();
      const selectedCat = selectedCategory.toLowerCase().trim();
      
      return productCategory === selectedCat || 
             productCategory.includes(selectedCat) ||
             selectedCat.includes(productCategory);
    });
  }
);

export const selectMyProducts = createSelector(
  [selectProductsState],
  (productState) => productState.myProducts
);

export const selectSearchResults = createSelector(
  [selectProductsState],
  (productState) => productState.searchResults
);

export const selectSearchLoading = createSelector(
  [selectProductsState],
  (productState) => productState.searchLoading
);

// Advanced selectors
export const selectProductById = (productId: string) =>
  createSelector(
    [selectProducts, selectMyProducts, selectSearchResults],
    (products, myProducts, searchResults) => {
      return products.find(p => p._id === productId) ||
             myProducts.find(p => p._id === productId) ||
             searchResults.find(p => p._id === productId);
    }
  );

export const selectProductsByPriceRange = (minPrice: number, maxPrice: number) =>
  createSelector(
    [selectProducts],
    (products) => products.filter(product => {
      const price = Number(product.price || 0);
      return price >= minPrice && price <= maxPrice;
    })
  );

export const selectFeaturedProducts = createSelector(
  [selectProducts],
  (products) => products.slice(0, 5)
);

export const selectProductStats = createSelector(
  [selectProducts, selectMyProducts],
  (products, myProducts) => ({
    totalProducts: products.length,
    myProductsCount: myProducts.length,
    averagePrice: products.length > 0 
      ? products.reduce((sum, p) => sum + Number(p.price || 0), 0) / products.length 
      : 0,
  })
);