/**
 * SURAKSHA AI — OpenRouter Conversational Assistant & PostgreSQL Acceptance Test Suite
 * 
 * Verifies all 7 test categories specified in Section 14:
 * 1. General conversation (Greeting, Python, JavaScript, local fallback without API key leak)
 * 2. Website explanations (Guardian Mode, Safe Route, Voice SOS)
 * 3. Legal Section resolution (Ambiguous without context vs. contextual resolution)
 * 4. Case studies (Verified cases, Act clarification if ambiguous, no citation fabrication)
 * 5. Interactive learning (Quiz serving, answer evaluation, continuous study resumption)
 * 6. Emergency isolation (Hypothetical exam query does NOT trigger SOS; real distress triggers SOS)
 * 7. Database & security (PG migration idempotency, conversation persistence, cross-user isolation,
 *    SQL injection resistance, duplicate write prevention, request size limits, OpenRouter failure modes)
 */

const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const assistantService = require('./services/assistantService');
const openrouterService = require('./services/openrouterService');
const assistantDbService = require('./services/assistantDbService');
const legalStudyService = require('./services/legalStudyService');
const conversationRouter = require('./services/conversationRouter');
const { getPool, query } = require('./config/postgres');
const mongoose = require('mongoose');

let testsExecuted = 0;
let testsPassed = 0;

function pass(desc) {
  testsExecuted++;
  testsPassed++;
  console.log(`  [PASS] Test ${testsExecuted}: ${desc}`);
}

function fail(desc, err) {
  testsExecuted++;
  console.error(`  [FAIL] Test ${testsExecuted}: ${desc}`);
  console.error(`         ${err.message}`);
}

async function runTest(desc, fn) {
  try {
    await fn();
    pass(desc);
  } catch (err) {
    fail(desc, err);
  }
}

