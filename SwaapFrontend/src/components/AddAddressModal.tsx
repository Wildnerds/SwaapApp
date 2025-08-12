// components/AddAddressModal.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '@constants/colors';
import Button from '@components/Button';

interface ShippingAddress {
  _id?: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  isDefault?: boolean;
}

interface AddAddressModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (address: ShippingAddress) => Promise<boolean>;
}

const AddAddressModal: React.FC<AddAddressModalProps> = ({
  visible,
  onClose,
  onSave,
}) => {
  const [loading, setLoading] = useState(false);
  const [newAddress, setNewAddress] = useState<ShippingAddress>({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
  });

  const handleSave = async () => {
    if (!newAddress.name || !newAddress.phone || !newAddress.address || !newAddress.city || !newAddress.state) {
      Alert.alert('Please fill all address fields');
      return;
    }

    setLoading(true);
    const success = await onSave(newAddress);
    setLoading(false);
    
    if (success) {
      // Reset form
      setNewAddress({
        name: '',
        phone: '',
        address: '',
        city: '',
        state: '',
      });
    }
  };

  const handleClose = () => {
    setNewAddress({
      name: '',
      phone: '',
      address: '',
      city: '',
      state: '',
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Address</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#666"
              value={newAddress.name}
              onChangeText={(text) => setNewAddress(prev => ({ ...prev, name: text }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              placeholderTextColor="#666"
              value={newAddress.phone}
              onChangeText={(text) => setNewAddress(prev => ({ ...prev, phone: text }))}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Street Address"
              placeholderTextColor="#666"
              value={newAddress.address}
              onChangeText={(text) => setNewAddress(prev => ({ ...prev, address: text }))}
              multiline
              numberOfLines={3}
            />
            <TextInput
              style={styles.input}
              placeholder="City"
              placeholderTextColor="#666"
              value={newAddress.city}
              onChangeText={(text) => setNewAddress(prev => ({ ...prev, city: text }))}
            />
            <TextInput
              style={styles.input}
              placeholder="State"
              placeholderTextColor="#666"
              value={newAddress.state}
              onChangeText={(text) => setNewAddress(prev => ({ ...prev, state: text }))}
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              title={loading ? 'Saving...' : 'Save Address'}
              onPress={handleSave}
              filled
              disabled={loading}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalBody: {
    maxHeight: 300,
  },
  input: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalFooter: {
    marginTop: 20,
  },
});

export default AddAddressModal;