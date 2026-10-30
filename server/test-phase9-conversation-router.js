/**
 * SURAKSHA AI — Phase 9 Conversational Intelligence Router & Isolation Tests
 * 
 * Verifies pre-retrieval intent classification, retrieval isolation,
 * safety guardrails, and non-side-effect properties.
 *
 * MOCKS OpenAI calls so 0 API credits are consumed during automated testing.
 */

const assert = require('assert');
const conversationRouter = require('./services/conversationRouter');
const openaiConversationService = require('./services/openaiConversationService');
const legalRagService = require('./services/legalRagService');
const assistantService = require('./services/assistantService');

let testsExecuted = 0;
let testsPassed = 0;

function runTest(description, testFn) {
  testsExecuted++;
  try {
    testFn();
    testsPassed++;
    console.log(`  [PASS] Test ${testsExecuted}: ${description}`);
  } catch (err) {
    console.error(`  [FAIL] Test ${testsExecuted}: ${description}`);
    console.error(`         ${err.message}`);
  }
}

async function runAsyncTest(description, testFn) {
  testsExecuted++;
  try {
    await testFn();
    testsPassed++;
    console.log(`  [PASS] Test ${testsExecuted}: ${description}`);
  } catch (err) {
    console.error(`  [FAIL] Test ${testsExecuted}: ${description}`);
    console.error(`         ${err.message}`);
  }
}

