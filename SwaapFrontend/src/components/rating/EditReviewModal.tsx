import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StarRating } from './StarRating';
import COLORS from '@constants/colors';

interface EditReviewModalProps {
  visible: boolean;
  onClose: () => void;
  onUpdate: (rating: number, comment: string) => Promise<void>;
  onDelete?: () => Promise<void>;
  initialRating: number;
  initialComment: string;
  title: string;
  showDelete?: boolean;
}

export function EditReviewModal({
  visible,
  onClose,
  onUpdate,
  onDelete,
  initialRating,
  initialComment,
  title,
  showDelete = true,
}: EditReviewModalProps) {
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleUpdate = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    if (comment.trim().length < 10) {
      Alert.alert('Error', 'Comment must be at least 10 characters long');
      return;
    }

    try {
      setSubmitting(true);
      await onUpdate(rating, comment.trim());
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    Alert.alert(
      'Delete Review',
      'Are you sure you want to delete this review? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await onDelete();
              onClose();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete review');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleClose = () => {
    // Reset to initial values when closing
    setRating(initialRating);
    setComment(initialComment);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Review</Text>
              <TouchableOpacity onPress={handleClose} disabled={submitting || deleting}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalSubtitle}>{title}</Text>

              {/* Rating Section */}
              <View style={styles.ratingSection}>
                <Text style={styles.ratingLabel}>Your Rating</Text>
                <StarRating
                  rating={rating}
                  size={32}
                  onRatingPress={setRating}
                  interactive={!submitting && !deleting}
                />
              </View>

              {/* Comment Section */}
              <View style={styles.commentSection}>
                <Text style={styles.commentLabel}>Your Review (minimum 10 characters)</Text>
                <TextInput
                  style={[styles.commentInput, (submitting || deleting) && styles.disabled]}
                  multiline
                  numberOfLines={4}
                  value={comment}
                  onChangeText={setComment}
                  placeholder="Share your experience..."
                  placeholderTextColor="#666"
                  textAlignVertical="top"
                  editable={!submitting && !deleting}
                  maxLength={500}
                  autoCorrect={true}
                  spellCheck={true}
                />
                
                {/* Emoji Quick Access */}
                <View style={styles.emojiContainer}>
                  <Text style={styles.emojiLabel}>Quick reactions:</Text>
                  <View style={styles.emojiRow}>
                    {['😊', '👍', '❤️', '🔥', '👌', '🎉', '😍', '💯'].map((emoji) => (
                      <TouchableOpacity
                        key={emoji}
                        style={[styles.emojiButton, (submitting || deleting) && styles.disabled]}
                        onPress={() => setComment(prev => prev + emoji)}
                        disabled={submitting || deleting}
                      >
                        <Text style={styles.emoji}>{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                
                <Text style={styles.characterCount}>
                  {comment.length}/500 characters
                </Text>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {showDelete && onDelete && (
                <TouchableOpacity
                  style={[styles.deleteButton, deleting && styles.disabledButton]}
                  onPress={handleDelete}
                  disabled={submitting || deleting}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="trash" size={18} color="#fff" />
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.updateButton, submitting && styles.disabledButton]}
                onPress={handleUpdate}
                disabled={submitting || deleting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.updateButtonText}>Update Review</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 24,
  },
  ratingSection: {
    marginBottom: 24,
  },
  ratingLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  commentSection: {
    marginBottom: 24,
  },
  commentLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  commentInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 16,
    color: '#fff',
    fontSize: 14,
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#333',
  },
  disabled: {
    opacity: 0.6,
  },
  characterCount: {
    color: '#666',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  emojiContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  emojiLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  emojiButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  emoji: {
    fontSize: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteButton: {
    backgroundColor: '#E53935',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    flex: 1,
  },
  updateButton: {
    backgroundColor: COLORS.gold,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    flex: 2,
  },
  disabledButton: {
    opacity: 0.6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});