// utils/cartHelpers.ts
import { Product } from '@types';

// Define the Redux CartItem type for consistency
export interface ReduxCartItem extends Product {
  quantity: number;
  addedAt: string;
}

// Helper function to create a cart item from a product
export const createCartItemFromProduct = (product: Product, quantity: number = 1): ReduxCartItem => {
  return {
    ...product,
    quantity,
    addedAt: new Date().toISOString(),
  };
};

// Usage example in your components:
// import { createCartItemFromProduct } from '@utils/cartHelpers';
// import { addToCart } from '@store/cartSlice';
// 
// const handleAddToCart = () => {
//   const cartItem = createCartItemFromProduct(selectedProduct, 1);
//   dispatch(addToCart(cartItem));
// };