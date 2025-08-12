// import React, { forwardRef, useState, useRef, useEffect } from 'react';
// import {
//   View,
//   Text,
//   Image,
//   TouchableOpacity,
//   ScrollView,
//   StyleSheet,
//   Dimensions,
//   Alert,
//   Modal,
//   StatusBar,
//   SafeAreaView,
// } from 'react-native';
// import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
// import { Ionicons } from '@expo/vector-icons';
// import { Product } from '@types';
// import COLORS from '@constants/colors';
// import { useNavigation } from '@react-navigation/native';
// import { NativeStackNavigationProp } from '@react-navigation/native-stack';
// import { RootStackParamList } from '@navigation/types';
// import { API_BASE_URL } from '@config';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// interface ProductSheetProps {
//   setSelectedProduct: React.Dispatch<React.SetStateAction<Product | null>>;
//   onDelete: () => void;
//   onEdit: (product: Product) => void;
//   selectedProduct: Product;
//   currentUserId: string;
// }

// type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// const ProductSheet = forwardRef<BottomSheet, ProductSheetProps>((props, ref) => {
//   const { selectedProduct, setSelectedProduct, onDelete, onEdit, currentUserId } = props;
//   const navigation = useNavigation<NavigationProp>();
  
//   const [currentImageIndex, setCurrentImageIndex] = useState(0);
//   const [isZoomModalVisible, setIsZoomModalVisible] = useState(false);
//   const [sellerName, setSellerName] = useState<string>('');

//   // Fixed ownership check - only check the actual owner ID
//   const isOwner = selectedProduct?.sellerId === currentUserId;

//   // Fetch seller info only for non-owners
//   useEffect(() => {
//     if (selectedProduct && !isOwner) {
//       fetchSellerName();
//     } else {
//       setSellerName(''); // Clear seller name for owned products
//     }
//   }, [selectedProduct, isOwner]);

//   const fetchSellerName = async () => {
//     try {
//       const token = await AsyncStorage.getItem('@token');
//       const response = await fetch(`${API_BASE_URL}/users/${selectedProduct.sellerId}`, {
//         headers: { 'Authorization': `Bearer ${token}` }
//       });
      
//       if (response.ok) {
//         const userData = await response.json();
//         setSellerName(userData.name || userData.username || 'Unknown Seller');
//       }
//     } catch (error) {
//       console.error('Error fetching seller:', error);
//       setSellerName('Unknown Seller');
//     }
//   };

//   const handleScroll = (event: any) => {
//     const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
//     setCurrentImageIndex(index);
//   };

//   const handleDelete = () => {
//     Alert.alert('Delete Product', 'Are you sure?', [
//       { text: 'Cancel', style: 'cancel' },
//       {
//         text: 'Delete',
//         style: 'destructive',
//         onPress: async () => {
//           try {
//             const token = await AsyncStorage.getItem('@token');
//             const response = await fetch(`${API_BASE_URL}/products/${selectedProduct._id}`, {
//               method: 'DELETE',
//               headers: { 'Authorization': `Bearer ${token}` }
//             });

//             if (response.ok) {
//               Alert.alert('Success', 'Product deleted');
//               onDelete();
//               setSelectedProduct(null);
//               (ref as React.RefObject<BottomSheet>)?.current?.close();
//             } else {
//               throw new Error('Failed to delete');
//             }
//           } catch (error) {
//             Alert.alert('Error', 'Failed to delete product');
//           }
//         }
//       }
//     ]);
//   };

//   // Navigation handlers
//   const handleBuy = () => navigation.navigate('Buy', { product: selectedProduct });
//   const handleSwap = () => navigation.navigate('SwapOffer', { 
//     requestedProduct: selectedProduct,
//     requestedProductPrice: selectedProduct.price 
//   });
//   const handleChat = () => navigation.navigate('Chat', { conversationId: selectedProduct._id });

