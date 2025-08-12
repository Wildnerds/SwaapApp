// types/product.ts

export interface ProductUser {
  _id: string;
  fullName: string;
  level?: any; // Optional, since you’re not always using it
}

export interface Product {
  _id: string;
  title: string;
  price: number;
  category: string;
  type: string;
  condition: string; // Product condition: 'New', 'Like New', 'Good', 'Fair', 'Poor'
  images: string[];
  description: string;
  createdAt: string;
  uploadedAgo?: string;
  averageRating?: number; // Product average rating for sorting
  reviewCount?: number; // Number of reviews
  user?: ProductUser | string; // handles both full user object and string _id
}

export interface ProductsState {
  products: Product[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
  selectedCategory: string;
}
