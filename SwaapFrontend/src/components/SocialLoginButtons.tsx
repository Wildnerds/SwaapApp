// import React, { useEffect } from 'react';
// import { StyleSheet, TouchableOpacity, Text } from 'react-native';
// import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
// import { Ionicons } from '@expo/vector-icons';

// export const GoogleLoginButton = ({ onLoginSuccess, onError }: {
//   onLoginSuccess: (token: string) => void;
//   onError: (error: any) => void;
// }) => {
//   useEffect(() => {
//     GoogleSignin.configure({
//       webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
//       offlineAccess: false,
//     });
//   }, []);

//   const handleGoogleSignIn = async () => {
//     try {
//       // 1. Check services
//       await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      
//       // 2. Sign in
//       await GoogleSignin.signIn();
      
//       // 3. Get tokens
//       const { idToken } = await GoogleSignin.getTokens();
      
//       if (!idToken) throw new Error('No ID token received');
      
//       onLoginSuccess(idToken);
//     } catch (error: any) {
//       let message = 'Sign-in failed';
      
//       if (error.code === statusCodes.SIGN_IN_CANCELLED) {
//         message = 'Sign in cancelled';
//       } else if (error.code === statusCodes.IN_PROGRESS) {
//         message = 'Operation in progress';
//       } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
//         message = 'Play services not available';
//       }
      
//       onError({ message, code: error.code });
//     }
//   };

//   return (
//     <TouchableOpacity style={styles.button} onPress={handleGoogleSignIn}>
//       <Ionicons name="logo-google" size={20} color="#DB4437" />
//       <Text style={styles.buttonText}>Continue with Google</Text>
//     </TouchableOpacity>
//   );
// };

// const styles = StyleSheet.create({
//   button: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: 'white',
//     padding: 12,
//     borderRadius: 4,
//     borderWidth: 1,
//     borderColor: '#ddd',
//     marginVertical: 8,
//     justifyContent: 'center',
//   },
//   buttonText: {
//     marginLeft: 8,
//     color: '#444',
//     fontWeight: '500',
//   },
// });