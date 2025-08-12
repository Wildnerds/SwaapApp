// components/ai/AIValueAssessment.tsx - AI-powered value estimation
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '@types';
import { apiClient } from '@config/index';
import { logDebug, logInfo, logError } from '@/utils/logger';

interface AIValueAssessmentProps {
  product: Product;
  showButton?: boolean; // Show as button trigger
  showInline?: boolean; // Show assessment inline
  onValueReceived?: (assessment: any) => void;
}

interface ValueAssessment {
  originalPrice: number;
  estimatedValue: number;
  difference: number;
  differencePercent: string;
  recommendation: string;
}

export const AIValueAssessment: React.FC<AIValueAssessmentProps> = ({
  product,
  showButton = true,
  showInline = false,
  onValueReceived
}) => {
  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState<ValueAssessment | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchValueAssessment = async () => {
    setLoading(true);
    
    try {
      logDebug('Fetching AI value assessment for product', { productId: product._id });
      
      const response = await apiClient.get(`/api/ai/value/${product._id}`);
      
      if (response.success) {
        const assessmentData = {
          originalPrice: response.originalPrice,
          estimatedValue: response.estimatedValue,
          difference: response.difference,
          differencePercent: response.differencePercent,
          recommendation: response.recommendation
        };
        
        setAssessment(assessmentData);
        
        if (onValueReceived) {
          onValueReceived(assessmentData);
        }
        
        if (showButton && !showInline) {
          setModalVisible(true);
        }
        
        logInfo('AI value assessment received');
      } else {
        Alert.alert('Error', 'Failed to get value assessment');
      }
    } catch (err: any) {
      logError('Value assessment error', err, { productId: product._id });
      Alert.alert('Error', 'Value assessment service temporarily unavailable');
    } finally {
      setLoading(false);
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    if (recommendation.toLowerCase().includes('lower')) return '#FF6B6B';
    if (recommendation.toLowerCase().includes('good')) return '#4ECDC4';
    return '#FFD700';
  };

  const getRecommendationIcon = (recommendation: string) => {
    if (recommendation.toLowerCase().includes('lower')) return 'trending-down';
    if (recommendation.toLowerCase().includes('good')) return 'checkmark-circle';
    return 'information-circle';
  };

  const getDifferenceDisplay = (difference: number, differencePercent: string) => {
    const isHigher = difference < 0; // Negative difference means estimated is higher than original
    const absPercent = Math.abs(parseFloat(differencePercent));
    
    return {
      color: isHigher ? '#4ECDC4' : '#FF6B6B',
      text: `${isHigher ? '+' : '-'}${absPercent}%`,
      icon: isHigher ? 'trending-up' : 'trending-down'
    };
  };

  if (showInline && assessment) {
    const diffDisplay = getDifferenceDisplay(assessment.difference, assessment.differencePercent);
    
    return (
      <View style={styles.inlineContainer}>
        <View style={styles.inlineHeader}>
          <Ionicons name="analytics-outline" size={16} color="#4ECDC4" />
          <Text style={styles.inlineTitle}>AI Value Assessment</Text>
        </View>
        
        <View style={styles.inlineContent}>
          <View style={styles.priceComparison}>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Listed</Text>
              <Text style={styles.originalPrice}>
                ₦{assessment.originalPrice.toLocaleString()}
              </Text>
            </View>
            
            <Ionicons name="arrow-forward" size={16} color="#666" />
            
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>AI Estimated</Text>
              <Text style={styles.estimatedPrice}>
                ₦{assessment.estimatedValue.toLocaleString()}
              </Text>
            </View>
            
            <View style={[styles.differenceTag, { backgroundColor: diffDisplay.color + '20' }]}>
              <Ionicons name={diffDisplay.icon} size={12} color={diffDisplay.color} />
              <Text style={[styles.differenceText, { color: diffDisplay.color }]}>
                {diffDisplay.text}
              </Text>
            </View>
          </View>
          
          <View style={[
            styles.recommendationBadge, 
            { backgroundColor: getRecommendationColor(assessment.recommendation) + '20' }
          ]}>
            <Ionicons 
              name={getRecommendationIcon(assessment.recommendation)} 
              size={14} 
              color={getRecommendationColor(assessment.recommendation)} 
            />
            <Text style={[
              styles.recommendationText, 
              { color: getRecommendationColor(assessment.recommendation) }
            ]}>
              {assessment.recommendation}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (!showButton) return null;

  return (
    <>
      <TouchableOpacity 
        style={[styles.assessButton, loading && styles.assessButtonDisabled]}
        onPress={fetchValueAssessment}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Ionicons name="analytics-outline" size={16} color="#ffffff" />
        )}
        <Text style={styles.assessButtonText}>
          {loading ? 'Assessing...' : 'AI Value Check'}
        </Text>
      </TouchableOpacity>

      {/* Value Assessment Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Ionicons name="analytics" size={24} color="#4ECDC4" />
                <Text style={styles.modalTitle}>AI Value Assessment</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {assessment && (
              <View style={styles.assessmentDetails}>
                <Text style={styles.productTitle} numberOfLines={2}>
                  {product.title}
                </Text>
                
                <View style={styles.valuesContainer}>
                  <View style={styles.valueRow}>
                    <Text style={styles.valueLabel}>Listed Price</Text>
                    <Text style={styles.originalPriceModal}>
                      ₦{assessment.originalPrice.toLocaleString()}
                    </Text>
                  </View>
                  
                  <View style={styles.valueRow}>
                    <Text style={styles.valueLabel}>AI Estimated Value</Text>
                    <Text style={styles.estimatedPriceModal}>
                      ₦{assessment.estimatedValue.toLocaleString()}
                    </Text>
                  </View>
                  
                  {(() => {
                    const diffDisplay = getDifferenceDisplay(assessment.difference, assessment.differencePercent);
                    return (
                      <View style={styles.valueRow}>
                        <Text style={styles.valueLabel}>Difference</Text>
                        <View style={styles.differenceContainer}>
                          <Ionicons name={diffDisplay.icon} size={16} color={diffDisplay.color} />
                          <Text style={[styles.differenceValue, { color: diffDisplay.color }]}>
                            {diffDisplay.text}
                          </Text>
                        </View>
                      </View>
                    );
                  })()}
                </View>

                <View style={[
                  styles.recommendationContainer,
                  { backgroundColor: getRecommendationColor(assessment.recommendation) + '15' }
                ]}>
                  <Ionicons 
                    name={getRecommendationIcon(assessment.recommendation)} 
                    size={20} 
                    color={getRecommendationColor(assessment.recommendation)} 
                  />
                  <Text style={[
                    styles.recommendationModalText,
                    { color: getRecommendationColor(assessment.recommendation) }
                  ]}>
                    {assessment.recommendation}
                  </Text>
                </View>

                <View style={styles.disclaimerContainer}>
                  <Ionicons name="information-circle-outline" size={14} color="#666" />
                  <Text style={styles.disclaimerText}>
                    AI assessment based on category, condition, and market trends. 
                    Actual value may vary.
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  assessButton: {
    backgroundColor: '#FF9500',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 120,
  },
  assessButtonDisabled: {
    opacity: 0.6,
  },
  assessButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  
  // Inline Styles
  inlineContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
  },
  inlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  inlineTitle: {
    color: '#4ECDC4',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  inlineContent: {
    gap: 12,
  },
  priceComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceItem: {
    alignItems: 'center',
    flex: 1,
  },
  priceLabel: {
    color: '#666',
    fontSize: 12,
    marginBottom: 4,
  },
  originalPrice: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  estimatedPrice: {
    color: '#4ECDC4',
    fontSize: 16,
    fontWeight: 'bold',
  },
  differenceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  differenceText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  recommendationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  recommendationText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    flex: 1,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  closeButton: {
    padding: 4,
  },
  assessmentDetails: {
    padding: 16,
  },
  productTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  valuesContainer: {
    gap: 12,
    marginBottom: 16,
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  valueLabel: {
    color: '#666',
    fontSize: 14,
  },
  originalPriceModal: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  estimatedPriceModal: {
    color: '#4ECDC4',
    fontSize: 16,
    fontWeight: 'bold',
  },
  differenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  differenceValue: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  recommendationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  recommendationModalText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
  },
  disclaimerText: {
    color: '#666',
    fontSize: 12,
    lineHeight: 16,
    marginLeft: 6,
    flex: 1,
  },
});