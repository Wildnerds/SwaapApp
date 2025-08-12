// src/navigation/MainTabs.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { MainTabParamList } from './types';
import { withScreenDebug } from '../utils/ScreenDebugUtils';

// Import debug screens first
import { 
  DebugHomeScreen, 
  DebugProfileScreen 
} from '../screens/debug/DebugScreens';

// Try to import real screens with fallback to debug screens
let HomeScreen = DebugHomeScreen;
let MyProductsScreen;
let ProfileScreen = DebugProfileScreen;

// Attempt to load real HomeScreen
try {
  const RealHomeScreen = require('@/screens/HomeScreen').default;
  console.log('✅ Real HomeScreen loaded');
  HomeScreen = withScreenDebug(RealHomeScreen, 'Home');
} catch (error) {
  console.log('⚠️ Using Debug HomeScreen:', error.message);
  HomeScreen = withScreenDebug(DebugHomeScreen, 'DebugHome');
}

// Attempt to load real MyProductsScreen
try {
  const RealMyProductsScreen = require('@/screens/MyProductsScreen').default;
  console.log('✅ Real MyProductsScreen loaded');
  MyProductsScreen = withScreenDebug(RealMyProductsScreen, 'MyProducts');
} catch (error) {
  console.log('⚠️ Using fallback MyProductsScreen:', error.message);
  const MyProductsFallback = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' }}>
      <Text style={{ color: 'white', fontSize: 18 }}>My Products</Text>
      <Text style={{ color: '#666', fontSize: 14, marginTop: 8 }}>Coming soon</Text>
    </View>
  );
  MyProductsScreen = withScreenDebug(MyProductsFallback, 'MyProductsFallback');
}

// Enhanced Cart Screen with Keep Shopping button
const CartScreenWithButton = () => {
  const navigation = useNavigation();

  const handleKeepShopping = () => {
    // Navigate to Home tab
    navigation.navigate('Home' as never);
  };

  return (
    <View style={styles.screenContainer}>
      <Text style={styles.screenText}>Cart Screen</Text>
      <Text style={styles.screenSubtext}>Your shopping cart items will appear here</Text>
      
      <TouchableOpacity 
        style={styles.keepShoppingButton}
        onPress={handleKeepShopping}
      >
        <Ionicons name="arrow-back" size={20} color="#000" style={styles.buttonIcon} />
        <Text style={styles.keepShoppingText}>Keep Shopping</Text>
      </TouchableOpacity>
    </View>
  );
};

// Attempt to load real CartScreen or use the enhanced fallback
let CartScreen;
try {
  const RealCartScreen = require('@/screens/CartScreen').default;
  console.log('✅ Real CartScreen loaded');
  CartScreen = withScreenDebug(RealCartScreen, 'Cart');
} catch (error) {
  console.log('⚠️ Using fallback CartScreen with Keep Shopping button:', error.message);
  CartScreen = withScreenDebug(CartScreenWithButton, 'CartFallback');
}

// Attempt to load real ProfileScreen
try {
  const RealProfileScreen = require('@/screens/ProfileScreen').default;
  console.log('✅ Real ProfileScreen loaded');
  ProfileScreen = withScreenDebug(RealProfileScreen, 'Profile');
} catch (error) {
  console.log('⚠️ Using Debug ProfileScreen:', error.message);
  ProfileScreen = withScreenDebug(DebugProfileScreen, 'DebugProfile');
}

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabs() {
  console.log('📱 MainTabs rendering with debug support and Keep Shopping button');
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#FFC107',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: { 
          backgroundColor: '#121212',
          borderTopColor: '#333',
          borderTopWidth: 1,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home-outline';
          
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'MyProducts') {
            iconName = focused ? 'cube' : 'cube-outline';
          } else if (route.name === 'Cart') {
            iconName = focused ? 'cart' : 'cart-outline';
          }
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen 
        name="MyProducts" 
        component={MyProductsScreen}
        options={{ tabBarLabel: 'My Items' }}
      />
      <Tab.Screen 
        name="Cart" 
        component={CartScreen}
        options={{ tabBarLabel: 'Cart' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
    paddingHorizontal: 20,
  },
  screenText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  screenSubtext: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  keepShoppingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFC107',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonIcon: {
    marginRight: 8,
  },
  keepShoppingText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});