// components/common/DropdownSelector.tsx
import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  FlatList, 
  StyleSheet 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '@constants/colors';

interface DropdownSelectorProps {
  label: string;
  value: string;
  placeholder: string;
  options: string[];
  visible: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
}

export const DropdownSelector: React.FC<DropdownSelectorProps> = ({
  label,
  value,
  placeholder,
  options,
  visible,
  onToggle,
  onSelect,
}) => {
  const handleSelect = (selectedValue: string) => {
    onSelect(selectedValue);
    onToggle();
  };

  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.dropdown} onPress={onToggle}>
        <Text style={styles.dropdownText}>{value || placeholder}</Text>
        <Ionicons name="chevron-down" size={18} color={COLORS.gold} />
      </TouchableOpacity>

      <Modal transparent visible={visible} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={onToggle}>
          <View style={styles.modalContent}>
            <FlatList
              data={options}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
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
});