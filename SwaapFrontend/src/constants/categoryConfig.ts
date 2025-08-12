// src/constants/categoryConfig.ts

import { MaterialCommunityIcons } from '@expo/vector-icons';

export type CategoryConfig = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
};

export const categoryConfig: Record<
  string,
  { icon: keyof typeof import('@expo/vector-icons').MaterialCommunityIcons.glyphMap; color: string }
> = {
  'All': { icon: 'apps', color: '#607D8B' }, // fallback
  'Phones': { icon: 'cellphone', color: '#FF9800' },
  'Gadgets': { icon: 'watch-variant', color: '#9C27B0' },
  'Electronics': { icon: 'television', color: '#3F51B5' },
  'Books and Media': { icon: 'book-open-page-variant', color: '#795548' },
  'Fashion and Apparel': { icon: 'tshirt-crew', color: '#E91E63' },
  'Home and Kitchen': { icon: 'sofa', color: '#009688' },
  'Beauty and Personal Care': { icon: 'lipstick', color: '#FF4081' },
  'Food and Beverages': { icon: 'food-fork-drink', color: '#FF5722' },
  'Sports and Outdoors': { icon: 'basketball', color: '#4CAF50' },
  'Toys and Games': { icon: 'puzzle', color: '#673AB7' },
  'Automotive': { icon: 'car', color: '#607D8B' },
  'Health and Wellness': { icon: 'heart-pulse', color: '#F44336' },
 
};
