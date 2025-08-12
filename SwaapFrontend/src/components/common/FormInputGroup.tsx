// components/common/FormInputGroup.tsx
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '@constants/colors';

interface FormInputGroupProps extends TextInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  showEditButton?: boolean;
  onEdit?: () => void;
  disabled?: boolean;
  customStyle?: any;
}

export const FormInputGroup: React.FC<FormInputGroupProps> = ({
  label,
  value,
  onChangeText,
  showEditButton = false,
  onEdit,
  disabled = false,
  customStyle,
  ...textInputProps
}) => {
  return (
    <View style={styles.inputGroup}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {showEditButton && onEdit && (
          <TouchableOpacity onPress={onEdit} style={styles.editButton}>
            <Ionicons name="pencil" size={16} color={COLORS.gold} />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>
      <TextInput
        style={[
          styles.input,
          disabled && styles.disabledInput,
          customStyle,
        ]}
        value={value}
        onChangeText={onChangeText}
        editable={!disabled}
        placeholderTextColor="#666"
        {...textInputProps}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  inputGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editButtonText: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#1e1e1e',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  disabledInput: {
    backgroundColor: '#2a2a2a',
    color: '#999',
  },
});