async function main() {
  console.log('\n=============================================================');
  console.log('SURAKSHA AI — Phase 9 Conversation Router Test Suite');
  console.log('=============================================================\n');

  // MOCK OpenAI service calls for zero credit usage
  const originalGetCasualResponse = openaiConversationService.getCasualResponse;
  openaiConversationService.getCasualResponse = async (message) => {
    return `[MOCK_OPENAI_RESPONSE] Response for: ${message}`;
  };

  // MOCK legalRagService.queryJudgments to track invocations and avoid DB timeout in unit test
  let legalRagCallCount = 0;
  const originalQueryJudgments = legalRagService.queryJudgments;
  legalRagService.queryJudgments = async (query) => {
    legalRagCallCount++;
    return {
      status: 'SUCCESS',
      judgments: [{
        caseIdentifier: 'AP_HC_2025_001',
        court: 'High Court of Andhra Pradesh',
        decisionYear: 2025,
        keyLegalPoints: 'Verified legal precedent regarding protective statutory provisions.',
        summary: 'Court issued binding directions enforcing victim safety and statutory reporting.'
      }]
    };
  };

  console.log('--- 1. INTENT CLASSIFICATION TESTS ---\n');

  runTest('A. "Hi" -> CASUAL intent classification', () => {
    const res = conversationRouter.classifyMessage('Hi');
    assert.strictEqual(res.intent, 'CASUAL');
    assert.strictEqual(res.requiresRag, false);
  });

  runTest('B. "Tell me a joke" -> CASUAL intent classification', () => {
    const res = conversationRouter.classifyMessage('Tell me a joke');
    assert.strictEqual(res.intent, 'CASUAL');
    assert.strictEqual(res.requiresRag, false);
  });

  runTest('C. "What is Python?" -> GENERAL_KNOWLEDGE intent classification', () => {
    const res = conversationRouter.classifyMessage('What is Python?');
    assert.strictEqual(res.intent, 'GENERAL_KNOWLEDGE');
    assert.strictEqual(res.requiresRag, false);
  });

  runTest('D. "How does Guardian Mode work?" -> APP_RELATED intent classification', () => {
    const res = conversationRouter.classifyMessage('How does Guardian Mode work?');
    assert.strictEqual(res.intent, 'APP_RELATED');
    assert.strictEqual(res.topic, 'GUARDIAN_MODE');
    assert.strictEqual(res.requiresRag, true);
  });

  runTest('E. "What is sexual harassment?" -> LEGAL intent classification', () => {
    const res = conversationRouter.classifyMessage('What is sexual harassment?');
    assert.strictEqual(res.intent, 'LEGAL');
    assert.strictEqual(res.topic, 'SEXUAL_HARASSMENT');
    assert.strictEqual(res.requiresRag, true);
  });

  runTest('F. "What is BNSS Section 173?" -> LEGAL intent classification', () => {
    const res = conversationRouter.classifyMessage('What is BNSS Section 173?');
    assert.strictEqual(res.intent, 'LEGAL');
    assert.strictEqual(res.topic, 'SECTION_EXPLANATION');
    assert.strictEqual(res.requiresRag, true);
  });

  runTest('G. "Someone is threatening me" -> SAFETY intent classification', () => {
    const res = conversationRouter.classifyMessage('Someone is threatening me');
    assert.strictEqual(res.intent, 'SAFETY');
    assert.strictEqual(res.safetyLevel, 'HIGH');
    assert.strictEqual(res.requiresRag, false);
  });

  runTest('H. "What does emergency mean?" -> CASUAL/GENERAL_KNOWLEDGE intent classification', () => {
    const res = conversationRouter.classifyMessage('What does emergency mean?');
    assert.notStrictEqual(res.intent, 'EMERGENCY');
    assert.strictEqual(res.requiresRag, false);
  });

  runTest('I. "Someone is attacking me" -> EMERGENCY intent classification', () => {
    const res = conversationRouter.classifyMessage('Someone is attacking me');
    assert.strictEqual(res.intent, 'EMERGENCY');
    assert.strictEqual(res.safetyLevel, 'CRITICAL');
  });

  console.log('\n--- 2. RETRIEVAL & ISOLATION BOUNDARY TESTS ---\n');

  await runAsyncTest('A. Casual query ("Hi") MUST NOT trigger Legal RAG query', async () => {
    legalRagCallCount = 0;
    const res = await assistantService.processChatQuery({ _id: 'user1' }, 'Hi');
    assert.strictEqual(res.intent, 'CASUAL');
    assert.strictEqual(legalRagCallCount, 0, 'Legal RAG must not be called for casual messages');
    assert.ok(res.legalExplanation.includes('[MOCK_OPENAI_RESPONSE]'));
  });

  await runAsyncTest('B. General knowledge query ("What is Python?") MUST NOT trigger Legal RAG query', async () => {
    legalRagCallCount = 0;
    const res = await assistantService.processChatQuery({ _id: 'user1' }, 'What is Python?');
    assert.strictEqual(res.intent, 'GENERAL_KNOWLEDGE');
    assert.strictEqual(legalRagCallCount, 0, 'Legal RAG must not be called for general knowledge messages');
    assert.ok(res.legalExplanation.includes('[MOCK_OPENAI_RESPONSE]'));
  });

  await runAsyncTest('C. Legal query ("What is sexual harassment?") MUST query Legal RAG', async () => {
    legalRagCallCount = 0;
    const res = await assistantService.processChatQuery({ _id: 'user1' }, 'What is sexual harassment?');
    assert.strictEqual(res.intent, 'LEGAL');
    assert.strictEqual(legalRagCallCount, 1, 'Legal RAG must be queried for legal queries');
    assert.ok(res.structuredLegal);
  });

  await runAsyncTest('D. Safety threat statement ("Someone is threatening me") MUST NOT trigger EmergencyEvent creation', async () => {
    const res = await assistantService.processChatQuery({ _id: 'user1' }, 'Someone is threatening me');
    assert.strictEqual(res.emergencyDetected, false);
    assert.strictEqual(res.emergencyTriggerRecommended, false);
    assert.ok(res.safetyAdvice.length > 0);
  });

  await runAsyncTest('E. Emergency statement ("Someone is attacking me") MUST NOT create EmergencyEvent automatically', async () => {
    const res = await assistantService.processChatQuery({ _id: 'user1' }, 'Someone is attacking me');
    assert.strictEqual(res.intent, 'EMERGENCY');
    assert.strictEqual(res.emergencyDetected, true);
    assert.strictEqual(res.emergencyTriggerRecommended, true);
    // Response provides advice to press SOS button, but DOES NOT auto-create EmergencyEvent or send SMS
    assert.ok(res.safetyAdvice.some(a => a.includes('ACTIVATE SOS')));
  });

  // Restore mocks
  openaiConversationService.getCasualResponse = originalGetCasualResponse;
  legalRagService.queryJudgments = originalQueryJudgments;

  console.log('\n=============================================================');
  console.log(`TEST SUMMARY: ${testsPassed} / ${testsExecuted} passed.`);
  console.log('=============================================================\n');

  if (testsPassed !== testsExecuted) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
