import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetToLogin } from '@navigation/RootNavigation';
import COLORS from '../../constants/colors';
import { useAppDispatch } from '@/store/redux/hooks';
import { setAuth } from '@/store/redux/slices/authSlice';
import { apiClient } from '@config/index'; // ✅ Use configured apiClient
import ProtectedRoute from '@components/ProtectedRoute';

const MAX_IMAGES = 10;

const categories = [
  'Phones', 'Gadgets', 'Electronics', 'Books and Media', 'Fashion and Apparel',
  'Home and Kitchen', 'Beauty and Personal Care', 'Food and Beverages',
  'Sports and Outdoors', 'Toys and Games', 'Automotive', 'Health and Wellness',
];

const types = ['sale', 'swap', 'both'];

interface Product {
  id: string;
  title: string;
  price: number;
  description: string;
  category: string;
  type: string;
  images: string[];
}

function EditProductScreen() {
  const navigation = useNavigation();
  const route = useRoute();
   const dispatch = useAppDispatch();
  const { productId } = route.params as { productId: string };

  const [product, setProduct] = useState<Product | null>(null);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('sale');
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [typeModalVisible, setTypeModalVisible] = useState(false);

  // ✅ ADD: Refresh function to refetch product data
  const refreshProduct = async () => {
    try {
      console.log('🔄 EditProductScreen: Refreshing product data');
      const data = await apiClient.get(`/api/products/${productId}`);
      
      setProduct(data);
      setTitle(data.title || '');
      setPrice(data.price?.toString() || '');
      setDescription(data.description || '');
      setCategory(data.category || '');
      setType(data.type || 'sale');
      setImageUris(data.images || []);
      
      console.log('✅ Product data refreshed with', data.images?.length || 0, 'images');
    } catch (error) {
      console.error('❌ Failed to refresh product:', error);
    }
  };

  useEffect(() => {
    const loadAuthData = async () => {
      try {
        console.log('🔍 EditProductScreen: Loading auth data...');
        
        const storedToken = await AsyncStorage.getItem('@auth_token');
        const storedUserJson = await AsyncStorage.getItem('@user_data');

        if (storedToken && storedUserJson) {
          const storedUser = JSON.parse(storedUserJson);
          console.log('🔄 EditProductScreen: Loading auth for', storedUser.fullName);
          dispatch(setAuth({ token: storedToken, user: storedUser }));
          console.log('✅ EditProductScreen: Auth data loaded');
        }
      } catch (error) {
        console.error('❌ EditProductScreen: Failed to load auth data:', error);
      }
    };

    loadAuthData();
  }, [dispatch]);

  useEffect(() => {
    console.log('🛠️ EditProductScreen - productId:', productId);
    let isMounted = true;

    // ✅ FIXED: Use apiClient for fetching product
    const fetchProduct = async () => {
      try {
        setFetching(true);
        console.log('🔍 EditProductScreen: Fetching product:', productId);
        
        // ✅ Use apiClient with correct /api prefix
        const data = await apiClient.get(`/api/products/${productId}`);
        
        console.log('✅ EditProductScreen: Product fetched successfully');
        console.log('🔍 Fetched product data:', data);

        if (isMounted) {
          setProduct(data);
          setTitle(data.title || '');
          setPrice(data.price?.toString() || '');
          setDescription(data.description || '');
          setCategory(data.category || '');
          setType(data.type || 'sale');
          setImageUris(data.images || []);
        }
      } catch (err: any) {
        console.error('❌ EditProductScreen: Fetch product error:', err);
        
        if (isMounted) {
          let errorMessage = 'Failed to fetch product.';
          
          if (err?.status === 404) {
            errorMessage = 'Product not found. It may have been deleted.';
          } else if (err?.status === 401) {
            errorMessage = 'Authentication expired. Please log in again.';
          } else if (err?.status === 403) {
            errorMessage = 'You do not have permission to edit this product.';
          }
          
          setError(errorMessage);
          
          // Handle authentication errors
          if (err?.status === 401) {
            Alert.alert('Authentication Error', errorMessage, [
              { 
                text: 'Login', 
                onPress: () => {
                  AsyncStorage.removeItem('@auth_token');
                  resetToLogin();
                }
              },
              { text: 'Cancel', onPress: () => navigation.goBack() }
            ]);
          } else {
            Alert.alert('Error', errorMessage, [
              { text: 'OK', onPress: () => navigation.goBack() }
            ]);
          }
        }
      } finally {
        if (isMounted) setFetching(false);
      }
    };

    fetchProduct();
    return () => { isMounted = false; };
  }, [productId, navigation]);

  const pickImage = async () => {
    if (imageUris.length >= MAX_IMAGES) {
      Alert.alert('Limit reached', `You can only upload up to ${MAX_IMAGES} images`);
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow access to media library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - imageUris.length,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newUris = result.assets.map(a => a.uri);
      setImageUris(prev => [...prev, ...newUris].slice(0, MAX_IMAGES));
    }
  };

  const deleteImage = (index: number) => {
    Alert.alert('Delete Image', 'Remove this image?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', 
        style: 'destructive',
        onPress: () => {
          setImageUris(prev => prev.filter((_, i) => i !== index));
        }
      },
    ]);
  };

  // ✅ FIXED: Use apiClient for delete
  const handleDelete = async () => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              console.log('🔍 EditProductScreen: Deleting product:', productId);
              
              // ✅ Use apiClient with correct endpoint
              await apiClient.delete(`/api/products/${productId}`);
              
              console.log('✅ EditProductScreen: Product deleted successfully');

              Alert.alert('Success', 'Product deleted successfully!', [
                { 
                  text: 'OK', 
                  onPress: () => navigation.goBack()
                }
              ]);
            } catch (err: any) {
              console.error('❌ EditProductScreen: Delete error:', err);
              
              let errorMessage = 'Delete failed';
              if (err?.status === 404) {
                errorMessage = 'Product not found. It may have already been deleted.';
              } else if (err?.status === 401) {
                errorMessage = 'Authentication expired. Please log in again.';
              } else if (err?.status === 403) {
                errorMessage = 'You do not have permission to delete this product.';
              } else if (err?.message) {
                errorMessage = err.message;
              }
              
              if (err?.status === 401) {
                Alert.alert('Authentication Error', errorMessage, [
                  { 
                    text: 'Login', 
                    onPress: () => {
                      AsyncStorage.removeItem('@auth_token');
                      resetToLogin();
                    }
                  },
                  { text: 'Cancel' }
                ]);
              } else {
                Alert.alert('Error', errorMessage);
              }
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };



  // ✅ SIMPLIFIED: Use the enhanced backend that handles existing images properly