//   // Render action buttons based on ownership
//   const renderActionButtons = () => {
//     if (isOwner) {
//       // Owner can only edit and delete
//       return (
//         <View style={styles.actionButtons}>
//           <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={() => onEdit(selectedProduct)}>
//             <Ionicons name="create-outline" size={18} color="#fff" />
//             <Text style={styles.buttonText}>Edit</Text>
//           </TouchableOpacity>
//           <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleDelete}>
//             <Ionicons name="trash" size={18} color="#fff" />
//             <Text style={styles.buttonText}>Delete</Text>
//           </TouchableOpacity>
//         </View>
//       );
//     }

//     // Non-owners see buy/swap/chat based on product type
//     const { type } = selectedProduct;
//     const buttons = [];
    
//     // Always show chat for non-owners
//     buttons.push(
//       <TouchableOpacity key="chat" style={[styles.actionButton, styles.chatButton]} onPress={handleChat}>
//         <Ionicons name="chatbubble" size={18} color="#fff" />
//         <Text style={styles.buttonText}>Chat</Text>
//       </TouchableOpacity>
//     );

//     // Show buy button only for 'sale' and 'both' types
//     if (type === 'sale' || type === 'both') {
//       buttons.push(
//         <TouchableOpacity key="buy" style={[styles.actionButton, styles.buyButton]} onPress={handleBuy}>
//           <Ionicons name="card" size={18} color="#fff" />
//           <Text style={styles.buttonText}>Buy</Text>
//         </TouchableOpacity>
//       );
//     }

//     // Show swap button only for 'swap' and 'both' types
//     if (type === 'swap' || type === 'both') {
//       buttons.push(
//         <TouchableOpacity key="swap" style={[styles.actionButton, styles.swapButton]} onPress={handleSwap}>
//           <Ionicons name="swap-horizontal" size={18} color="#fff" />
//           <Text style={styles.buttonText}>Swap</Text>
//         </TouchableOpacity>
//       );
//     }

//     return <View style={styles.actionButtons}>{buttons}</View>;
//   };

//   const renderProductInfo = () => {
//     const infoItems = [
//       { label: 'Seller', value: sellerName, show: !isOwner && sellerName },
//       { label: 'Description', value: selectedProduct.description, show: selectedProduct.description },
//       { label: 'Category', value: selectedProduct.category, show: selectedProduct.category },
//       { label: 'Condition', value: selectedProduct.condition, show: selectedProduct.condition },
//     ];

//     return (
//       <View style={styles.productInfo}>
//         <View style={styles.header}>
//           <Text style={styles.title}>{selectedProduct.title}</Text>
//           <View style={[styles.typeBadge, styles[`${selectedProduct.type}Badge`]]}>
//             <Text style={styles.badgeText}>{selectedProduct.type?.toUpperCase()}</Text>
//           </View>
//         </View>

//         <Text style={styles.price}>₦{Number(selectedProduct.price).toLocaleString()}</Text>

//         {infoItems.map((item, index) => 
//           item.show ? (
//             <View key={index} style={styles.infoRow}>
//               <Text style={styles.label}>{item.label}:</Text>
//               <Text style={styles.value}>{item.value}</Text>
//             </View>
//           ) : null
//         )}
//       </View>
//     );
//   };

//   if (!selectedProduct) return null;

//   const images = selectedProduct.images || [];
//   const hasMultipleImages = images.length > 1;

//   return (
//     <>
//       <BottomSheet
//         ref={ref}
//         snapPoints={['50%', '90%']}
//         enablePanDownToClose={true}
//         backgroundStyle={{ backgroundColor: '#f8f9fa' }}
//         handleIndicatorStyle={{ backgroundColor: COLORS.gold }}
//         index={-1}
//       >
//         <BottomSheetScrollView contentContainerStyle={styles.contentContainer}>
//           {/* Images Section */}
//           <View style={styles.imageSection}>
//             <ScrollView 
//               horizontal 
//               pagingEnabled 
//               showsHorizontalScrollIndicator={false}
//               onScroll={handleScroll}
//               scrollEventThrottle={16}
//             >
//               {images.map((image, index) => (
//                 <TouchableOpacity key={index} onPress={() => setIsZoomModalVisible(true)}>
//                   <Image source={{ uri: image }} style={styles.productImage} resizeMode="cover" />
//                 </TouchableOpacity>
//               ))}
//             </ScrollView>

