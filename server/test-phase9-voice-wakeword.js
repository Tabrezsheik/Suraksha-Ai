const assert = require('assert');
const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const User = require('./models/User');
const EmergencyEvent = require('./models/EmergencyEvent');
const emergencyService = require('./services/emergencyService');

// Import phrase detection logic from useVoiceSOS hook
const { isEmergencyPhrase } = require('../web/hooks/useVoiceSOS');

async function runVoiceWakeWordTests() {
  console.log('======================================================');
  console.log('🚀 RUNNING PHASE 9 VOICE WAKE-WORD ("HEY SURAKSHA") TEST SUITE');
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

  // 1. WAKE WORD VARIANT TESTS
  runTest('Wake Word: "hey suraksha" -> emergency intent', () => {
    assert.strictEqual(isEmergencyPhrase('hey suraksha'), true);
  });

  runTest('Wake Word: "Hey Suraksha" (capitalized) -> emergency intent', () => {
    assert.strictEqual(isEmergencyPhrase('Hey Suraksha'), true);
  });

  runTest('Wake Word: "hey suraksha!" (punctuation) -> emergency intent', () => {
    assert.strictEqual(isEmergencyPhrase('hey suraksha!'), true);
  });

  runTest('Wake Word: "hey suraksha help me" -> emergency intent', () => {
    assert.strictEqual(isEmergencyPhrase('hey suraksha help me'), true);
  });

  runTest('Wake Word: "hey suraksha i need help" -> emergency intent', () => {
    assert.strictEqual(isEmergencyPhrase('hey suraksha i need help'), true);
  });

  runTest('Wake Word: "hey suraksha I\'m in danger" -> emergency intent', () => {
    assert.strictEqual(isEmergencyPhrase("hey suraksha I'm in danger"), true);
  });

  runTest('Wake Word: "Hey Suraksha, save me" -> emergency intent', () => {
    assert.strictEqual(isEmergencyPhrase('Hey Suraksha, save me'), true);
  });

  runTest('Wake Word: "Hey Suraksha, protect me" -> emergency intent', () => {
    assert.strictEqual(isEmergencyPhrase('Hey Suraksha, protect me'), true);
  });

  runTest('Wake Word: "Hey Suraksha AI" -> emergency intent', () => {
    assert.strictEqual(isEmergencyPhrase('Hey Suraksha AI'), true);
  });

  runTest('Wake Word: "Hi Suraksha" -> emergency intent', () => {
    assert.strictEqual(isEmergencyPhrase('Hi Suraksha'), true);
  });

  // 2. FALSE POSITIVE PROTECTION TESTS
  runTest('False Positive: "suraksha" alone -> NOT emergency', () => {
    assert.strictEqual(isEmergencyPhrase('suraksha'), false);
  });

  runTest('Direct Distress: "help" alone -> emergency intent', () => {
    assert.strictEqual(isEmergencyPhrase('help'), true);
  });

  runTest('False Positive: "hey" alone -> NOT emergency', () => {
    assert.strictEqual(isEmergencyPhrase('hey'), false);
  });

  runTest('False Positive: "security" alone -> NOT emergency', () => {
    assert.strictEqual(isEmergencyPhrase('security'), false);
  });

  runTest('False Positive: "danger" alone -> NOT emergency', () => {
    assert.strictEqual(isEmergencyPhrase('danger'), false);
  });

  runTest('False Positive: "emergency" alone -> NOT emergency', () => {
    assert.strictEqual(isEmergencyPhrase('emergency'), false);
  });

  runTest('False Positive: "what is suraksha ai?" -> NOT emergency', () => {
    assert.strictEqual(isEmergencyPhrase('what is suraksha ai?'), false);
  });

  runTest('False Positive: "tell me about suraksha" -> NOT emergency', () => {
    assert.strictEqual(isEmergencyPhrase('tell me about suraksha'), false);
  });

  runTest('False Positive: "what does emergency mean?" -> NOT emergency', () => {
    assert.strictEqual(isEmergencyPhrase('what does emergency mean?'), false);
  });

  runTest('False Positive: "help me understand Section 173" -> NOT emergency', () => {
    assert.strictEqual(isEmergencyPhrase('help me understand Section 173'), false);
  });

  runTest('False Positive: "can you help me with homework?" -> NOT emergency', () => {
    assert.strictEqual(isEmergencyPhrase('can you help me with homework?'), false);
  });

  runTest('False Positive: "Hey Suraksha, what is BNSS Section 173?" -> NOT emergency (chat question)', () => {
    assert.strictEqual(isEmergencyPhrase('Hey Suraksha, what is BNSS Section 173?'), false);
  });

  // 3. LEGACY DIRECT DISTRESS PHRASES
  runTest('Legacy Phrase: "help me" -> emergency intent', () => {
    assert.strictEqual(isEmergencyPhrase('help me'), true);
  });

  runTest('Legacy Phrase: "save me" -> emergency intent', () => {
    assert.strictEqual(isEmergencyPhrase('save me'), true);
  });

  runTest('Legacy Phrase: "i\'m in danger" -> emergency intent', () => {
    assert.strictEqual(isEmergencyPhrase("i'm in danger"), true);
  });

  // 4. BACKEND EMERGENCY DEDUPLICATION & VOICE LIFECYCLE
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('\n✅ Connected to MongoDB Atlas for Deduplication & Service Testing');

  const testUser = await User.create({
    name: 'Voice WakeWord Test User',
    email: `voice_test_${Date.now()}@suraksha.ai`,
    passwordHash: 'hash',
    phone: '+919998887770'
  });

  await runAsyncTest('Voice SOS: Creates active EmergencyEvent with triggerType: "voice"', async () => {
    const emergency = await emergencyService.createEmergency(testUser._id, {
      triggerType: 'voice',
      signals: [{ type: 'voice_distress', points: 30 }]
    });

    assert.strictEqual(emergency.triggerType, 'voice');
    assert.strictEqual(emergency.status, 'active');
  });

  await runAsyncTest('Deduplication: Prevents duplicate active EmergencyEvent (409 Conflict)', async () => {
    try {
      await emergencyService.createEmergency(testUser._id, {
        triggerType: 'voice'
      });
      assert.fail('Should have thrown conflict error for active emergency');
    } catch (err) {
      assert(err.statusCode === 409 || err.message.includes('Active emergency already exists'));
    }
  });

  await runAsyncTest('Resolution: Resolves active emergency cleanly', async () => {
    const active = await emergencyService.getActiveEmergency(testUser._id);
    assert(active, 'Active emergency must exist');
    const resolved = await emergencyService.resolveEmergency(testUser._id, active.id);
    assert.strictEqual(resolved.status, 'resolved');
  });

  // Cleanup
  await EmergencyEvent.deleteMany({ user: testUser._id });
  await User.deleteMany({ _id: testUser._id });

  console.log(`\n======================================================`);
  console.log(`Voice Wake-Word Test Summary: ${passCount} / ${testCount} PASSED`);
  console.log(`======================================================\n`);

  await mongoose.disconnect();
  process.exit(passCount === testCount ? 0 : 1);
}

runVoiceWakeWordTests();