const handleUpdate = async () => {
  if (!title || !price || !category || !type) {
    Alert.alert('Error', 'Please fill all required fields');
    return;
  }

  if (isNaN(Number(price))) {
    Alert.alert('Error', 'Enter a valid price');
    return;
  }

  try {
    setLoading(true);
    console.log('🔍 EditProductScreen: Updating product:', productId);

    // ✅ Separate existing vs new images
    const existingImages: string[] = [];
    const newImageFiles: string[] = [];

    imageUris.forEach((uri, index) => {
      if (uri.startsWith('http') || uri.startsWith('https')) {
        existingImages.push(uri);
      } else if (uri.startsWith('file://') || uri.startsWith('content://')) {
        newImageFiles.push(uri);
      }
    });

    console.log('📸 Image breakdown:', {
      existing: existingImages.length,
      new: newImageFiles.length,
      total: imageUris.length
    });

    // Token is handled automatically by apiClient

    // ✅ Create FormData with correct field names
    const formData = new FormData();
    formData.append('title', title);
    formData.append('price', price);
    formData.append('category', category);
    formData.append('type', type);
    formData.append('description', description);

    // ✅ FIXED: Use the same field name your backend expects
    // Based on your original code, it was 'images', not 'newImages'
    newImageFiles.forEach((uri, i) => {
      const filename = uri.split('/').pop() || `image-${Date.now()}-${i}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const fileType = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';
      
      console.log(`📤 Adding image ${i + 1}: ${filename}`);
      
      // ✅ Use 'images' field name (same as your original working code)
      formData.append('images', {
        uri,
        name: filename,
        type: fileType,
      } as any);
    });

    // ✅ Use apiClient instead of hardcoded URL
    console.log('🔍 Sending update request with FormData and existing images header');
    const result = await apiClient.put(`/api/products/${productId}`, formData, {
      headers: {
        'X-Existing-Images': JSON.stringify(existingImages),
      }
    });

    console.log('✅ Product updated successfully:', result.imageStats);

    // ✅ Update form with fresh data
    if (result.product) {
      const freshProduct = result.product;
      setProduct(freshProduct);
      setTitle(freshProduct.title || '');
      setPrice(freshProduct.price?.toString() || '');
      setDescription(freshProduct.description || '');
      setCategory(freshProduct.category || '');
      setType(freshProduct.type || 'sale');
      setImageUris(freshProduct.images || []);
      
      console.log('🔄 Form refreshed with', freshProduct.images?.length || 0, 'images');
    }

    // ✅ Show success with image stats
    const stats = result.imageStats;
    const message = stats 
      ? `Product updated!\n\nImages: ${stats.existing || 0} existing + ${stats.new || 0} new = ${stats.total || 0} total`
      : 'Product updated successfully!';

    Alert.alert('Success!', message, [
      {
        text: 'View Product',
        onPress: () => navigation.navigate('ProductDetail', { productId: productId })
      },
      { text: 'Stay Here', style: 'cancel' }
    ]);

  } catch (error: any) {
    console.error('❌ EditProductScreen: Update error:', error);
    Alert.alert('Error', error.message || 'Update failed. Please try again.');
  } finally {
    setLoading(false);
  }
};

  const renderDropdown = (
    visible: boolean,
    setVisible: React.Dispatch<React.SetStateAction<boolean>>,
    options: string[],
    onSelect: (val: string) => void
  ) => (
    <Modal transparent visible={visible} animationType="fade">
      <TouchableOpacity style={styles.modalOverlay} onPress={() => setVisible(false)}>
        <View style={styles.modalContent}>
          <FlatList
            data={options}
            keyExtractor={item => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => { onSelect(item); setVisible(false); }}
              >
                <Text style={styles.modalItemText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );

  if (fetching) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.gold} />
        <Text style={styles.loadingText}>Loading product...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#ff4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
  <ScrollView contentContainerStyle={styles.container}>
    <View style={styles.headerContainer}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={COLORS.gold} />
      </TouchableOpacity>
      
      <View style={styles.headerActions}>
        <TouchableOpacity onPress={refreshProduct} style={styles.refreshButton} disabled={loading}>
          <Ionicons name="refresh-outline" size={24} color={COLORS.gold} />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={handleDelete} style={styles.deleteButton} disabled={loading}>
          <Ionicons name="trash-outline" size={24} color="#ff4444" />
        </TouchableOpacity>
      </View>
    </View>

        <Text style={styles.header}>Edit Product</Text>

        <TouchableOpacity style={styles.imageUpload} onPress={pickImage}>
          {imageUris.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {imageUris.map((uri, idx) => {
                const isExisting = uri.startsWith('http') || uri.startsWith('https');
                return (
                  <View key={idx} style={styles.imageContainer}>
                    <Image source={{ uri }} style={styles.imagePreview} />
                    
                    {/* ✅ Show indicator for existing vs new images */}
                    <View style={[styles.imageTypeIndicator, isExisting ? styles.existingIndicator : styles.newIndicator]}>
                      <Text style={styles.imageTypeText}>
                        {isExisting ? 'SAVED' : 'NEW'}
                      </Text>
                    </View>
                    
                    <TouchableOpacity 
                      style={styles.deleteImageButton}
                      onPress={() => deleteImage(idx)}
                    >
                      <Ionicons name="close-circle" size={24} color="#ff4444" />
                    </TouchableOpacity>
                  </View>
                );
              })}
              
              {/* ✅ Add more images button */}
              {imageUris.length < MAX_IMAGES && (
                <TouchableOpacity style={styles.addMoreImagesButton} onPress={pickImage}>
                  <Ionicons name="add-circle-outline" size={40} color={COLORS.gold} />
                  <Text style={styles.addMoreText}>Add More</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          ) : (
            <>
              <Ionicons name="image-outline" size={32} color={COLORS.gold} />
              <Text style={styles.imageText}>Tap to upload images (max {MAX_IMAGES})</Text>
            </>
          )}
        </TouchableOpacity>

        {/* <View style={{ padding: 10, backgroundColor: '#333', margin: 10, borderRadius: 5 }}>
  <TouchableOpacity 
    style={{ 
      backgroundColor: '#9C27B0', 
      padding: 15, 
      borderRadius: 8, 
      alignItems: 'center' 
    }} 
    onPress={async () => {
      try {
        console.log('🔍 Testing server connection...');
        Alert.alert('Testing...', 'Check console for results');
        
        // Test 1: Simple GET (this works)
        console.log('📡 Test 1: GET request...');
        const getResult = await apiClient.get(`/api/products/${productId}`);
        console.log('✅ GET successful:', getResult.title);
        
        // Test 2: Simple PUT 
        console.log('📡 Test 2: PUT request...');
        const token = await AsyncStorage.getItem('@auth_token');
        console.log('Token length:', token?.length);
        
        const updateData = {
          title: title,
          price: Number(price),
          category: category,
          type: type,
          description: description
        };
        
        console.log('Update data:', updateData);
        console.log('URL:', `http://192.168.0.3:5002/api/products/${productId}`);
        
        const response = await fetch(`http://192.168.0.3:5002/api/products/${productId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        });
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ PUT successful:', result);
          Alert.alert('Success!', 'Server is working. Your update should work now.');
        } else {
          const errorText = await response.text();
          console.log('❌ PUT failed:', response.status, errorText);
          Alert.alert('PUT Failed', `Status: ${response.status}\nError: ${errorText}`);
        }
        
      } catch (error) {
        console.error('❌ Test failed:', error);
        Alert.alert('Test Error', error.message);
      }
    }}
  >
    <Text style={{ color: '#fff', fontWeight: 'bold' }}>
      🧪 Test Server Connection
    </Text>
  </TouchableOpacity>
</View> */}


<Text style={styles.header}>Edit Product</Text>

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
          maxLength={1000} 
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

        <TouchableOpacity 
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]} 
          onPress={handleUpdate} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.submitText}>Update Product</Text>
            </>
          )}
        </TouchableOpacity>

        {renderDropdown(categoryModalVisible, setCategoryModalVisible, categories, setCategory)}
        {renderDropdown(typeModalVisible, setTypeModalVisible, types, setType)}
      </ScrollView>
   
  );
}

const styles = StyleSheet.create({
  container: { 
    padding: 20, 
    paddingTop: 60, 
    backgroundColor: '#121212', 
    flexGrow: 1 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#121212' 
  },
  loadingText: { 
    marginTop: 20, 
    color: COLORS.gold 
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
    padding: 20,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
  },
  retryButton: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#121212',
    fontWeight: 'bold',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: { 
    backgroundColor: '#1E1E1E', 
    padding: 8, 
    borderRadius: 8, 
    borderColor: COLORS.gold, 
    borderWidth: 1 
  },
  refreshButton: {
    backgroundColor: '#1E1E1E',
    padding: 8,
    borderRadius: 8,
    borderColor: COLORS.gold,
    borderWidth: 1,
  },
  deleteButton: {
    backgroundColor: '#1E1E1E',
    padding: 8,
    borderRadius: 8,
    borderColor: '#ff4444',
    borderWidth: 1,
  },
  header: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: COLORS.gold, 
    marginBottom: 20, 
    textAlign: 'center' 
  },
  input: { 
    backgroundColor: '#1E1E1E', 
    color: '#fff', 
    padding: 12, 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: '#333', 
    marginBottom: 15 
  },
  textArea: { 
    height: 120, 
    backgroundColor: '#1E1E1E', 
    color: '#fff', 
    padding: 12, 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: '#333', 
    marginBottom: 15, 
    textAlignVertical: 'top' 
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
    padding: 10 
  },
  imageContainer: {
    position: 'relative',
    marginRight: 10,
  },
  imagePreview: { 
    width: 120, 
    height: 120, 
    borderRadius: 8 
  },
  imageTypeIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  existingIndicator: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
  },
  newIndicator: {
    backgroundColor: 'rgba(255, 152, 0, 0.9)',
  },
  imageTypeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  addMoreImagesButton: {
    width: 120,
    height: 120,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.gold,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
  },
  addMoreText: {
    color: COLORS.gold,
    fontSize: 12,
    marginTop: 4,
  },
  deleteImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#121212',
    borderRadius: 12,
  },
  imageText: { 
    marginTop: 10, 
    color: COLORS.gold, 
    fontWeight: '600' 
  },
  label: { 
    fontWeight: 'bold', 
    color: '#fff', 
    marginBottom: 5 
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
    marginBottom: 15 
  },
  dropdownText: { 
    fontSize: 16, 
    color: COLORS.gold 
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: '#000000aa', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalContent: { 
    backgroundColor: '#1E1E1E', 
    borderRadius: 10, 
    padding: 20, 
    width: '80%', 
    maxHeight: '60%' 
  },
  modalItem: { 
    padding: 12, 
    borderBottomColor: '#333', 
    borderBottomWidth: 1 
  },
  modalItemText: { 
    fontSize: 16, 
    color: '#fff' 
  },
  submitBtn: { 
    marginTop: 20, 
    backgroundColor: COLORS.gold, 
    paddingVertical: 12, 
    borderRadius: 8, 
    alignItems: 'center', 
    flexDirection: 'row', 
    justifyContent: 'center', 
    gap: 8 
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitText: { 
    color: '#121212', 
    fontSize: 16, 
    fontWeight: '600' 
  },
});

export default EditProductScreen;