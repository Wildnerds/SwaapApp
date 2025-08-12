// ownershipHelpers.ts - Utility functions to check item ownership
import { Product } from '@/types/product';

// Define User type locally to avoid circular imports
interface User {
  _id?: string;
  id?: string;
  fullName: string;
  email: string;
}

/**
 * Check if the current user owns the given product
 * @param product - The product to check
 * @param currentUser - The current authenticated user
 * @returns true if user owns the product, false otherwise
 */
export const isUserOwnProduct = (product: Product, currentUser: User | null): boolean => {
  if (!currentUser || !product) {
    return false;
  }

  const currentUserId = currentUser._id || currentUser.id;
  if (!currentUserId) {
    return false;
  }

  // Handle different user field formats
  if (typeof product.user === 'string') {
    return product.user === currentUserId;
  }

  if (typeof product.user === 'object' && product.user) {
    return product.user._id === currentUserId;
  }

  return false;
};

/**
 * Get a user-friendly message explaining why they can't add their own item
 * @param action - The action they're trying to perform ('cart' | 'favorite')
 * @returns Appropriate message string
 */
export const getOwnItemMessage = (action: 'cart' | 'favorite'): string => {
  return action === 'cart' 
    ? "You cannot add your own item to cart"
    : "You cannot add your own item to favorites";
};