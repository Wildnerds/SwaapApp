import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Image, Alert, ActivityIndicator, Modal, FlatList, Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import COLORS from '../constants/colors';
import { addNewProduct, resetAndFetchProducts } from '@/store/redux/slices/productSlice';
import { Product } from '@types';
import { AppDispatch } from '@store';
import { apiClient } from '@config/index';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '@/store/redux/hooks'; // Add this
import { useAuth } from '@/context/AuthContext'; // ✅ Add AuthContext
import AsyncStorage from '@react-native-async-storage/async-storage';
import { optimizeMultipleImages, validateImageCount } from '@/utils/imageOptimization';


const categories = [
 'AUTOMOTIVE',
  'ELECTRONICS',
  'HOME & KITCHEN',
  'SPORTS & OUTDOOR',
  'FASHION',
  'BOOKS',
  'BEAUTY',
  'FOOD',
  'TOYS & GAMES',
  'HEALTH & PERSONAL CARE',
  'PET SUPPLIES',
  'OFFICE PRODUCTS',
  'TOOLS & HOME IMPROVEMENT',
  'BABY PRODUCTS',
  'GARDEN & OUTDOORS',
  'VIDEO GAMES',
  'MUSIC & AUDIO',
  'JEWELRY',
  'TRAVEL & LUGGAGE',
];

const types = ['sale', 'swap', 'both'];
const conditions = ['New', 'Like New', 'Good', 'Fair', 'Poor'];

