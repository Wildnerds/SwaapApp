
// components/TrustScoreQuickFix.tsx
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTrustScoreFix } from '../hooks/useTrustScoreFix';

export const TrustScoreQuickFix: React.FC = () => {
  const { fixTrustScore, addSocialVerification, currentTrustScore } = useTrustScoreFix();

  return (
    <View style={quickFixStyles.container}>
      <Text style={quickFixStyles.title}>Trust Score: {currentTrustScore}/100</Text>
      
      <TouchableOpacity 
        style={quickFixStyles.button}
        onPress={fixTrustScore}
      >
        <Text style={quickFixStyles.buttonText}>🔧 Fix Trust Score</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[quickFixStyles.button, quickFixStyles.socialButton]}
        onPress={() => addSocialVerification('twitter')}
      >
        <Text style={quickFixStyles.buttonText}>➕ Add Social Verification</Text>
      </TouchableOpacity>
    </View>
  );
};

const quickFixStyles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1E1E',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#FF6B6B',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  socialButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});