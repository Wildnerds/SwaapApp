// components/profile/ProfileAvatar.tsx
import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '@constants/colors';

interface ProfileAvatarProps {
  photoURL?: string;
  email?: string;
  onChangePhoto: () => void;
  size?: number;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  photoURL,
  email = '',
  onChangePhoto,
  size = 80,
}) => {
  const avatarUri = photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(email)}&background=random`;

  return (
    <View style={styles.container}>
      <View style={[styles.avatarContainer, { width: size, height: size }]}>
        <Image
          source={{ uri: avatarUri }}
          style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
        />
        <TouchableOpacity 
          style={styles.changePhotoButton}
          onPress={onChangePhoto}
        >
          <Ionicons name="camera" size={16} color="#121212" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    borderWidth: 2,
    borderColor: COLORS.gold,
  },
  changePhotoButton: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: COLORS.gold,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#121212',
  },
});