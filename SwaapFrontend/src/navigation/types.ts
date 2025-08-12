import type { Product } from '@types';

// ✅ CartItem interface with all required properties
export interface CartItem {
  _id: string;
  title: string;
  price: number;
  category: string;
  type: string;
  images: string[];
  description: string;
  user: {
    _id: string;
    fullName: string;
    level: string;
    isPro: boolean;
    isAdmin: boolean;
    id: string;
  };
  createdAt: string;
  updatedAt: string;
  __v: number;
  quantity: number; // Added by cart
  addedAt: string; // Added by cart
}

// ✅ Redux State Types
export interface ProductsState {
  products: Product[];
  loading: boolean;
  searchLoading: boolean; // ✅ Added this property to fix the error
  error: string | null;
  searchResults: Product[];
  searchQuery: string;
  selectedProduct: Product | null;
  categories: string[];
  // Updated to match your Redux slice structure
  refreshing: boolean;
  hasMore: boolean;
  selectedCategory: string;
  page: number;
  filters: {
    category: string | null;
    priceRange: { min: number; max: number } | null;
    sortBy: 'newest' | 'oldest' | 'price-low' | 'price-high' | null;
  };
}

export interface AuthState {
  user: any | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// ✅ UPDATED: User-specific cart state (matches the new cart slice)
export interface CartState {
  userCarts: { [userId: string]: CartItem[] }; // Store carts per user
  currentUserId: string | null; // Track current user
  loading: boolean;
  refreshing: boolean;
  totalItems: number;
  totalAmount: number;
}

export interface UserState {
  profile: any | null;
  loading: boolean;
  error: string | null;
  wallet: {
    balance: number;
    loading: boolean;
  };
  orders: any[];
  notifications: any[];
}

// ✅ Favorites State Type
export interface FavoritesState {
  items: Product[];
  loading: boolean;
  error: string | null;
}

// ✅ Root State Type (combine all your slices)
export interface RootState {
  products: ProductsState;
  auth: AuthState;
  cart: CartState;
  user: UserState;
  favorites: FavoritesState; // Updated with proper type
}

export type RootStackParamList = {
  // Onboarding Screens
  Welcome: undefined;
  Onboarding: undefined;
  
  // Auth Screens
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
  Goodbye: undefined;
  BasicVerification: undefined;
  IdentityVerification: undefined;
  
  // Removed PhoneVerification and AddressVerification - using modals instead
  
  // App Screens
  MainTabs: undefined;
  Home: undefined;
  PostItem: undefined;
  Cart: undefined;
  ProductDetail: { productId: string };
  EditProduct: { productId: string };
  MyProducts: undefined;
  FavoriteScreen: undefined;
  Checkout: { product: Product };
  Buy: { product: Product };
  Notifications: undefined;
  EditProfile: undefined;
  Wallet: undefined;
  PostSuccess: undefined;
  SupportChat: undefined;
  SocialVerification: undefined;
  Profile: undefined;
  PaymentScreen: 
    | { 
        product: Product; 
        quantity: number; 
        totalAmount: number; 
        orderId?: string; 
        cartItems?: never;
      }
    | { 
        cartItems: CartItem[]; 
        totalAmount: number; 
        reference: string;
        product?: never; 
        quantity?: never; 
        orderId?: never;
      };
  OrderReceipt: { order: any };
  SwapOffer: {
    requestedProduct: Product;
    requestedProductPrice: number;
    onItemSelect?: (item: Product) => void;
  };
  SwapInbox: undefined;
  SwapScreen: { selectedProduct: Product };
  Orders: undefined;
  PaymentSuccess: 
    | { 
        product: Product; 
        quantity: number; 
        totalAmount: number; 
        orderId: string;
        cartItems?: never;
      }
    | { 
        cartItems: CartItem[]; 
        totalAmount: number; 
        reference: string;
        product?: never;
        quantity?: never;
        orderId?: never;
      };
  PaystackWebview: {
    url: string;
    reference: string;
    orderId?: string;
    product?: Product;
    quantity?: number;
    totalAmount?: number;
    cartItems?: CartItem[];
    purpose?: string; 
    amount?: number; 
    onSuccess?: (paymentReference: string) => void | Promise<void>;
    onClose?: () => void;
  };
  Chat: { conversationId: string };
  ChatList: undefined;
  ChatScreen: { 
    chatId: string;
    chatName: string;
    otherUserId?: string;
  };
  SuccessConfirmationScreen: {
    title: string;
    message: string;
    amount?: number;
    reference?: string;
    newBalance?: number;
    date?: string;
    redirectTo?: keyof RootStackParamList;
    transactionId?: string;
    product?: Product;
  };
  FundSuccess: {
    title: string;
    message: string;
    amount: number;
    reference: string;
    newBalance: number;
    date: string;
    redirectTo?: keyof RootStackParamList;
  };
  TransactionHistoryScreen: undefined;
  TransactionDetail: {
    transactionId: string;
  };
  ProSuccess: undefined;
  BillingHistoryScreen: undefined;
  UpgradeToProScreen: undefined;
  Favorites: undefined;
  ProductReviews: {
    productId: string;
    productTitle: string;
    sellerId: string;
    sellerName: string;
  };
  UserReviews: {
    userId: string;
    userName: string;
  };
  SellerReviews: {
    sellerId: string;
    sellerName: string;
  };
  NearbyUsers: undefined;
  Orders: undefined;
  MySwaps: undefined;
  OrderListScreen: undefined;
  OrderTrackingScreen: { orderId: string };
  SetWalletPinScreen: undefined;
  ChatList: undefined;
};

// ✅ AuthStackParamList (includes onboarding and auth screens)
export type AuthStackParamList = Pick<RootStackParamList, 
  'Welcome' |
  'Onboarding' |
  'Login' | 
  'Register' | 
  'ForgotPassword' | 
  'ResetPassword' | 
  'Goodbye' |
  'BasicVerification' |
  'IdentityVerification'
>;

// ✅ Updated MainTabParamList to match your tab structure
export type MainTabParamList = {
  Home: undefined;
  Messages: undefined;
  MyProducts: undefined;
  Profile: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}