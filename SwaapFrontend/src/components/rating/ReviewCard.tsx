// components/rating/ReviewCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StarRating } from './StarRating';

interface Review {
  _id: string;
  rating: number;
  comment: string;
  reviewerName: string;
  createdAt: string;
  updatedAt?: string;
  helpful?: number;
  userHelpfulVote?: boolean;
  isOwner?: boolean;
}

interface ReviewCardProps {
  review: Review;
  onHelpfulPress?: (reviewId: string) => void;
  onEditPress?: (reviewId: string) => void;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  onHelpfulPress,
  onEditPress,
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {review.reviewerName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.nameAndDate}>
            <Text style={styles.reviewerName}>{review.reviewerName}</Text>
            <Text style={styles.date}>{formatDate(review.createdAt)}</Text>
          </View>
        </View>
        <StarRating rating={review.rating} size={16} />
      </View>

      <Text style={styles.comment}>{review.comment}</Text>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.helpfulButton}
          onPress={() => onHelpfulPress?.(review._id)}
        >
          <Ionicons
            name={review.userHelpfulVote ? 'thumbs-up' : 'thumbs-up-outline'}
            size={16}
            color={review.userHelpfulVote ? '#FFC107' : '#666'}
          />
          <Text style={[
            styles.helpfulText,
            review.userHelpfulVote && styles.helpfulTextActive
          ]}>
            Helpful {review.helpful ? `(${review.helpful})` : ''}
          </Text>
        </TouchableOpacity>

        {/* Show edit button for owner */}
        {review.isOwner && onEditPress && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => onEditPress(review._id)}
          >
            <Ionicons name="pencil" size={16} color="#FFC107" />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        )}

        {/* Show if edited */}
        {review.updatedAt && review.updatedAt !== review.createdAt && (
          <Text style={styles.editedText}>• edited</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFC107',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  nameAndDate: {
    flex: 1,
  },
  reviewerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  date: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  comment: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  helpfulText: {
    color: '#666',
    fontSize: 12,
    marginLeft: 6,
  },
  helpfulTextActive: {
    color: '#FFC107',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  editText: {
    color: '#FFC107',
    fontSize: 12,
    marginLeft: 4,
  },
  editedText: {
    color: '#666',
    fontSize: 10,
    fontStyle: 'italic',
    marginLeft: 'auto',
  },
});