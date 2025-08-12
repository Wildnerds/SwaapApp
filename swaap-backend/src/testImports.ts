// Test AI Controller imports
import 'dotenv/config';

async function testImports() {
  try {
    console.log('Testing AI controller imports...');
    
    const aiModule = await import('./controllers/aiController');
    console.log('Available exports:', Object.keys(aiModule));
    
    const {
      sendMessageToAI,
      findSmartMatches,
      estimateProductValue,
      getPersonalizedRecommendations,
      getNegotiationAdvice
    } = aiModule;
    
    console.log('Import types:', {
      sendMessageToAI: typeof sendMessageToAI,
      findSmartMatches: typeof findSmartMatches,
      estimateProductValue: typeof estimateProductValue,
      getPersonalizedRecommendations: typeof getPersonalizedRecommendations,
      getNegotiationAdvice: typeof getNegotiationAdvice,
    });
    
  } catch (error) {
    console.error('Import error:', error);
  }
}

testImports();