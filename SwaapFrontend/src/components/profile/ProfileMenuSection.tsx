// components/profile/ProfileMenuSection.tsx
import React from 'react';
import { InfoCard } from '../common/InfoCard';
import { InfoRow } from './InfoRow';
import COLORS from '@constants/colors';

interface MenuItem {
  label: string;
  icon: string;
  onPress: () => void;
}

interface ProfileMenuSectionProps {
  menuItems: MenuItem[];
}

export const ProfileMenuSection: React.FC<ProfileMenuSectionProps> = ({ menuItems }) => {
  return (
    <InfoCard>
      {menuItems.map((item, index) => (
        <InfoRow
          key={index}
          label={item.label}
          onPress={item.onPress}
          icon={item.icon}
          iconColor={COLORS.gold}
          showChevron
        />
      ))}
    </InfoCard>
  );
};

// Helper function to create menu items
export const createMenuItems = (navigation: any): MenuItem[] => [
  {
    label: 'My Products',
    icon: 'pricetags-outline',
    onPress: () => navigation.navigate('MyProducts'),
  },
  {
    label: 'My Orders',
    icon: 'receipt-outline',
    onPress: () => navigation.navigate('Orders'),
  },
  {
    label: 'Track Orders',
    icon: 'location-outline',
    onPress: () => navigation.navigate('OrderListScreen'),
  },
  {
    label: 'My Swaps',
    icon: 'swap-horizontal-outline',
    onPress: () => navigation.navigate('MySwaps'),
  },
  {
    label: 'Wallet',
    icon: 'wallet-outline',
    onPress: () => navigation.navigate('Wallet'),
  },
  {
    label: 'Upgrade to Pro',
    icon: 'diamond-outline',
    onPress: () => navigation.navigate('UpgradeToProScreen'),
  },
  {
    label: 'Billing History',
    icon: 'card-outline',
    onPress: () => navigation.navigate('BillingHistoryScreen'),
  },
  {
    label: 'Transaction History',
    icon: 'analytics-outline',
    onPress: () => navigation.navigate('TransactionHistoryScreen'),
  },
  {
    label: 'Favorites',
    icon: 'heart-outline',
    onPress: () => navigation.navigate('FavoriteScreen'),
  },
  {
    label: 'People Near You',
    icon: 'location-outline',
    onPress: () => navigation.navigate('NearbyUsers'),
  },
];