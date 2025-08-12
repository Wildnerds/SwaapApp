// components/profile/EditProfileHeader.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '@constants/colors';

interface EditProfileHeaderProps {
  onCancel: () => void;
  onSave: () => void;
  isSaving: boolean;
  title?: string;
}

export const EditProfileHeader: React.FC<EditProfileHeaderProps> = ({
  onCancel,
  onSave,
  isSaving,
  title = "Edit Profile",
}) => {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onCancel} style={styles.headerButton}>
        <Ionicons name="chevron-back" size={24} color="#fff" />
        <Text style={styles.headerButtonText}>Cancel</Text>
      </TouchableOpacity>
      
      <Text style={styles.headerTitle}>{title}</Text>
      
      <TouchableOpacity 
        onPress={onSave} 
        style={styles.headerButton}
        disabled={isSaving}
      >
        <Text style={[styles.headerButtonText, { color: COLORS.gold }]}>
          {isSaving ? 'Saving...' : 'Save'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 4,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});