//             {hasMultipleImages && (
//               <View style={styles.imageCounter}>
//                 <Text style={styles.imageCounterText}>{currentImageIndex + 1} / {images.length}</Text>
//               </View>
//             )}
//           </View>

//           {renderProductInfo()}
//           {renderActionButtons()}
//         </BottomSheetScrollView>
//       </BottomSheet>

//       {/* Zoom Modal */}
//       <Modal visible={isZoomModalVisible} transparent animationType="fade" onRequestClose={() => setIsZoomModalVisible(false)}>
//         <StatusBar hidden />
//         <SafeAreaView style={styles.zoomModalContainer}>
//           <TouchableOpacity style={styles.closeButton} onPress={() => setIsZoomModalVisible(false)}>
//             <Ionicons name="close" size={30} color="#fff" />
//           </TouchableOpacity>
//           <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
//             {images.map((image, index) => (
//               <Image key={index} source={{ uri: image }} style={styles.zoomImage} resizeMode="contain" />
//             ))}
//           </ScrollView>
//         </SafeAreaView>
//       </Modal>
//     </>
//   );
// });

// const styles = StyleSheet.create({
//   contentContainer: {
//     paddingBottom: 40,
//   },
//   imageSection: {
//     position: 'relative',
//   },
//   productImage: {
//     width: screenWidth,
//     height: 250,
//   },
//   imageCounter: {
//     position: 'absolute',
//     top: 15,
//     right: 15,
//     backgroundColor: 'rgba(0, 0, 0, 0.6)',
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 20,
//   },
//   imageCounterText: {
//     color: '#fff',
//     fontSize: 14,
//     fontWeight: 'bold',
//   },
//   productInfo: {
//     padding: 20,
//   },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'flex-start',
//     marginBottom: 10,
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#333',
//     flex: 1,
//     marginRight: 10,
//   },
//   typeBadge: {
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 20,
//   },
//   saleBadge: {
//     backgroundColor: '#ff4444',
//   },
//   swapBadge: {
//     backgroundColor: '#4CAF50',
//   },
//   bothBadge: {
//     backgroundColor: '#FF9800',
//   },
//   badgeText: {
//     color: '#fff',
//     fontSize: 12,
//     fontWeight: 'bold',
//   },
//   price: {
//     fontSize: 28,
//     fontWeight: 'bold',
//     color: COLORS.gold,
//     marginBottom: 20,
//   },
//   infoRow: {
//     marginBottom: 15,
//   },
//   label: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     color: '#333',
//     marginBottom: 5,
//   },
//   value: {
//     fontSize: 16,
//     color: '#666',
//     lineHeight: 24,
//   },
//   actionButtons: {
//     flexDirection: 'row',
//     paddingHorizontal: 20,
//     gap: 10,
//   },
//   actionButton: {
//     flex: 1,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 15,
//     borderRadius: 12,
//     gap: 8,
//   },
//   buttonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
//   buyButton: {
//     backgroundColor: COLORS.gold,
//   },
//   swapButton: {
//     backgroundColor: '#4CAF50',
//   },
//   chatButton: {
//     backgroundColor: '#2196F3',
//   },
//   editButton: {
//     backgroundColor: '#FF9800',
//   },
//   deleteButton: {
//     backgroundColor: '#f44336',
//   },
//   zoomModalContainer: {
//     flex: 1,
//     backgroundColor: 'rgba(0, 0, 0, 0.95)',
//     justifyContent: 'center',
//   },
//   closeButton: {
//     position: 'absolute',
//     top: 60,
//     right: 20,
//     zIndex: 1,
//     padding: 10,
//   },
//   zoomImage: {
//     width: screenWidth,
//     height: screenHeight,
//   },
// });

// export default ProductSheet;