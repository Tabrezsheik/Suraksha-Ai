/**
 * SURAKSHA AI — Live OpenRouter Provider Integration Test
 * 
 * Verifies real end-to-end connectivity with OpenRouter API:
 * 1. Live model resolution & chat completion using server environment key
 * 2. Response parsing, token usage metrics, and latency measurement
 * 3. Feature synthesis grounded in actual Suraksha AI parameters
 * 
 * Run with: node server/test-openrouter-live.js
 */

const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const openrouterService = require('./services/openrouterService');

async function runLiveTest() {
  console.log('\n=============================================================');
  console.log('🌐 SURAKSHA AI — Live OpenRouter Provider Integration Test');
  console.log('=============================================================\n');

  if (!openrouterService.isConfigured()) {
    console.error('❌ OPENROUTER_API_KEY is not configured in server/.env');
    process.exit(1);
  }

  const model = openrouterService.getModel();
  console.log(`Configured Model: ${model}`);
  console.log(`Base URL: ${openrouterService.getBaseUrl()}`);

  const startTime = Date.now();
  console.log('\nSending test prompt to OpenRouter...');

  try {
    const response = await openrouterService.generateCompletion({
      systemPrompt: 'You are SURAKSHA AI, a concise and polite personal safety assistant.',
      messages: [
        {
          role: 'user',
          content: 'Briefly explain what Guardian Mode does in SURAKSHA AI in 2 sentences.'
        }
      ],
      maxTokens: 150,
      temperature: 0.2
    });

    const durationMs = Date.now() - startTime;
    console.log(`Latency: ${durationMs} ms`);

    if (!response.success) {
      console.error(`❌ OpenRouter Live Call Failed: [${response.errorCode}] ${response.error}`);
      process.exit(1);
    }

    console.log(`✅ Status: Success`);
    console.log(`Model Used: ${response.model}`);
    console.log(`Tokens Used: ${JSON.stringify(response.usage)}`);
    console.log(`\nGenerated Response:\n"${response.content}"\n`);

    assert(response.content && response.content.length > 10, 'Response must have meaningful content');
    assert(!response.content.includes('OPENROUTER_API_KEY'), 'Must never leak API key in response');
  } catch (err) {
    console.error('Diagnostic error cause:', err.cause || err);
    process.exit(1);
  }

  console.log('=============================================================');
  console.log('🎉 LIVE OPENROUTER INTEGRATION TEST PASSED!');
  console.log('=============================================================\n');
}

runLiveTest().catch(err => {
  console.error('Unhandled live test error:', err);
  process.exit(1);
});