async function runSuite() {
  console.log('\n=============================================================');
  console.log('🚀 SURAKSHA AI — OpenRouter, Legal Tutor & PostgreSQL Test Suite');
  console.log('=============================================================\n');

  if (process.env.MONGODB_URI) {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB Atlas for Legal RAG integration testing.');
  }

  // Test Users
  const userA = { _id: 'user_test_aaa_111', email: 'alice@suraksha.ai' };
  const userB = { _id: 'user_test_bbb_222', email: 'bob@suraksha.ai' };

  // =========================================================================
  // 1. GENERAL CONVERSATION TESTS
  // =========================================================================
  console.log('--- 1. GENERAL CONVERSATION TESTS ---');

  await runTest('A. User: "Hello." -> Natural greeting without generic checklist spam', async () => {
    const res = await assistantService.processChatQuery(userA, 'Hello.');
    assert.strictEqual(res.intent, 'GREETING');
    assert.strictEqual(res.emergencyDetected, false);
    assert(res.legalExplanation.toLowerCase().includes('hello') || res.legalExplanation.toLowerCase().includes('how can i assist'));
    assert(!res.legalExplanation.includes('OPENROUTER_API_KEY'));
    assert(!res.legalExplanation.includes('OPENAI_API_KEY'));
  });

  await runTest('B. User: "What is Python?" -> Clear educational explanation via local fallback/OpenRouter', async () => {
    const res = await assistantService.processChatQuery(userA, 'What is Python?');
    assert.strictEqual(res.emergencyDetected, false);
    assert(res.legalExplanation.toLowerCase().includes('python'));
    assert(res.legalExplanation.toLowerCase().includes('programming language'));
    // Must NOT output an API key error
    assert(!res.legalExplanation.includes('API key needs to be configured'));
    assert(!res.legalExplanation.includes('OPENROUTER_API_KEY'));
  });

  await runTest('C. User: "Explain JavaScript." -> Correct educational programming concept', async () => {
    const res = await assistantService.processChatQuery(userA, 'Explain JavaScript.');
    assert.strictEqual(res.emergencyDetected, false);
    assert(res.legalExplanation.toLowerCase().includes('javascript'));
    assert(res.legalExplanation.toLowerCase().includes('web') || res.legalExplanation.toLowerCase().includes('language'));
  });

  // =========================================================================
  // 2. WEBSITE EXPLANATIONS TESTS
  // =========================================================================
  console.log('\n--- 2. WEBSITE EXPLANATIONS TESTS ---');

  await runTest('A. User: "Explain Guardian Mode." -> Grounded in real check-in, route-deviation, and escalation', async () => {
    const res = await assistantService.processChatQuery(userA, 'Explain Guardian Mode.');
    assert.strictEqual(res.intent, 'FEATURE');
    assert.strictEqual(res.emergencyDetected, false);
    assert(res.legalExplanation.toLowerCase().includes('guardian mode'));
    assert(res.legalExplanation.toLowerCase().includes('check-in'));
    assert(res.legalExplanation.toLowerCase().includes('trusted circle'));
    assert(res.safetyAdvice.some(a => a.toLowerCase().includes('trusted')));
  });

  await runTest('B. User: "How does Safe Route work?" -> Grounded in spatial safety score & lighting', async () => {
    const res = await assistantService.processChatQuery(userA, 'How does Safe Route work?');
    assert.strictEqual(res.intent, 'FEATURE');
    assert(res.legalExplanation.toLowerCase().includes('safe route'));
    assert(res.legalExplanation.toLowerCase().includes('lighting') || res.legalExplanation.toLowerCase().includes('safety scores'));
  });

  await runTest('C. User: "How does Voice SOS work?" -> Grounded in distress wakeword & 5s cancel countdown', async () => {
    const res = await assistantService.processChatQuery(userA, 'How does Voice SOS work?');
    assert.strictEqual(res.intent, 'FEATURE');
    assert(res.legalExplanation.toLowerCase().includes('voice sos'));
    assert(res.legalExplanation.toLowerCase().includes('countdown') || res.legalExplanation.toLowerCase().includes('wakeword'));
  });

  // =========================================================================
  // 3. SECTION RESOLUTION & TUTORING TESTS
  // =========================================================================
  console.log('\n--- 3. SECTION RESOLUTION TESTS ---');

  await runTest('A. User: "What is Section 18?" (no context) -> Asks single Act clarification question', async () => {
    const res = await assistantService.processChatQuery(userA, 'What is Section 18?');
    assert.strictEqual(res.intent, 'AMBIGUOUS_SECTION');
    assert.strictEqual(res.questionType, 'AMBIGUOUS_SECTION');
    assert(res.legalExplanation.includes('Which specific Act would you like me to explain'));
  });

  await runTest('B. User: "Help me study Section 17 of the Protection of Women from Domestic Violence Act." -> Full 8-part tutorial', async () => {
    const res = await assistantService.processChatQuery(userA, 'Help me study Section 17 of the Protection of Women from Domestic Violence Act.');
    assert.strictEqual(res.intent, 'LEGAL');
    assert.strictEqual(res.questionType, 'SECTION_EXPLANATION');
    assert(res.legalExplanation.includes('### A. Section and Act'));
    assert(res.legalExplanation.includes('### B. Meaning in Simple English'));
    assert(res.legalExplanation.includes('### C. Important Legal Points'));
    assert(res.legalExplanation.includes('### D. Practical Hypothetical Example'));
    assert(res.legalExplanation.includes('### E. Real Legal Case Studies'));
    assert(res.legalExplanation.includes('### F. Exam Revision Notes'));
    assert(res.legalExplanation.includes('### G. Practice Questions'));
    assert(res.legalExplanation.includes('### H. Authoritative Sources'));
    assert(res.legalExplanation.includes('indiacode.nic.in'));
    assert(res.legalExplanation.includes('Shared Household') || res.legalExplanation.includes('shared household'));
  });

  await runTest('C. User: "Explain Section 18." (context has lastAct=PWDVA) -> Explains PWDVA Sec 18 directly without asking clarification', async () => {
    const sessionContext = { lastAct: 'PWDVA' };
    const res = await assistantService.processChatQuery(userA, 'Explain Section 18.', sessionContext);
    assert.strictEqual(res.intent, 'LEGAL');
    assert.strictEqual(res.questionType, 'SECTION_EXPLANATION');
    assert(!res.legalExplanation.includes('Which specific Act would you like me to explain'));
    assert(res.legalExplanation.includes('Protection Orders') || res.legalExplanation.includes('Protection Order') || res.legalExplanation.includes('Pass of protection orders'));
  });

  // =========================================================================
  // 4. CASE STUDIES & CITATION INTEGRITY TESTS
  // =========================================================================
  console.log('\n--- 4. CASE STUDIES TESTS ---');

  await runTest('A. User: "Give me case studies of Section 18." (with PWDVA context) -> Retrieves verified AP High Court ruling', async () => {
    const sessionContext = { lastAct: 'PWDVA' };
    const res = await assistantService.processChatQuery(userA, 'Give me case studies of Section 18.', sessionContext);
    assert.strictEqual(res.intent, 'CASE_STUDY');
    assert(res.legalExplanation.includes('K. Srilatha') || res.legalExplanation.includes('High Court of Andhra Pradesh'));
    assert(res.legalExplanation.includes('Facts') && res.legalExplanation.includes('Court\'s Reasoning'));
    assert(res.legalExplanation.includes('Authoritative Source'));
  });

  await runTest('B. User: "Give me case studies of Section 18." (without context) -> Asks for Act clarification', async () => {
    const res = await assistantService.processChatQuery(userA, 'Give me case studies of Section 18.');
    assert.strictEqual(res.intent, 'AMBIGUOUS_SECTION');
    assert(res.legalExplanation.includes('Which specific Act'));
  });

  await runTest('C. Case study request for uncataloged section -> Explicitly disclaims & offers hypothetical, NO FABRICATED CITATION', async () => {
    const sessionContext = { lastAct: 'PWDVA' };
    const res = await assistantService.processChatQuery(userA, 'Give me case studies of Section 999.', sessionContext);
    assert.strictEqual(res.intent, 'CASE_STUDY');
    assert(res.legalExplanation.includes('No verified real-world court case is currently cataloged'));
    assert(res.legalExplanation.includes('Hypothetical Scenario') || res.legalExplanation.includes('NOT A REAL COURT JUDGMENT'));
    assert(res.legalExplanation.includes('We never fabricate court citations'));
  });

  // =========================================================================
  // 5. INTERACTIVE LEARNING & CONTINUOUS STUDY TESTS
  // =========================================================================
  console.log('\n--- 5. INTERACTIVE LEARNING & QUIZ TESTS ---');

  let activeQuizContext = null;

  await runTest('A. User: "Quiz me on Section 17." -> Serves structured quiz question with options A, B, C, D', async () => {
    const res = await assistantService.processChatQuery(userA, 'Quiz me on Section 17.');
    assert.strictEqual(res.intent, 'LEGAL');
    assert.strictEqual(res.questionType, 'QUIZ');
    assert(res.legalExplanation.includes('Legal Study Quiz'));
    assert(res.legalExplanation.includes('**A**') && res.legalExplanation.includes('**B**'));
    assert(res.sessionContext && res.sessionContext.activeQuiz);
    activeQuizContext = res.sessionContext;
  });

  await runTest('B. User submits quiz answer "B" -> Evaluates correctness and stores in PostgreSQL', async () => {
    assert(activeQuizContext, 'activeQuizContext must be set');
    const res = await assistantService.processChatQuery(userA, 'B', activeQuizContext);
    assert.strictEqual(res.intent, 'LEGAL');
    assert.strictEqual(res.questionType, 'QUIZ_EVALUATION');
    assert(res.legalExplanation.includes('Correct!') || res.legalExplanation.includes('Option B'));

    // Verify record in PostgreSQL user_legal_quiz_attempts
    const attempts = await assistantDbService.getQuizAttempts(userA._id, { actIdentifier: 'PWDVA', sectionNumber: '17' });
    assert(attempts.length > 0, 'Quiz attempt must be stored in PostgreSQL');
    assert.strictEqual(attempts[0].selected_option, 'B');
    assert.strictEqual(attempts[0].is_correct, true);
  });

  await runTest('C. User: "Continue teaching me." -> Resumes next step from PostgreSQL study progress', async () => {
    const sessionContext = { lastAct: 'PWDVA', lastSection: '17' };
    const res = await assistantService.processChatQuery(userA, 'Continue teaching me.', sessionContext);
    assert.strictEqual(res.intent, 'LEGAL');
    assert.strictEqual(res.questionType, 'CONTINUOUS_STUDY');
    assert(res.legalExplanation.includes('Step') || res.legalExplanation.includes('Important Legal Points'));
  });

  await runTest('D. User requests Telugu: "Explain Section 17 in Telugu" -> Provides accurate Telugu tutoring', async () => {
    const res = await assistantService.processChatQuery(userA, 'Explain Section 17 PWDVA in Telugu');
    assert.strictEqual(res.intent, 'LEGAL');
    assert(res.legalExplanation.includes('సెక్షన్ 17') || res.legalExplanation.includes('గృహహింస'));
  });

  // =========================================================================
  // 6. EMERGENCY ISOLATION TESTS
  // =========================================================================
  console.log('\n--- 6. EMERGENCY ISOLATION TESTS ---');

  await runTest('A. User: "Explain a hypothetical domestic violence case for my law exam." -> Educational, NO EMERGENCY TRIGGERED', async () => {
    const res = await assistantService.processChatQuery(userA, 'Explain a hypothetical domestic violence case for my law exam.');
    assert.strictEqual(res.emergencyDetected, false);
    assert.strictEqual(res.emergencyTriggerRecommended, false);
    assert.notStrictEqual(res.intent, 'EMERGENCY');
  });

  await runTest('B. User: "I am in immediate danger. Please help me." -> Triggers EMERGENCY priority workflow', async () => {
    const res = await assistantService.processChatQuery(userA, 'I am in immediate danger. Please help me.');
    assert.strictEqual(res.intent, 'EMERGENCY');
    assert.strictEqual(res.emergencyDetected, true);
    assert.strictEqual(res.emergencyTriggerRecommended, true);
    assert(res.safetyAdvice.some(a => a.toLowerCase().includes('activate sos')));
  });

  // =========================================================================
  // 7. DATABASE & SECURITY TESTS
  // =========================================================================
  console.log('\n--- 7. DATABASE, SECURITY & PROVIDER TESTS ---');

  await runTest('A. PostgreSQL migration idempotency -> Repeated initializeSchema causes zero errors', async () => {
    await assistantDbService.initializeSchema();
    await assistantDbService.initializeSchema();
    const count = await query('SELECT count(*) FROM information_schema.tables WHERE table_name = $1;', ['assistant_conversations']);
    assert.strictEqual(count.rows[0].count, '1');
  });

  let createdConvId = null;

  await runTest('B. Conversation persistence -> Creates conversation and appends user + assistant messages', async () => {
    const conv = await assistantDbService.createConversation(userA._id, { title: 'Legal Research Session', category: 'legal' });
    assert(conv && conv.id);
    createdConvId = conv.id;

    const msgUser = await assistantDbService.appendMessage({
      conversationId: conv.id,
      userId: userA._id,
      role: 'user',
      content: 'Explain Section 17 PWDVA',
      category: 'legal'
    });
    assert(msgUser.message && msgUser.message.id);

    const msgAsst = await assistantDbService.appendMessage({
      conversationId: conv.id,
      userId: userA._id,
      role: 'assistant',
      content: 'Section 17 guarantees shared household rights.',
      category: 'legal'
    });
    assert(msgAsst.message && msgAsst.message.id);

    const messages = await assistantDbService.getMessages(conv.id, userA._id);
    assert.strictEqual(messages.length, 2);
    assert.strictEqual(messages[0].role, 'user');
    assert.strictEqual(messages[1].role, 'assistant');
  });

  await runTest('C. Cross-user access control -> User B cannot read or delete User A\'s conversation', async () => {
    assert(createdConvId);
    // User B attempting to read User A's conversation
    const messages = await assistantDbService.getMessages(createdConvId, userB._id);
    assert.strictEqual(messages.length, 0, 'User B must not see User A messages');

    // User B attempting to delete User A's conversation
    const deleted = await assistantDbService.deleteConversation(createdConvId, userB._id);
    assert.strictEqual(deleted, false, 'User B must not be able to delete User A conversation');
  });

  await runTest('D. SQL injection resistance -> Malicious strings in query parameters are neutralized', async () => {
    const maliciousInput = "'; DROP TABLE assistant_messages; --";
    const res = await assistantDbService.searchCaseStudies({ search: maliciousInput });
    assert(Array.isArray(res));
    // Verify table still exists
    const tableCheck = await query('SELECT count(*) FROM information_schema.tables WHERE table_name = $1;', ['assistant_messages']);
    assert.strictEqual(tableCheck.rows[0].count, '1');
  });

  await runTest('E. Duplicate message prevention -> Idempotency key prevents duplicate writes', async () => {
    assert(createdConvId);
    const idempKey = `test_idemp_${Date.now()}`;
    const firstWrite = await assistantDbService.appendMessage({
      conversationId: createdConvId,
      userId: userA._id,
      role: 'user',
      content: 'Idempotency test message',
      idempotencyKey: idempKey
    });
    assert.strictEqual(firstWrite.duplicate, false);

    const secondWrite = await assistantDbService.appendMessage({
      conversationId: createdConvId,
      userId: userA._id,
      role: 'user',
      content: 'Idempotency test message duplicate',
      idempotencyKey: idempKey
    });
    assert.strictEqual(secondWrite.duplicate, true);
  });

  await runTest('F. OpenRouter mock handler integration -> Verifies custom model response generation', async () => {
    openrouterService.setMockHandler(async ({ messages }) => {
      return {
        content: '[MOCK_OPENROUTER_REPLY] Recursive backtracking explanation.',
        model: 'mock-llama-3.3',
        usage: { prompt_tokens: 10, completion_tokens: 15, total_tokens: 25 }
      };
    });

    const completion = await openrouterService.generateCompletion({
      messages: [{ role: 'user', content: 'Explain backtracking.' }]
    });

    assert.strictEqual(completion.success, true);
    assert.strictEqual(completion.content, '[MOCK_OPENROUTER_REPLY] Recursive backtracking explanation.');
    assert.strictEqual(completion.provider, 'openrouter-mock');

    openrouterService.resetMockHandler();
  });

  await runTest('G. OpenRouter error & timeout handling -> Handles network timeout gracefully', async () => {
    openrouterService.setMockHandler(async () => {
      const err = new Error('Request timed out');
      err.code = 'TIMEOUT';
      throw err;
    });

    const completion = await openrouterService.generateCompletion({
      messages: [{ role: 'user', content: 'Test timeout.' }]
    });

    assert.strictEqual(completion.success, false);
    assert.strictEqual(completion.errorCode, 'TIMEOUT');

    openrouterService.resetMockHandler();
  });

  // Clean up created test conversation
  if (createdConvId) {
    await assistantDbService.deleteConversation(createdConvId, userA._id);
  }

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  console.log('\n=============================================================');
  console.log(`TEST SUMMARY: ${testsPassed} / ${testsExecuted} passed.`);
  console.log('=============================================================\n');

  if (testsPassed !== testsExecuted) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSuite().catch(err => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});
