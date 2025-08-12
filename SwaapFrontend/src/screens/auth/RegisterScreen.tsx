import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import Toast from 'react-native-toast-message';
import Spinner from 'react-native-loading-spinner-overlay';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '@constants/colors';
import { useAuth } from '@context/AuthContext';
import { API, apiClient } from '@config/index';
import { AnimatedBanner } from '@/components/auth/AnimatedBanner';

const logo = require('@/assets/images/logo1.png');

// Define navigation prop
type RegisterScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Register'>;

// Define form data shape
type FormData = {
  name: string;
  email: string;
  password: string;
  phone: string;
};

// Form validation schema
const schema = Yup.object().shape({
  name: Yup.string().required('Name is required'),
  phone: Yup.string()
    .required('Phone number is required')
    .matches(/^[0-9]{10,15}$/, 'Enter a valid phone number'),
  email: Yup.string().email('Invalid email').required('Email is required'),
  password: Yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
});

export default function RegisterScreen() {
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  // ✅ FIXED: Use register function from AuthContext instead of login
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<FormData>({
    resolver: yupResolver(schema)
  });

 const onSubmit = async (data: FormData) => {
  setLoading(true);
  try {
    console.log('🚀 RegisterScreen: Form data before registration:', {
      name: data.name,
      email: data.email,
      phone: data.phone,
      phoneType: typeof data.phone,
      phoneLength: data.phone?.length,
    });

    // ✅ VERIFY: Make sure data.phone exists and has a value
    if (!data.phone || data.phone.trim() === '') {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Phone number is required',
        visibilityTime: 4000,
      });
      return;
    }

    console.log('🔄 RegisterScreen: Calling register function with:', {
      email: data.email,
      password: '***', // Don't log password
      fullName: data.name,
      mobile: data.phone,
    });

    // ✅ FIXED: Pass data as an object to match AuthContext register function
    const userData = {
      email: data.email,
      password: data.password,
      fullName: data.name,
      mobile: data.phone
    };
    
    const result = await register(userData);


    console.log('✅ Registration result:', result);

    if (result?.success) {
      Toast.show({
        type: 'success',
        text1: 'Account Created!',
        text2: 'Welcome to Swaap! Please verify your email.',
        visibilityTime: 4000,
      });

      // Clear form
      reset();

      // Navigate to login or verification screen
      navigation.navigate('Login');
    } else {
      throw new Error(result?.message || 'Registration failed');
    }

  } catch (error: any) {
    console.error('❌ Registration error:', error);
    
    let errorMessage = 'Registration failed. Please try again.';
    
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    Toast.show({
      type: 'error',
      text1: 'Registration Failed',
      text2: errorMessage,
      visibilityTime: 4000,
    });
  } finally {
    setLoading(false);
  }
};


  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Spinner
          visible={loading}
          textContent="Creating account..."
          textStyle={{ color: '#FFF' }}
          animation="fade"
          overlayColor="rgba(0,0,0,0.7)"
          color={COLORS.gold}
        />

        <AnimatedBanner logoSource={logo} />

        <Text style={styles.title}>Create Account</Text>

        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, value } }) => (
            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Full Name"
                style={[styles.input, errors.name && styles.inputError]}
                placeholderTextColor="#888"
                value={value || ''}
                onChangeText={onChange}
                autoCapitalize="words"
              />
            </View>
          )}
        />
        {errors.name && <Text style={styles.errorText}>{errors.name.message}</Text>}

        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, value } }) => (
            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Phone Number"
                style={[styles.input, errors.phone && styles.inputError]}
                placeholderTextColor="#888"
                keyboardType="phone-pad"
                value={value || ''}
                onChangeText={onChange}
              />
            </View>
          )}
        />
        {errors.phone && <Text style={styles.errorText}>{errors.phone.message}</Text>}

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Email Address"
                style={[styles.input, errors.email && styles.inputError]}
                placeholderTextColor="#888"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={value || ''}
                onChangeText={(text) => onChange(text.trim().toLowerCase())}
              />
            </View>
          )}
        />
        {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Password"
                style={[styles.inputWithIcon, errors.password && styles.inputError]}
                placeholderTextColor="#888"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                value={value || ''}
                onChangeText={onChange}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={24}
                  color="#888"
                />
              </TouchableOpacity>
            </View>
          )}
        />
        {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}

        <TouchableOpacity style={styles.button} onPress={handleSubmit(onSubmit)}>
          <Text style={styles.buttonText}>Create Account</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Already have an account? <Text style={styles.linkBold}>Sign In</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#121212', // Dark background
    flexGrow: 1,
    justifyContent: 'center'
  },
  bannerContainer: {
    height: 180,
    width: '100%',
    backgroundColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    marginBottom: 30,
    shadowColor: COLORS.gold,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF', // White text
    marginBottom: 40,
    textAlign: 'center'
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#1E1E1E', // Dark input background
    color: '#FFFFFF', // White text
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333', // Dark border
    fontSize: 16,
  },
  inputWithIcon: {
    backgroundColor: '#1E1E1E',
    color: '#FFFFFF',
    padding: 15,
    paddingRight: 50, // Space for eye icon
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    fontSize: 16,
  },
  inputError: {
    borderColor: '#FF6B6B', // Red for errors
    borderWidth: 2,
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    top: 15,
    padding: 5,
  },
  button: {
    backgroundColor: COLORS.gold,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: COLORS.gold,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonText: {
    color: '#000000', // Black text on gold button
    fontWeight: 'bold',
    fontSize: 18,
  },
  link: {
    marginTop: 30,
    color: '#CCCCCC', // Light gray text
    textAlign: 'center',
    fontSize: 16,
  },
  linkBold: {
    color: COLORS.gold,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#FF6B6B', // Red error text
    marginBottom: 10,
    fontSize: 14,
    marginLeft: 5,
  }
});