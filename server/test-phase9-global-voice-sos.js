const assert = require('assert');
const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const User = require('./models/User');
const EmergencyEvent = require('./models/EmergencyEvent');
const emergencyService = require('./services/emergencyService');

// Import phrase detection logic from useVoiceSOS hook
const { isEmergencyPhrase, normalizeTranscript } = require('../web/hooks/useVoiceSOS');

async function runGlobalVoiceSOSTests() {
  console.log('======================================================');
  console.log('🚀 RUNNING PHASE 9 GLOBAL WEBSITE-WIDE VOICE SOS TEST SUITE');
  console.log('======================================================\n');

  let passCount = 0;
  let testCount = 0;

  const runTest = (name, testFn) => {
    testCount++;
    try {
      testFn();
      passCount++;
      console.log(`[PASS] Test #${testCount}: ${name}`);
    } catch (err) {
      console.error(`[FAIL] Test #${testCount}: ${name} — Error:`, err.message);
    }
  };

  const runAsyncTest = async (name, testFn) => {
    testCount++;
    try {
      await testFn();
      passCount++;
      console.log(`[PASS] Test #${testCount}: ${name}`);
    } catch (err) {
      console.error(`[FAIL] Test #${testCount}: ${name} — Error:`, err.message);
    }
  };

  // 1. PRIMARY WAKE PHRASES & DIRECT DISTRESS TRIGGERS
  runTest('1. "Hey Suraksha" -> trigger', () => {
    assert.strictEqual(isEmergencyPhrase('Hey Suraksha'), true);
  });

  runTest('2. "Hey Suraksha AI" -> trigger', () => {
    assert.strictEqual(isEmergencyPhrase('Hey Suraksha AI'), true);
  });

  runTest('3. "Hi Suraksha" -> trigger', () => {
    assert.strictEqual(isEmergencyPhrase('Hi Suraksha'), true);
  });

  runTest('4. "Help me" -> trigger', () => {
    assert.strictEqual(isEmergencyPhrase('Help me'), true);
  });

  runTest('5. "Help" -> trigger (standalone emergency command)', () => {
    assert.strictEqual(isEmergencyPhrase('Help'), true);
  });

  runTest('6. "Emergency help" -> trigger', () => {
    assert.strictEqual(isEmergencyPhrase('Emergency help'), true);
  });

  runTest('7. "I need help" -> trigger', () => {
    assert.strictEqual(isEmergencyPhrase('I need help'), true);
  });

  runTest('8. "Someone help me" -> trigger', () => {
    assert.strictEqual(isEmergencyPhrase('Someone help me'), true);
  });

  runTest('9. "Please help me" -> trigger', () => {
    assert.strictEqual(isEmergencyPhrase('Please help me'), true);
  });

  // 2. FALSE POSITIVE PROTECTION TESTS
  runTest('10. "Help me understand Section 173" -> NO trigger', () => {
    assert.strictEqual(isEmergencyPhrase('Help me understand Section 173'), false);
  });

  runTest('11. "Can you help me with homework?" -> NO trigger', () => {
    assert.strictEqual(isEmergencyPhrase('Can you help me with homework?'), false);
  });

  runTest('12. "Can you help me find my profile?" -> NO trigger', () => {
    assert.strictEqual(isEmergencyPhrase('Can you help me find my profile?'), false);
  });

  runTest('13. "Help me understand this route." -> NO trigger', () => {
    assert.strictEqual(isEmergencyPhrase('Help me understand this route.'), false);
  });

  runTest('14. "What does emergency mean?" -> NO trigger', () => {
    assert.strictEqual(isEmergencyPhrase('What does emergency mean?'), false);
  });

  runTest('15. "What is Suraksha AI?" -> NO trigger', () => {
    assert.strictEqual(isEmergencyPhrase('What is Suraksha AI?'), false);
  });

  runTest('16. "Explain the word help." -> NO trigger', () => {
    assert.strictEqual(isEmergencyPhrase('Explain the word help.'), false);
  });

  runTest('17. "Tell me about emergency services." -> NO trigger', () => {
    assert.strictEqual(isEmergencyPhrase('Tell me about emergency services.'), false);
  });

  runTest('18. "I am learning about domestic violence." -> NO trigger', () => {
    assert.strictEqual(isEmergencyPhrase('I am learning about domestic violence.'), false);
  });

  runTest('19. "Help me understand this legal case." -> NO trigger', () => {
    assert.strictEqual(isEmergencyPhrase('Help me understand this legal case.'), false);
  });

  // 3. BACKEND EMERGENCY DEDUPLICATION & CONVERGENCE
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('\n✅ Connected to MongoDB Atlas for Backend Emergency Convergence Testing');

  const testUser = await User.create({
    name: 'Global Voice SOS User',
    email: `global_voice_${Date.now()}@suraksha.ai`,
    passwordHash: 'hash',
    phone: '+919997776660'
  });

  await runAsyncTest('20. Voice SOS & Manual SOS converge into single active EmergencyEvent (409 Conflict)', async () => {
    const voiceEmergency = await emergencyService.createEmergency(testUser._id, {
      triggerType: 'voice',
      signals: [{ type: 'voice_distress', points: 30 }]
    });

    assert.strictEqual(voiceEmergency.triggerType, 'voice');
    assert.strictEqual(voiceEmergency.status, 'active');

    // Attempting to trigger manual SOS while voice emergency is active must be rejected by backend
    try {
      await emergencyService.createEmergency(testUser._id, {
        triggerType: 'manual'
      });
      assert.fail('Should have thrown conflict error for duplicate emergency');
    } catch (err) {
      assert(err.statusCode === 409 || err.message.includes('Active emergency already exists'));
    }

    // Resolve active emergency
    const resolved = await emergencyService.resolveEmergency(testUser._id, voiceEmergency.id);
    assert.strictEqual(resolved.status, 'resolved');
  });

  // Cleanup
  await EmergencyEvent.deleteMany({ user: testUser._id });
  await User.deleteMany({ _id: testUser._id });

  console.log(`\n======================================================`);
  console.log(`Global Voice SOS Test Summary: ${passCount} / ${testCount} PASSED`);
  console.log(`======================================================\n`);

  await mongoose.disconnect();
  process.exit(passCount === testCount ? 0 : 1);
}

runGlobalVoiceSOSTests();
