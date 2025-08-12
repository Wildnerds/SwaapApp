// components/search/SearchFiltersModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// Removed Slider dependency - using text inputs for price range

interface SearchFilters {
  categories: string[];
  priceRange: {
    min: number;
    max: number;
  };
  condition: string[];
  type: string[];
  sortBy: 'newest' | 'oldest' | 'price-low' | 'price-high' | 'rating' | null;
}

interface SearchFiltersModalProps {
  visible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: SearchFilters) => void;
  initialFilters: SearchFilters;
}

const CATEGORIES = [
  'AUTOMOTIVE', 'ELECTRONICS', 'HOME & KITCHEN', 'SPORTS & OUTDOOR',
  'FASHION', 'BOOKS', 'BEAUTY', 'FOOD', 'TOYS & GAMES', 
  'HEALTH & PERSONAL CARE', 'PET SUPPLIES', 'OFFICE PRODUCTS',
  'TOOLS & HOME IMPROVEMENT', 'BABY PRODUCTS', 'GARDEN & OUTDOORS',
  'VIDEO GAMES', 'MUSIC & AUDIO', 'JEWELRY', 'TRAVEL & LUGGAGE'
];

const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Poor'];
const TYPES = ['sale', 'swap', 'both'];
const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest First' },
  { key: 'oldest', label: 'Oldest First' },
  { key: 'price-low', label: 'Price: Low to High' },
  { key: 'price-high', label: 'Price: High to Low' },
  { key: 'rating', label: 'Highest Rated' },
];

export const SearchFiltersModal: React.FC<SearchFiltersModalProps> = ({
  visible,
  onClose,
  onApplyFilters,
  initialFilters,
}) => {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [priceInputs, setPriceInputs] = useState({
    min: initialFilters.priceRange.min.toString(),
    max: initialFilters.priceRange.max.toString(),
  });

  useEffect(() => {
    setFilters(initialFilters);
    setPriceInputs({
      min: initialFilters.priceRange.min.toString(),
      max: initialFilters.priceRange.max.toString(),
    });
  }, [initialFilters]);

  const toggleCategory = (category: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const toggleCondition = (condition: string) => {
    setFilters(prev => ({
      ...prev,
      condition: prev.condition.includes(condition)
        ? prev.condition.filter(c => c !== condition)
        : [...prev.condition, condition]
    }));
  };

  const toggleType = (type: string) => {
    setFilters(prev => ({
      ...prev,
      type: prev.type.includes(type)
        ? prev.type.filter(t => t !== type)
        : [...prev.type, type]
    }));
  };

  const updatePriceRange = () => {
    const min = Math.max(0, parseInt(priceInputs.min) || 0);
    const max = Math.max(min, parseInt(priceInputs.max) || 1000000);
    
    setFilters(prev => ({
      ...prev,
      priceRange: { min, max }
    }));
  };

  const clearFilters = () => {
    const cleared: SearchFilters = {
      categories: [],
      priceRange: { min: 0, max: 1000000 },
      condition: [],
      type: [],
      sortBy: null,
    };
    setFilters(cleared);
    setPriceInputs({ min: '0', max: '1000000' });
  };

  const applyFilters = () => {
    updatePriceRange();
    onApplyFilters(filters);
    onClose();
  };

  const renderFilterSection = (
    title: string,
    options: string[],
    selectedOptions: string[],
    onToggle: (option: string) => void
  ) => (
    <View style={styles.filterSection}>
      <Text style={styles.filterTitle}>{title}</Text>
      <View style={styles.filterOptions}>
        {options.map(option => (
          <TouchableOpacity
            key={option}
            style={[
              styles.filterOption,
              selectedOptions.includes(option) && styles.filterOptionSelected
            ]}
            onPress={() => onToggle(option)}
          >
            <Text style={[
              styles.filterOptionText,
              selectedOptions.includes(option) && styles.filterOptionTextSelected
            ]}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Filters</Text>
          <TouchableOpacity onPress={clearFilters} style={styles.clearButton}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Price Range */}
          <View style={styles.filterSection}>
            <Text style={styles.filterTitle}>Price Range (₦)</Text>
            <View style={styles.priceInputs}>
              <View style={styles.priceInputContainer}>
                <Text style={styles.priceLabel}>Min</Text>
                <TextInput
                  style={styles.priceInput}
                  value={priceInputs.min}
                  onChangeText={(text) => setPriceInputs(prev => ({ ...prev, min: text }))}
                  onEndEditing={updatePriceRange}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#666"
                />
              </View>
              <Text style={styles.priceSeparator}>—</Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.priceLabel}>Max</Text>
                <TextInput
                  style={styles.priceInput}
                  value={priceInputs.max}
                  onChangeText={(text) => setPriceInputs(prev => ({ ...prev, max: text }))}
                  onEndEditing={updatePriceRange}
                  keyboardType="numeric"
                  placeholder="1000000"
                  placeholderTextColor="#666"
                />
              </View>
            </View>
          </View>

          {/* Categories */}
          {renderFilterSection('Categories', CATEGORIES, filters.categories, toggleCategory)}

          {/* Condition */}
          {renderFilterSection('Condition', CONDITIONS, filters.condition, toggleCondition)}

          {/* Type */}
          {renderFilterSection('Type', TYPES, filters.type, toggleType)}

          {/* Sort By */}
          <View style={styles.filterSection}>
            <Text style={styles.filterTitle}>Sort By</Text>
            <View style={styles.filterOptions}>
              {SORT_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.filterOption,
                    filters.sortBy === option.key && styles.filterOptionSelected
                  ]}
                  onPress={() => setFilters(prev => ({ 
                    ...prev, 
                    sortBy: prev.sortBy === option.key ? null : option.key as any 
                  }))}
                >
                  <Text style={[
                    styles.filterOptionText,
                    filters.sortBy === option.key && styles.filterOptionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  clearButton: {
    padding: 4,
  },
  clearText: {
    color: '#FFC107',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#2a2a2a',
  },
  filterOptionSelected: {
    backgroundColor: '#FFC107',
    borderColor: '#FFC107',
  },
  filterOptionText: {
    color: '#fff',
    fontSize: 14,
  },
  filterOptionTextSelected: {
    color: '#000',
    fontWeight: '500',
  },
  priceInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceInputContainer: {
    flex: 1,
  },
  priceLabel: {
    color: '#666',
    fontSize: 12,
    marginBottom: 4,
  },
  priceInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  priceSeparator: {
    color: '#666',
    fontSize: 16,
  },
  footer: {
    padding: 16,
  },
  applyButton: {
    backgroundColor: '#FFC107',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});