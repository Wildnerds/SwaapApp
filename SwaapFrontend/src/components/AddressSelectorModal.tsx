// components/AddressSelectorModal.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '@constants/colors';

interface ShippingAddress {
  _id?: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  isDefault?: boolean;
}

interface AddressSelectorModalProps {
  visible: boolean;
  addresses: ShippingAddress[];
  selectedAddress: ShippingAddress | null;
  onClose: () => void;
  onSelectAddress: (address: ShippingAddress) => void;
  onAddNew: () => void;
  onDelete: (addressId: string) => void;
}

const AddressSelectorModal: React.FC<AddressSelectorModalProps> = ({
  visible,
  addresses,
  selectedAddress,
  onClose,
  onSelectAddress,
  onAddNew,
  onDelete,
}) => {
  const handleDelete = (addressId: string) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => onDelete(addressId) 
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Address</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {addresses.map((address) => (
              <TouchableOpacity
                key={address._id}
                style={[
                  styles.addressItem,
                  selectedAddress?._id === address._id && styles.selectedAddressItem,
                ]}
                onPress={() => onSelectAddress(address)}
              >
                <View style={styles.addressItemContent}>
                  <Text style={styles.addressItemName}>{address.name}</Text>
                  <Text style={styles.addressItemPhone}>{address.phone}</Text>
                  <Text style={styles.addressItemText}>
                    {address.address}, {address.city}, {address.state}
                  </Text>
                  {address.isDefault && (
                    <Text style={styles.defaultBadge}>Default</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(address._id!)}
                >
                  <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.addNewAddressButton}
              onPress={onAddNew}
            >
              <Ionicons name="add-circle-outline" size={24} color={COLORS.gold} />
              <Text style={styles.addNewAddressText}>Add New Address</Text>
            </TouchableOpacity>
          </ScrollView>
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
    maxHeight: 400,
  },
  addressItem: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  selectedAddressItem: {
    borderColor: COLORS.gold,
    backgroundColor: '#333',
  },
  addressItemContent: {
    flex: 1,
  },
  addressItemName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addressItemPhone: {
    color: '#CCCCCC',
    fontSize: 14,
    marginTop: 2,
  },
  addressItemText: {
    color: '#CCCCCC',
    fontSize: 14,
    marginTop: 4,
  },
  defaultBadge: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  deleteButton: {
    padding: 8,
  },
  addNewAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderStyle: 'dashed',
  },
  addNewAddressText: {
    color: COLORS.gold,
    fontSize: 16,
    marginLeft: 10,
    fontWeight: 'bold',
  },
});

export default AddressSelectorModal;