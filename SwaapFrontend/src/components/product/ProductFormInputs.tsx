// components/product/ProductFormInputs.tsx
import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { CustomInput } from '../common/CustomInput';

interface ProductFormInputsProps {
  title: string;
  price: string;
  description: string;
  onTitleChange: (text: string) => void;
  onPriceChange: (text: string) => void;
  onDescriptionChange: (text: string) => void;
}

export const ProductFormInputs: React.FC<ProductFormInputsProps> = ({
  title,
  price,
  description,
  onTitleChange,
  onPriceChange,
  onDescriptionChange,
}) => {
  return (
    <View style={styles.container}>
      <CustomInput
        placeholder="Item Title"
        value={title}
        onChangeText={onTitleChange}
        customStyle={styles.input}
      />
      
      <CustomInput
        placeholder="₦ Price"
        value={price}
        onChangeText={onPriceChange}
        keyboardType="numeric"
        customStyle={styles.input}
      />
      
      <TextInput 
        style={styles.textArea} 
        placeholder="Describe your item..." 
        value={description} 
        onChangeText={onDescriptionChange} 
        multiline 
        maxLength={1000} 
        placeholderTextColor="#888" 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
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
});