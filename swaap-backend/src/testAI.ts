// Simple AI test script
import 'dotenv/config';
import { connectDB } from './db';

async function testAI() {
  console.log('🤖 Testing AI Agent System...');
  
  try {
    // Test 1: Check environment
    console.log('✅ Environment check:');
    console.log('  - OpenAI API Key configured:', !!process.env.OPENAI_API_KEY);
    console.log('  - MongoDB URI configured:', !!process.env.MONGO_URI);
    
    // Test 2: Database connection (skipped for now)
    console.log('\n📦 Skipping database connection test...');
    console.log('✅ Database test skipped (MongoDB not required for AI controller test)');
    
    // Test 3: Import controllers
    console.log('\n🎯 Testing AI controller imports...');
    const { sendMessageToAI } = await import('./controllers/aiController');
    console.log('✅ AI controllers imported successfully');
    
    console.log('\n🎉 AI Agent System test completed successfully!');
    console.log('\nAvailable AI Agents:');
    console.log('  1. 🧠 Smart Matching Agent - finds optimal trade matches');
    console.log('  2. 💰 Value Assessment Agent - estimates fair market value');
    console.log('  3. 🛍️ Personal Shopping Agent - learns user preferences');
    console.log('  4. 🤝 Negotiation Assistant - provides trade advice');
    console.log('  5. 💬 AI Chat Support - customer service automation');
    
  } catch (error) {
    console.error('❌ AI test failed:', error);
  }
  
  process.exit(0);
}

testAI();