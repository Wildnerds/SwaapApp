// components/profile/ProfileHeader.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ProfileAvatar } from './ProfileAvatar';
import { VerificationBadge } from '../verification/VerificationBadge';
import COLORS from '@/constants/colors';

interface ProfileHeaderProps {
  user: any;
  onChangePhoto: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  user,
  onChangePhoto
}) => {
  return (
    <View style={styles.container}>
      <ProfileAvatar
        photoURL={user?.photoURL}
        email={user?.email}
        onChangePhoto={onChangePhoto}
      />
      
      {user && (
        <View style={styles.verificationBadgeContainer}>
          <VerificationBadge 
            user={user} 
            size="large" 
            showText={true}
            style={styles.verificationBadge}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    position: 'relative',
    marginBottom: 20,
  },
  verificationBadgeContainer: {
    position: 'absolute',
    bottom: -10,
    alignItems: 'center',
  },
  verificationBadge: {
    backgroundColor: '#121212',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
});