export default function PostItemScreen() {
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('sale');
  const [condition, setCondition] = useState('Good'); // Default to 'Good'
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [conditionModalVisible, setConditionModalVisible] = useState(false);

  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  
  // ✅ Use AuthContext for authentication (primary source)
  const { user, isAuthenticated } = useAuth();
  
  // Keep Redux selectors as fallback
  const reduxUser = useAppSelector((state) => state.auth.user);
  const reduxToken = useAppSelector((state) => state.auth.token);
  
  // Debug logging
  console.log('🔍 PostItemScreen auth state:', {
    isAuthenticated,
    hasUser: !!user,
    hasReduxUser: !!reduxUser,
    userEmail: user?.email || 'none',
    userId: user?._id || user?.id || 'none'
  });

  const pickImage = async () => {
    
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission required', 'Please allow access to media library');
        return;
      }

      // Launch image picker with platform-specific options
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsMultipleSelection: true,
        selectionLimit: 5,
        ...(Platform.OS === 'ios' && { aspect: [4, 3] }), // aspect only for iOS
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newUris = result.assets.map(asset => asset.uri);
        
        // ✅ Validate image count
        if (!validateImageCount(newUris, 5)) {
          return;
        }
        
        // ✅ Optimize images before setting them
        console.log('🖼️ Optimizing selected images...');
        setLoading(true);
        
        try {
          const optimizedUris = await optimizeMultipleImages(newUris, {
            maxWidth: 1080,
            maxHeight: 1080,
            quality: 0.8,
            maxSizeKB: 500, // 500KB max per image
          });
          
          setImageUris(optimizedUris);
          console.log('✅ Images optimized and ready for upload');
        } catch (error) {
          console.error('❌ Image optimization failed:', error);
          // Fall back to original images if optimization fails
          setImageUris(newUris);
          Alert.alert(
            'Optimization Failed',
            'Images will be used as-is. Upload may be slower.'
          );
        } finally {
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

const handleSubmit = async () => {
  if (!title || !price || !category || !type || imageUris.length === 0) {
    Alert.alert('Error', 'Please fill all fields and select images.');
    return;
  }

  // ✅ Check AuthContext first (primary), then Redux as fallback
  const currentUser = user || reduxUser;
  
  if (!isAuthenticated && !currentUser) {
    console.log('🔍 PostItem auth check failed:', {
      isAuthenticated,
      hasUser: !!user,
      hasReduxUser: !!reduxUser,
      userEmail: user?.email || 'none',
      userId: user?._id || user?.id || 'none'
    });
    Alert.alert('Error', 'You must be logged in to post an item.');
    return;
  }
  
  console.log('✅ PostItem auth check passed:', {
    isAuthenticated,
    userEmail: currentUser?.email || 'none',
    userId: currentUser?._id || currentUser?.id || 'none'
  });

  try {
    setLoading(true);
    
    // ✅ Get token from Redux first, fallback to AsyncStorage
    let token = reduxToken;
    if (!token) {
      console.log('🔍 No token in Redux, checking AsyncStorage...');
      token = await AsyncStorage.getItem('@auth_token');
    }

    if (!token) {
      Alert.alert('Error', 'Authentication token missing. Please log in again.');
      return;
    }

    console.log('✅ PostItem: Using token, length:', token.length);
    console.log('✅ PostItem: User:', currentUser?.fullName || 'Unknown');

    const formData = new FormData();
    formData.append('title', title);
    formData.append('price', price);
    formData.append('category', category);
    formData.append('type', type);
    formData.append('condition', condition);
    formData.append('description', description);

    // Handle image uploads
    imageUris.forEach((uri, index) => {
      const filename = uri.split('/').pop() || `image-${index}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const mimeType = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append('images', {
        uri,
        name: filename,
        type: mimeType,
      } as any);
    });

    console.log('🚀 PostItem: Sending request to /api/products...');

    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`,
      },
    };

    const res = await apiClient.post('/api/products', formData, config);

    // ✅ Handle apiClient response structure
    console.log('🔍 PostItem: Full API response:', res);
    console.log('🔍 PostItem: Response.data:', res.data);
    console.log('🔍 PostItem: Response keys:', Object.keys(res || {}));

    // ✅ Try different ways to get the actual data
    let result;
    if (res.data !== undefined) {
      result = res.data;
      console.log('📦 Using res.data');
    } else if (res.product) {
      result = res;
      console.log('📦 Using res directly (has product)');
    } else if (res._id || res.success) {
      result = res;
      console.log('📦 Using res directly (has _id or success)');
    } else {
      result = res;
      console.log('📦 Using res as fallback');
    }

    console.log('🔍 PostItem: Final result:', result);
    console.log('🔍 PostItem: Result type:', typeof result);
    console.log('🔍 PostItem: Result keys:', Object.keys(result || {}));

    // ✅ Handle different response structures
    let productData;
    let productId;

    if (result && result.product) {
      // Case 1: Response has { success: true, product: {...} }
      productData = result.product;
      productId = productData._id || productData.id;
      console.log('📦 Using result.product structure');
    } else if (result && (result._id || result.id)) {
      // Case 2: Response is the product directly { _id: "...", title: "..." }
      productData = result;
      productId = result._id || result.id;
      console.log('📦 Using direct result structure');
    } else if (result && result.data && (result.data._id || result.data.id)) {
      // Case 3: Response has { data: {...} }
      productData = result.data;
      productId = productData._id || productData.id;
      console.log('📦 Using result.data structure');
    } else if (result && result.success && result.user) {
      // Case 4: Response like { success: true, user: "id", createdAt: "..." }
      productData = result;
      productId = Date.now().toString(); // Generate ID if not provided
      console.log('📦 Using success response structure');
    } else {
      // Case 5: Unknown structure
      console.error('❌ Unknown response structure:', result);
      productData = result || {};
      productId = productData._id || productData.id || Date.now().toString();
      console.log('📦 Using fallback structure');
    }

    console.log('🔍 Final productData:', productData);
    console.log('🔍 Final productId:', productId);

    const newProduct: Product = {
      _id: productId,
      title,
      price: parseFloat(price),
      category,
      type,
      description,
      images: productData.images || imageUris,
      user: {
        _id: productData.user || currentUser?._id || currentUser?.id || '',
        fullName: currentUser?.fullName || currentUser?.name || currentUser?.email || 'You',
      },
      createdAt: productData.createdAt || new Date().toISOString(),
    };

    console.log('✅ PostItem: Created product object:', newProduct);

    dispatch(addNewProduct(newProduct));
    dispatch(resetAndFetchProducts());

    // ✅ IMPROVED: Better success dialog with multiple options
    Alert.alert(
      'Success! 🎉', 
      'Your item has been posted successfully!',
      [
        // {
        //   text: 'Go Home',
        //   style: 'cancel',
        //   onPress: () => {
        //     navigation.navigate('Home');
        //   }
        // },
        {
          text: 'View Item',
          onPress: () => {
            // Navigate to the newly created product
            navigation.navigate('ProductDetail', { productId: productId });
          }
        },
        {
          text: 'Add Another',
          onPress: () => {
            // Reset the form for a new item
            setTitle('');
            setPrice('');
            setDescription('');
            setCategory('');
            setType('sale');
            setImageUris([]);
            console.log('📝 Form reset for new item');
          }
        }
      ],
      { cancelable: false }
    );

  } catch (error: any) {
    console.error('❌ PostItem Upload Error:', error);
    
    // Handle specific authentication errors
    if (error?.response?.status === 401) {
      Alert.alert('Authentication Error', 'Your session has expired. Please log in again.');
    } else {
      const errorMessage = error?.response?.data?.message || error?.message || 'Please try again.';
      Alert.alert('Error', `Upload failed.\n${errorMessage}`);
    }
  } finally {
    setLoading(false);
  }
};
  const removeImage = (index: number) => {
    const newUris = imageUris.filter((_, i) => i !== index);
    setImageUris(newUris);
  };

  const renderDropdown = (
    visible: boolean, 
    setVisible: (visible: boolean) => void, 
    options: string[], 
    onSelect: (val: string) => void
  ) => (
    <Modal transparent visible={visible} animationType="fade">
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1}
        onPress={() => setVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalContent} 
          activeOpacity={1}
          onPress={() => {}} // Prevent modal from closing when touching content
        >
          <FlatList
            data={options}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  onSelect(item);
                  setVisible(false);
                }}
              >
                <Text style={styles.modalItemText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={COLORS.gold} />
      </TouchableOpacity>

      <Text style={styles.header}>Post New Item</Text>

      <TouchableOpacity style={styles.imageUpload} onPress={pickImage}>
        {imageUris.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {imageUris.map((uri, idx) => (
              <View key={idx} style={styles.imageContainer}>
                <Image
                  source={{ uri }}
                  style={styles.imagePreview}
                />
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => removeImage(idx)}
                >
                  <Ionicons name="close-circle" size={24} color="#ff4444" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        ) : (
          <>
            <Ionicons name="image-outline" size={32} color={COLORS.gold} />
            <Text style={styles.imageText}>Tap to upload images</Text>
          </>
        )}
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Item Title"
        value={title}
        onChangeText={setTitle}
        placeholderTextColor="#888"
      />

      <TextInput
        style={styles.input}
        placeholder="₦ Price"
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
        placeholderTextColor="#888"
      />

      <TextInput
        style={styles.textArea}
        placeholder="Describe your item..."
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={5}
        maxLength={1000}
        textAlignVertical="top"
        placeholderTextColor="#888"
      />

      <Text style={styles.label}>Category</Text>
      <TouchableOpacity style={styles.dropdown} onPress={() => setCategoryModalVisible(true)}>
        <Text style={styles.dropdownText}>{category || 'Select category'}</Text>
        <Ionicons name="chevron-down" size={18} color={COLORS.gold} />
      </TouchableOpacity>

      <Text style={styles.label}>Type</Text>
      <TouchableOpacity style={styles.dropdown} onPress={() => setTypeModalVisible(true)}>
        <Text style={styles.dropdownText}>{type || 'Select type'}</Text>
        <Ionicons name="chevron-down" size={18} color={COLORS.gold} />
      </TouchableOpacity>

      <Text style={styles.label}>Condition</Text>
      <TouchableOpacity style={styles.dropdown} onPress={() => setConditionModalVisible(true)}>
        <Text style={styles.dropdownText}>{condition || 'Select condition'}</Text>
        <Ionicons name="chevron-down" size={18} color={COLORS.gold} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            <Text style={styles.submitText}>Submit</Text>
          </>
        )}
      </TouchableOpacity>

      {renderDropdown(categoryModalVisible, setCategoryModalVisible, categories, setCategory)}
      {renderDropdown(typeModalVisible, setTypeModalVisible, types, setType)}
      {renderDropdown(conditionModalVisible, setConditionModalVisible, conditions, setCondition)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    backgroundColor: '#121212',
    flexGrow: 1,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 40 : 20,
    left: 20,
    zIndex: 2,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.gold,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#1E1E1E',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#1E1E1E',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
    height: 120,
    textAlignVertical: 'top',
  },
  imageUpload: {
    borderWidth: 2,
    borderColor: COLORS.gold,
    borderStyle: 'dashed',
    borderRadius: 10,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#1E1E1E',
  },
  imageContainer: {
    position: 'relative',
    marginRight: 10,
  },
  imagePreview: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#fff',
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  imageText: {
    marginTop: 10,
    color: COLORS.gold,
    fontWeight: '600',
  },
  label: {
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    minHeight: 45,
  },
  dropdownText: {
    fontSize: 16,
    color: COLORS.gold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    padding: 10,
    width: '80%',
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: COLORS.gold,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  modalItem: {
    padding: 12,
    borderBottomColor: '#333',
    borderBottomWidth: 1,
  },
  modalItemText: {
    fontSize: 16,
    color: '#fff',
  },
  submitBtn: {
    marginTop: 20,
    backgroundColor: COLORS.gold,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Platform.OS === 'ios' ? 8 : 10,
    minHeight: 45,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  submitText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: '600',
  },
});