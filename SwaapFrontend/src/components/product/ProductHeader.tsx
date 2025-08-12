// components/product/ProductHeader.tsx
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '@constants/colors';

interface ProductHeaderProps {
  title: string;
  onBack: () => void;
  onRefresh?: () => void;
  onDelete?: () => void;
  loading?: boolean;
  showActions?: boolean;
}

export const ProductHeader: React.FC<ProductHeaderProps> = ({
  title,
  onBack,
  onRefresh,
  onDelete,
  loading = false,
  showActions = true,
}) => {
  return (
    <>
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.gold} />
        </TouchableOpacity>
        
        {showActions && (
          <View style={styles.headerActions}>
            {onRefresh && (
              <TouchableOpacity 
                onPress={onRefresh} 
                style={styles.refreshButton} 
                disabled={loading}
              >
                <Ionicons name="refresh-outline" size={24} color={COLORS.gold} />
              </TouchableOpacity>
            )}
            
            {onDelete && (
              <TouchableOpacity 
                onPress={onDelete} 
                style={styles.deleteButton} 
                disabled={loading}
              >
                <Ionicons name="trash-outline" size={24} color="#ff4444" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <Text style={styles.header}>{title}</Text>
    </>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: { 
    backgroundColor: '#1E1E1E', 
    padding: 8, 
    borderRadius: 8, 
    borderColor: COLORS.gold, 
    borderWidth: 1 
  },
  refreshButton: {
    backgroundColor: '#1E1E1E',
    padding: 8,
    borderRadius: 8,
    borderColor: COLORS.gold,
    borderWidth: 1,
  },
  deleteButton: {
    backgroundColor: '#1E1E1E',
    padding: 8,
    borderRadius: 8,
    borderColor: '#ff4444',
    borderWidth: 1,
  },
  header: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: COLORS.gold, 
    marginBottom: 20, 
    textAlign: 'center' 
  },
});