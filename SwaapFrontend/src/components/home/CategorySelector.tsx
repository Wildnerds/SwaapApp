// components/home/CategorySelector.tsx - ULTRA STABLE VERSION
import React, { memo, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface Category {
  key: string;
  name: string;
  icon: string;
}

interface CategorySelectorProps {
  categories: Category[];
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
}

// ✅ ULTRA FIX: Create completely isolated category item
const CategoryItem = memo(({ 
  category, 
  isSelected, 
  onPress 
}: { 
  category: Category; 
  isSelected: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[
      categoryStyles.categoryButton,
      isSelected && categoryStyles.selectedCategoryButton,
    ]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Text
      style={[
        categoryStyles.categoryText,
        isSelected && categoryStyles.selectedCategoryText,
      ]}
    >
      {category.name}
    </Text>
  </TouchableOpacity>
));

CategoryItem.displayName = 'CategoryItem';

export const CategorySelector = memo<CategorySelectorProps>(({
  categories,
  selectedCategory,
  onCategorySelect,
}) => {
  // ✅ ULTRA FIX: Use ref to maintain scroll position
  const scrollViewRef = useRef<ScrollView>(null);

  return (
    <View style={categoryStyles.categoriesContainer}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={categoryStyles.categoriesScrollContent}
        // ✅ ULTRA FIX: Optimize scroll behavior
        scrollEventThrottle={16}
        decelerationRate="normal"
        bounces={true}
        // ✅ Prevent any auto-scrolling behavior
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={false}
        // ✅ Add contentInset to prevent edge issues
        contentInset={{ left: 0, right: 16 }}
      >
        {categories.map((category) => (
          <CategoryItem
            key={`category-${category.key}`} // ✅ More specific key
            category={category}
            isSelected={selectedCategory === category.key}
            onPress={() => onCategorySelect(category.key)}
          />
        ))}
      </ScrollView>
    </View>
  );
});

CategorySelector.displayName = 'CategorySelector';

const categoryStyles = StyleSheet.create({
  categoriesContainer: {
    marginBottom: 20,
  },
  categoriesScrollContent: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingRight: 20, // ✅ Extra padding at end
  },
  categoryButton: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    // ✅ Add minimum width to prevent layout shifts
    minWidth: 60,
    alignItems: 'center',
  },
  selectedCategoryButton: {
    backgroundColor: '#FFC107',
  },
  categoryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  selectedCategoryText: {
    color: '#000',
  },
});