// components/home/SearchResultsHeader.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SearchResultsHeaderProps {
  searchTerm: string;
  resultCount: number;
  searching: boolean;
  error?: string | null;
  onClear: () => void;
}

export const SearchResultsHeader: React.FC<SearchResultsHeaderProps> = ({
  searchTerm,
  resultCount,
  searching,
  error,
  onClear,
}) => {
  if (searchTerm.length < 2) return null;
  
  return (
    <View style={styles.searchHeader}>
      <View style={styles.searchHeaderContent}>
        <Text style={styles.searchResultsText}>
          {searching ? 'Searching...' : `${resultCount} results for "${searchTerm}"`}
        </Text>
        <TouchableOpacity onPress={onClear} style={styles.clearSearchButton}>
          <Ionicons name="close" size={16} color="#666" />
        </TouchableOpacity>
      </View>
      {error && (
        <Text style={styles.searchErrorText}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  searchHeader: {
    paddingHorizontal: 4,
    paddingBottom: 16,
  },
  searchHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchResultsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  clearSearchButton: {
    padding: 4,
  },
  searchErrorText: {
    color: '#FF4444',
    fontSize: 14,
    marginTop: 4,
  },
});