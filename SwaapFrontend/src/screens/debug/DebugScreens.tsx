// src/screens/debug/DebugScreens.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Button } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Debug HomeScreen
export const DebugHomeScreen = () => {
  const navigation = useNavigation();
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏠 Debug Home Screen</Text>
      <Text style={styles.subtitle}>This is a working home screen</Text>
      
      <View style={styles.section}>
        <Button
          title="Go to Product Detail"
          onPress={() => navigation.navigate('ProductDetail' as any, { productId: 'test123' })}
          color="#FFC107"
        />
      </View>
      
      <View style={styles.section}>
        <Button
          title="Go to Post Item"
          onPress={() => navigation.navigate('PostItem' as any)}
          color="#4CAF50"
        />
      </View>
    </View>
  );
};

// Debug ProfileScreen
export const DebugProfileScreen = () => {
  const navigation = useNavigation();
  const [userInfo, setUserInfo] = React.useState<any>(null);
  
  React.useEffect(() => {
    loadUserInfo();
  }, []);
  
  const loadUserInfo = async () => {
    try {
      const userData = await AsyncStorage.getItem('@user_data');
      if (userData) {
        setUserInfo(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Failed to load user info:', error);
    }
  };
  
  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['@auth_token', '@user_data']);
      console.log('✅ Logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>👤 Debug Profile Screen</Text>
      
      {userInfo && (
        <View style={styles.infoSection}>
          <Text style={styles.infoText}>Email: {userInfo.email || 'N/A'}</Text>
          <Text style={styles.infoText}>Name: {userInfo.fullName || 'N/A'}</Text>
        </View>
      )}
      
      <View style={styles.section}>
        <Button
          title="Edit Profile"
          onPress={() => navigation.navigate('EditProfile' as any)}
          color="#2196F3"
        />
      </View>
      
      <View style={styles.section}>
        <Button
          title="Wallet"
          onPress={() => navigation.navigate('Wallet' as any)}
          color="#4CAF50"
        />
      </View>
      
      <View style={styles.section}>
        <Button
          title="Logout"
          onPress={handleLogout}
          color="#FF5252"
        />
      </View>
    </ScrollView>
  );
};

// Debug LoginScreen
export const DebugLoginScreen = () => {
  const navigation = useNavigation();
  const [email, setEmail] = React.useState('test@example.com');
  const [password, setPassword] = React.useState('password123');
  
  const handleLogin = async () => {
    try {
      console.log('🔐 Attempting login with:', { email, password });
      
      // Simulate successful login
      const mockUser = {
        _id: '123',
        email: email,
        fullName: 'Test User',
        level: 'basic',
        isPro: false,
        isAdmin: false,
      };
      
      const mockToken = 'mock_jwt_token_' + Date.now();
      
      await AsyncStorage.setItem('@auth_token', mockToken);
      await AsyncStorage.setItem('@user_data', JSON.stringify(mockUser));
      
      console.log('✅ Login successful');
    } catch (error) {
      console.error('❌ Login failed:', error);
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔐 Debug Login Screen</Text>
      
      <View style={styles.form}>
        <Text style={styles.label}>Email: {email}</Text>
        <Text style={styles.label}>Password: {password}</Text>
      </View>
      
      <View style={styles.section}>
        <Button
          title="Login"
          onPress={handleLogin}
          color="#FFC107"
        />
      </View>
      
      <View style={styles.section}>
        <Button
          title="Go to Register"
          onPress={() => navigation.navigate('Register' as any)}
          color="#2196F3"
        />
      </View>
    </View>
  );
};

// Debug RegisterScreen
export const DebugRegisterScreen = () => {
  const navigation = useNavigation();
  
  const handleRegister = async () => {
    console.log('📝 Registration attempt');
    // Simulate registration and auto-login
    const mockUser = {
      _id: '456',
      email: 'newuser@example.com',
      fullName: 'New User',
      level: 'basic',
      isPro: false,
      isAdmin: false,
    };
    
    const mockToken = 'mock_jwt_token_new_' + Date.now();
    
    await AsyncStorage.setItem('@auth_token', mockToken);
    await AsyncStorage.setItem('@user_data', JSON.stringify(mockUser));
    
    console.log('✅ Registration successful');
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>📝 Debug Register Screen</Text>
      
      <View style={styles.form}>
        <Text style={styles.label}>Ready to create test account</Text>
      </View>
      
      <View style={styles.section}>
        <Button
          title="Register"
          onPress={handleRegister}
          color="#4CAF50"
        />
      </View>
      
      <View style={styles.section}>
        <Button
          title="Back to Login"
          onPress={() => navigation.goBack()}
          color="#666"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    marginTop: 50,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 30,
  },
  section: {
    marginVertical: 10,
  },
  form: {
    backgroundColor: '#1e1e1e',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  label: {
    color: 'white',
    fontSize: 16,
    marginBottom: 10,
  },
  infoSection: {
    backgroundColor: '#1e1e1e',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    color: 'white',
    fontSize: 14,
    marginBottom: 5,
  },
});