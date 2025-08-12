// components/ai/SmartRecommendationsCard.tsx - AI-powered product recommendations
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { logDebug, logInfo, logError } from '@/utils/logger';
import { Product } from '@types';
import { API, apiClient } from '@config/index';
import { useAuth } from '@/context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface TradeMatch {
  product: Product;
  matchScore: number;
  reasons: string[];
  distance: number;
  userProfile: any;
  confidence: number;
  suggestedValue: number;
  cashDifference?: number;
  aiInsights: string;
}

interface SmartRecommendationsCardProps {
  productId?: string; // For Smart Matching Agent
  showPersonalizedOnly?: boolean; // For Personal Shopping Agent
  maxItems?: number;
  title?: string;
}

export const SmartRecommendationsCard: React.FC<SmartRecommendationsCardProps> = ({
  productId,
  showPersonalizedOnly = false,
  maxItems = 5,
  title
}) => {
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<TradeMatch[]>([]);
  const [personalizedRecommendations, setPersonalizedRecommendations] = useState<Product[]>([]);
  const [userPreferences, setUserPreferences] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    if (productId && !showPersonalizedOnly && user) {
      fetchSmartMatches();
    } else if (showPersonalizedOnly) {
      fetchPersonalizedRecommendations(); // This will work even without user auth now
    }
  }, [productId, user, showPersonalizedOnly]);

  const fetchSmartMatches = async () => {
    if (!productId || !user) return;

    setLoading(true);
    setError(null);
    
    try {
      logDebug('Fetching smart matches for product', { productId });
      
      const response = await apiClient.get(
        `/api/ai/matches?productId=${productId}&limit=${maxItems}`
      );

      if (response.success) {
        setMatches(response.matches || []);
        logInfo('Smart matches fetched', { count: response.matches?.length || 0 });
      } else {
        setError('Failed to fetch AI recommendations');
      }
    } catch (err: any) {
      logError('Smart matches error', err, { productId });
      setError('AI service temporarily unavailable');
    } finally {
      setLoading(false);
    }
  };

  const fetchPersonalizedRecommendations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      logDebug('Fetching personalized recommendations');
      
      const response = await apiClient.get(
        `/api/ai/recommendations?limit=${maxItems}`
      );

      if (response.success) {
        setPersonalizedRecommendations(response.recommendations || []);
        setUserPreferences(response.preferences);
        logInfo('Personalized recommendations fetched', { count: response.recommendations?.length || 0 });
      } else {
        setError('Failed to fetch personalized recommendations');
      }
    } catch (err: any) {
      logError('Personalized recommendations error', err);
      setError('AI service temporarily unavailable');
    } finally {
      setLoading(false);
    }
  };


  const renderMatchItem = ({ item }: { item: TradeMatch }) => (
    <TouchableOpacity 
      style={styles.matchCard}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.product._id })}
    >
      <Image 
        source={{ uri: item.product.images?.[0] || 'https://via.placeholder.com/100' }}
        style={styles.matchImage}
      />
      
      <View style={styles.matchInfo}>
        <Text style={styles.matchTitle} numberOfLines={2}>{item.product.title}</Text>
        <Text style={styles.matchPrice}>₦{item.product.price.toLocaleString()}</Text>
        
        {/* AI Insights */}
        <Text style={styles.aiInsights} numberOfLines={2}>
          🤖 {item.aiInsights}
        </Text>
        
        {/* Match Score */}
        <View style={styles.matchScoreContainer}>
          <View style={[styles.matchScoreBar, { width: `${item.matchScore * 100}%` }]} />
          <Text style={styles.matchScoreText}>
            {(item.matchScore * 100).toFixed(0)}% Match
          </Text>
        </View>

        {/* Reasons */}
        <View style={styles.reasonsContainer}>
          {item.reasons.slice(0, 2).map((reason, index) => (
            <View key={index} style={styles.reasonTag}>
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.matchActions}>
          <TouchableOpacity 
            style={styles.swapButtonFull}
            onPress={() => navigation.navigate('SwapOffer', { 
              requestedProduct: item.product,
              requestedProductPrice: item.product.price
            })}
          >
            <Text style={styles.swapButtonText}>🔄 Start Swap</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderPersonalizedItem = ({ item }: { item: Product }) => (
    <TouchableOpacity 
      style={styles.personalizedCard}
      onPress={() => navigation.navigate('ProductDetail', { productId: item._id })}
    >
      <Image 
        source={{ uri: item.images?.[0] || 'https://via.placeholder.com/120' }}
        style={styles.personalizedImage}
      />
      
      <View style={styles.personalizedInfo}>
        <Text style={styles.personalizedTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.personalizedPrice}>₦{item.price.toLocaleString()}</Text>
        <Text style={styles.personalizedCategory}>{item.category}</Text>
      </View>
    </TouchableOpacity>
  );

  if (!user && showPersonalizedOnly) {
    return (
      <View style={styles.authPrompt}>
        <Ionicons name="person-circle-outline" size={48} color="#666" />
        <Text style={styles.authPromptText}>Sign in to get personalized AI recommendations</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning-outline" size={24} color="#FF6B6B" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={showPersonalizedOnly ? fetchPersonalizedRecommendations : fetchSmartMatches}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasData = showPersonalizedOnly 
    ? personalizedRecommendations.length > 0 
    : matches.length > 0;

  if (!loading && !hasData) {
    return (
      <View style={styles.noDataContainer}>
        <Ionicons name="search-outline" size={32} color="#666" />
        <Text style={styles.noDataText}>
          {showPersonalizedOnly 
            ? 'No personalized recommendations yet. Start trading to improve suggestions!' 
            : 'No smart matches found for this item.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons 
            name={showPersonalizedOnly ? "person-outline" : "analytics-outline"} 
            size={20} 
            color="#4ECDC4" 
          />
          <Text style={styles.title}>
            {title || (showPersonalizedOnly ? 'For You' : 'Smart Matches')}
          </Text>
        </View>
        
        {loading && <ActivityIndicator size="small" color="#4ECDC4" />}
      </View>

      {/* User Preferences Insight (for personalized) */}
      {showPersonalizedOnly && userPreferences && !loading && (
        <View style={styles.insightContainer}>
          <Text style={styles.insightText}>
            🎯 {userPreferences.insight || (user ? `Based on your ${userPreferences.tradingStyle} style` : userPreferences.insight)}
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4ECDC4" />
          <Text style={styles.loadingText}>
            {showPersonalizedOnly ? 'Learning your preferences...' : 'Finding smart matches...'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={showPersonalizedOnly ? personalizedRecommendations : matches}
          renderItem={showPersonalizedOnly ? renderPersonalizedItem : renderMatchItem}
          keyExtractor={(item: any) => item._id || item.product?._id}
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    margin: 12,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 8,
  },
  insightContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  insightText: {
    color: '#4ECDC4',
    fontSize: 14,
    fontStyle: 'italic',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    color: '#666',
    marginTop: 8,
    fontSize: 14,
  },
  listContainer: {
    paddingHorizontal: 4,
  },
  
  // Smart Matches Styles
  matchCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    marginRight: 12,
    width: 280,
    overflow: 'hidden',
  },
  matchImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#333',
  },
  matchInfo: {
    padding: 12,
  },
  matchTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  matchPrice: {
    color: '#4ECDC4',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  aiInsights: {
    color: '#FFD700',
    fontSize: 12,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  matchScoreContainer: {
    marginBottom: 8,
  },
  matchScoreBar: {
    height: 4,
    backgroundColor: '#4ECDC4',
    borderRadius: 2,
    marginBottom: 4,
  },
  matchScoreText: {
    color: '#4ECDC4',
    fontSize: 12,
    fontWeight: '600',
  },
  reasonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  reasonTag: {
    backgroundColor: '#3a3a3a',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  reasonText: {
    color: '#ffffff',
    fontSize: 10,
  },
  matchActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  valueButton: {
    backgroundColor: '#FF9500',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flex: 0.45,
  },
  valueButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  swapButton: {
    backgroundColor: '#4ECDC4',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flex: 0.45,
  },
  swapButtonFull: {
    backgroundColor: '#4ECDC4',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flex: 1,
    alignItems: 'center',
  },
  swapButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Personalized Recommendations Styles
  personalizedCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    marginRight: 12,
    width: 140,
    overflow: 'hidden',
  },
  personalizedImage: {
    width: '100%',
    height: 100,
    backgroundColor: '#333',
  },
  personalizedInfo: {
    padding: 12,
  },
  personalizedTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  personalizedPrice: {
    color: '#4ECDC4',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  personalizedCategory: {
    color: '#666',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  
  // Error and Empty States
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 32,
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
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noDataText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  authPrompt: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  authPromptText: {
    color: '#666',
    fontSize: 16,
    marginTop: 12,
  },
});