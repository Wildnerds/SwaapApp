// components/ai/NegotiationAssistant.tsx - AI-powered negotiation advice
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@config/index';
import { logDebug, logInfo, logError } from '@/utils/logger';

interface NegotiationAssistantProps {
  swapId: string;
  onAdviceReceived?: (advice: any) => void;
  showInline?: boolean;
}

interface NegotiationAdvice {
  advice: string;
  currentOffer: {
    extraPayment: number;
    offeringValue: number;
    requestedValue: number;
  };
  suggestion: {
    fairExtraPayment: number;
    reasoning: string;
  };
}

export const NegotiationAssistant: React.FC<NegotiationAssistantProps> = ({
  swapId,
  onAdviceReceived,
  showInline = false
}) => {
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<NegotiationAdvice | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchNegotiationAdvice = async () => {
    if (!swapId) return;

    setLoading(true);
    setError(null);
    
    try {
      logDebug('Fetching negotiation advice for swap', { swapId });
      
      const response = await apiClient.get(`/api/ai/negotiation/${swapId}`);
      
      if (response.success) {
        const adviceData = {
          advice: response.advice,
          currentOffer: response.currentOffer,
          suggestion: response.suggestion
        };
        
        setAdvice(adviceData);
        
        if (onAdviceReceived) {
          onAdviceReceived(adviceData);
        }
        
        logInfo('Negotiation advice received');
      } else {
        setError('Failed to get negotiation advice');
      }
    } catch (err: any) {
      logError('Negotiation advice error', err, { swapId });
      setError('Negotiation assistant temporarily unavailable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showInline) {
      fetchNegotiationAdvice();
    }
  }, [swapId, showInline]);

  const getReasoningColor = (reasoning: string) => {
    if (reasoning.toLowerCase().includes('generous')) return '#4ECDC4';
    if (reasoning.toLowerCase().includes('increase')) return '#FF9500';
    if (reasoning.toLowerCase().includes('fair')) return '#4ECDC4';
    return '#666';
  };

  const getReasoningIcon = (reasoning: string) => {
    if (reasoning.toLowerCase().includes('generous')) return 'checkmark-circle';
    if (reasoning.toLowerCase().includes('increase')) return 'trending-up';
    if (reasoning.toLowerCase().includes('fair')) return 'balance';
    return 'information-circle';
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning-outline" size={20} color="#FF6B6B" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={fetchNegotiationAdvice}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (showInline && advice) {
    return (
      <View style={styles.inlineContainer}>
        <View style={styles.header}>
          <Ionicons name="people-outline" size={20} color="#4ECDC4" />
          <Text style={styles.title}>AI Negotiation Assistant</Text>
        </View>
        
        <View style={styles.adviceContainer}>
          <View style={styles.adviceBox}>
            <Ionicons name="bulb-outline" size={16} color="#FFD700" />
            <Text style={styles.adviceText}>{advice.advice}</Text>
          </View>
        </View>

        <View style={styles.analysisContainer}>
          <Text style={styles.analysisTitle}>Value Analysis</Text>
          
          <View style={styles.valueComparison}>
            <View style={styles.valueItem}>
              <Text style={styles.valueLabel}>Your Item</Text>
              <Text style={styles.valueAmount}>
                ₦{advice.currentOffer.offeringValue.toLocaleString()}
              </Text>
            </View>
            
            <Ionicons name="swap-horizontal" size={16} color="#666" />
            
            <View style={styles.valueItem}>
              <Text style={styles.valueLabel}>Their Item</Text>
              <Text style={styles.valueAmount}>
                ₦{advice.currentOffer.requestedValue.toLocaleString()}
              </Text>
            </View>
          </View>
          
          <View style={styles.paymentComparison}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Current Extra Payment</Text>
              <Text style={styles.currentPayment}>
                ₦{advice.currentOffer.extraPayment.toLocaleString()}
              </Text>
            </View>
            
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>AI Suggested Payment</Text>
              <Text style={styles.suggestedPayment}>
                ₦{advice.suggestion.fairExtraPayment.toLocaleString()}
              </Text>
            </View>
          </View>
          
          <View style={[
            styles.reasoningContainer,
            { backgroundColor: getReasoningColor(advice.suggestion.reasoning) + '15' }
          ]}>
            <Ionicons 
              name={getReasoningIcon(advice.suggestion.reasoning)} 
              size={16} 
              color={getReasoningColor(advice.suggestion.reasoning)} 
            />
            <Text style={[
              styles.reasoningText,
              { color: getReasoningColor(advice.suggestion.reasoning) }
            ]}>
              {advice.suggestion.reasoning}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (!showInline) {
    return (
      <TouchableOpacity 
        style={[styles.assistantButton, loading && styles.assistantButtonDisabled]}
        onPress={() => {
          fetchNegotiationAdvice();
          // Show advice in alert for non-inline usage
          if (advice) {
            Alert.alert(
              '🤝 Negotiation Assistant',
              `${advice.advice}\n\n💡 ${advice.suggestion.reasoning}`,
              [{ text: 'Got it!' }]
            );
          }
        }}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Ionicons name="people-outline" size={16} color="#ffffff" />
        )}
        <Text style={styles.assistantButtonText}>
          {loading ? 'Analyzing...' : 'Get AI Advice'}
        </Text>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Getting negotiation advice...</Text>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  inlineContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#4ECDC4',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  adviceContainer: {
    marginBottom: 16,
  },
  adviceBox: {
    backgroundColor: '#3a3a3a',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  adviceText: {
    color: '#FFD700',
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
    marginLeft: 8,
    flex: 1,
  },
  analysisContainer: {
    gap: 12,
  },
  analysisTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  valueComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#3a3a3a',
    borderRadius: 8,
    padding: 12,
  },
  valueItem: {
    alignItems: 'center',
    flex: 1,
  },
  valueLabel: {
    color: '#666',
    fontSize: 12,
    marginBottom: 4,
  },
  valueAmount: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  paymentComparison: {
    backgroundColor: '#3a3a3a',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentLabel: {
    color: '#666',
    fontSize: 12,
  },
  currentPayment: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  suggestedPayment: {
    color: '#4ECDC4',
    fontSize: 14,
    fontWeight: 'bold',
  },
  reasoningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  reasoningText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  
  // Button Styles
  assistantButton: {
    backgroundColor: '#4ECDC4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 120,
  },
  assistantButtonDisabled: {
    opacity: 0.6,
  },
  assistantButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  
  // Loading and Error States
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    marginVertical: 8,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 8,
  },
  retryButton: {
    backgroundColor: '#4ECDC4',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});