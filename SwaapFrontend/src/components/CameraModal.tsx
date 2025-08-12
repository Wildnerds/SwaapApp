// import React, { useRef } from 'react';
// import { Modal, View, Pressable } from 'react-native';
// import { Camera, CameraType } from 'expo-camera';
// import Ionicons from 'react-native-vector-icons/Ionicons';
// import styles from '../screens/HomeScreen.styles';

// type Props = {
//   visible: boolean;
//   onClose: () => void;
//   type?: CameraType;
// };

// export default function CameraModal({ visible, onClose, type = CameraType.back }: Props) {
//   const cameraRef = useRef<Camera>(null);

//   const handleTakePicture = async () => {
//     if (cameraRef.current) {
//       const photo = await cameraRef.current.takePictureAsync();
//       console.log('📸 Photo taken:', photo.uri);
//       onClose();
//     }
//   };

//   return (
//     <Modal visible={visible} animationType="slide">
//       <Camera
//         ref={cameraRef}
//         style={{ flex: 1 }}
//         type={type}
//         ratio="16:9"
//       >
//         <View style={styles.cameraControls}>
//           <Pressable onPress={handleTakePicture}>
//             <Ionicons name="radio-button-on" size={70} color="white" />
//           </Pressable>
//           <Pressable onPress={onClose}>
//             <Ionicons name="close" size={40} color="white" />
//           </Pressable>
//         </View>
//       </Camera>
//     </Modal>
//   );
// }
