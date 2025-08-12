// // AuthDebugComponent.tsx - Add this to help debug authentication issues

// import React, { useState, useEffect } from 'react';
// import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { apiClient } from '@config/index'; // Adjust import path

// const AuthDebugComponent: React.FC = () => {
//   const [authStatus, setAuthStatus] = useState<{
//     hasUser: boolean;
//     hasToken: boolean;
//     tokenPreview: string;
//     headerSet: boolean;
//   } | null>(null);

//   const checkAuthStatus = async () => {
//     try {
//       const userData = await AsyncStorage.getItem('user');
//       const token = await AsyncStorage.getItem('token');
      
//       const hasUser = !!userData;
//       const hasToken = !!token;
//       const tokenPreview = token ? `${token.substring(0, 30)}...` : 'No token';
//       const headerSet = !!apiClient.defaults?.headers?.Authorization;
      
//       setAuthStatus({
//         hasUser,
//         hasToken,
//         tokenPreview,
//         headerSet
//       });
      
//       console.log('🔍 Auth Status Check:', {
//         hasUser,
//         hasToken,
//         tokenPreview,
//         headerSet,
//         fullToken: token // Only in development
//       });
      
//     } catch (error) {
//       console.error('Auth status check error:', error);
//     }
//   };

//   const testAuthenticatedEndpoint = async () => {
//     try {
//       console.log('🧪 Testing authenticated endpoint...');
      
//       // Test with user profile endpoint
//       const response = await apiClient.get('/api/auth/me');
      
//       Alert.alert('✅ Success', `Authenticated request successful!\nStatus: ${response.status}`);
//       console.log('✅ Auth test successful:', response.data);
      
//     } catch (error: any) {
//       const status = error.response?.status;
//       const message = error.response?.data?.message || error.message;
      
//       Alert.alert(
//         '❌ Auth Test Failed', 
//         `Status: ${status}\nMessage: ${message}`
//       );
      
//       console.error('❌ Auth test failed:', {
//         status,
//         message,
//         headers: error.config?.headers
//       });
//     }
//   };

//   const testPaymentEndpoint = async () => {
//     try {
//       console.log('🧪 Testing payment endpoint with minimal payload...');
      
//       // Test with minimal valid payload
//       const testPayload = {
//         items: [{
//           _id: 'test-id',
//           quantity: 1,
//           price: 100
//         }],
//         totalAmount: 100,
//         serviceFee: 0,
//         shippingFee: 0
//       };
      
//       const response = await apiClient.post('/api/pay/cart-pay', testPayload);
      
//       Alert.alert('✅ Payment Test Success', 'Payment endpoint is accessible!');
//       console.log('✅ Payment test successful:', response.data);
      
//     } catch (error: any) {
//       const status = error.response?.status;
//       const message = error.response?.data?.message || error.message;
      
//       Alert.alert(
//         '❌ Payment Test Failed', 
//         `Status: ${status}\nMessage: ${message}`
//       );
      
//       console.error('❌ Payment test failed:', error.response?.data);
//     }
//   };

//   const clearAuthData = async () => {
//     try {
//       await AsyncStorage.multiRemove(['user', 'token']);
//       delete apiClient.defaults.headers.Authorization;
      
//       Alert.alert('✅ Cleared', 'Auth data cleared');
//       checkAuthStatus();
      
//     } catch (error) {
//       Alert.alert('❌ Error', 'Failed to clear auth data');
//     }
//   };

//   const refreshAuthFromStorage = async () => {
//     try {
//       const token = await AsyncStorage.getItem('token');
      
//       if (token) {
//         const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
//         apiClient.defaults.headers.Authorization = `Bearer ${cleanToken}`;
        
//         Alert.alert('✅ Refreshed', 'Auth header refreshed from storage');
//         checkAuthStatus();
//       } else {
//         Alert.alert('⚠️ Warning', 'No token found in storage');
//       }
      
//     } catch (error) {
//       Alert.alert('❌ Error', 'Failed to refresh auth');
//     }
//   };

//   useEffect(() => {
//     checkAuthStatus();
//   }, []);

//   if (!authStatus) {
//     return (
//       <View style={styles.container}>
//         <Text style={styles.text}>Loading auth status...</Text>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>🔐 Auth Debug Panel</Text>
      
//       <View style={styles.statusContainer}>
//         <Text style={[styles.status, authStatus.hasUser ? styles.success : styles.error]}>
//           User Data: {authStatus.hasUser ? '✅' : '❌'}
//         </Text>
//         <Text style={[styles.status, authStatus.hasToken ? styles.success : styles.error]}>
//           Token: {authStatus.hasToken ? '✅' : '❌'}
//         </Text>
//         <Text style={[styles.status, authStatus.headerSet ? styles.success : styles.error]}>
//           Header Set: {authStatus.headerSet ? '✅' : '❌'}
//         </Text>
//       </View>
      
//       <Text style={styles.tokenPreview}>Token: {authStatus.tokenPreview}</Text>
      
//       <View style={styles.buttonContainer}>
//         <TouchableOpacity style={styles.button} onPress={checkAuthStatus}>
//           <Text style={styles.buttonText}>🔄 Refresh Status</Text>
//         </TouchableOpacity>
        
//         <TouchableOpacity style={styles.button} onPress={refreshAuthFromStorage}>
//           <Text style={styles.buttonText}>🔧 Fix Auth Header</Text>
//         </TouchableOpacity>
        
//         <TouchableOpacity style={styles.button} onPress={testAuthenticatedEndpoint}>
//           <Text style={styles.buttonText}>🧪 Test Auth Endpoint</Text>
//         </TouchableOpacity>
        
//         <TouchableOpacity style={styles.button} onPress={testPaymentEndpoint}>
//           <Text style={styles.buttonText}>💳 Test Payment Endpoint</Text>
//         </TouchableOpacity>
        
//         <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={clearAuthData}>
//           <Text style={styles.buttonText}>🗑️ Clear Auth Data</Text>
//         </TouchableOpacity>
//       </View>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     padding: 20,
//     backgroundColor: '#f0f0f0',
//     margin: 10,
//     borderRadius: 10,
//   },
//   title: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     marginBottom: 15,
//     textAlign: 'center',
//   },
//   statusContainer: {
//     marginBottom: 15,
//   },
//   status: {
//     fontSize: 14,
//     marginVertical: 2,
//   },
//   success: {
//     color: 'green',
//   },
//   error: {
//     color: 'red',
//   },
//   tokenPreview: {
//     fontSize: 12,
//     color: '#666',
//     marginBottom: 15,
//     fontFamily: 'monospace',
//   },
//   buttonContainer: {
//     gap: 10,
//   },
//   button: {
//     backgroundColor: '#007AFF',
//     padding: 12,
//     borderRadius: 8,
//     alignItems: 'center',
//   },
//   dangerButton: {
//     backgroundColor: '#FF3B30',
//   },
//   buttonText: {
//     color: 'white',
//     fontWeight: 'bold',
//   },
//   text: {
//     fontSize: 16,
//     textAlign: 'center',
//   },
// });

// export default AuthDebugComponent;