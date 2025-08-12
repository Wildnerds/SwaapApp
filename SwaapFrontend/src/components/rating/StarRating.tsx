// components/rating/StarRating.tsx
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: number;
  interactive?: boolean;
  onRatingPress?: (rating: number) => void;
  color?: string;
  emptyColor?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  maxRating = 5,
  size = 20,
  interactive = false,
  onRatingPress,
  color = '#FFC107',
  emptyColor = '#666',
}) => {
  const renderStar = (index: number) => {
    const isFilled = index < rating;
    const isHalfFilled = index + 0.5 === rating;
    
    let starName: any = 'star-outline';
    if (isFilled) {
      starName = 'star';
    } else if (isHalfFilled) {
      starName = 'star-half';
    }

    const StarComponent = interactive ? TouchableOpacity : View;

    return (
      <StarComponent
        key={index}
        onPress={() => interactive && onRatingPress?.(index + 1)}
        style={styles.starContainer}
      >
        <Ionicons
          name={starName}
          size={size}
          color={isFilled || isHalfFilled ? color : emptyColor}
        />
      </StarComponent>
    );
  };

  return (
    <View style={styles.container}>
      {Array.from({ length: maxRating }, (_, index) => renderStar(index))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starContainer: {
    marginRight: 2,
  },
});