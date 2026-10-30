const assert = require('assert');
const mongoose = require('mongoose');
const express = require('express');
const http = require('http');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const User = require('./models/User');
const EmergencyEvent = require('./models/EmergencyEvent');
const EvidenceMetadata = require('./models/EvidenceMetadata');
const Notification = require('./models/Notification');
const TrustedContact = require('./models/TrustedContact');
const legalRagService = require('./services/legalRagService');
const assistantService = require('./services/assistantService');
const evidenceService = require('./services/evidenceService');
const notificationService = require('./services/notificationService');
const authService = require('./services/authService');

async function runPhase9Tests() {
  console.log('======================================================');
  console.log('🚀 RUNNING PHASE 9 AI ASSISTANT, VOICE SOS, LEGAL RAG & EVIDENCE TESTS');
  console.log('======================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB Atlas');

  let passCount = 0;
  let testCount = 0;

  const runTest = async (name, testFn) => {
    testCount++;
    try {
      await testFn();
      passCount++;
      console.log(`[PASS] Test #${testCount}: ${name}`);
    } catch (err) {
      console.error(`[FAIL] Test #${testCount}: ${name} — Error:`, err.message);
    }
  };

  // Setup test user & contact
  const testEmail = `phase9_test_${Date.now()}@suraksha.ai`;
  const user = await User.create({
    name: 'Phase 9 Test User',
    email: testEmail,
    passwordHash: '$2a$10$e8wF5.8W2dF5k5j6h7g8u.a1b2c3d4e5f6g7h8i9j0',
    phone: '+919876543210'
  });

  const contact = await TrustedContact.create({
    user: user._id,
    name: 'Guardian Contact',
    phone: '+919876543211',
    relationship: 'parent',
    isActive: true,
    fcmToken: 'test_fcm_token_medimate_5af1e'
  });

  const token = authService.generateToken(user);

  // 1. Legal RAG AP High Court Retrieval Tests
  await runTest('Legal RAG: Returns AP High Court (Court 28~2, 2025/2026) precedent for domestic violence query', async () => {
    const rag = await legalRagService.queryJudgments('My husband is threatening me under PWDVA');
    assert.strictEqual(rag.status, 'SUCCESS');
    assert.strictEqual(rag.courtCode, '28~2');
    assert.strictEqual(rag.court, 'High Court of Andhra Pradesh');
    assert(Array.isArray(rag.years) && (rag.years.includes(2025) || rag.years.includes(2026)));
    assert(rag.judgments.length > 0);
    assert(['[OFFICIAL / COURT SOURCE]', '[DATASET SOURCE]'].includes(rag.judgments[0].provenanceTag));
    assert(rag.disclaimer.includes('not a substitute for advice from a qualified lawyer'));
  });

  await runTest('Legal RAG: Strictly filters decision years to 2025 and 2026 only', async () => {
    const rag = await legalRagService.queryJudgments('stalking and police complaint');
    assert(rag.judgments.every(j => j.decisionYear === 2025 || j.decisionYear === 2026));
  });

  // 2. AI Safety Assistant Processing Tests
  await runTest('assistantService: Classifies emergency intent for distress phrase "help me, in danger"', async () => {
    const res = await assistantService.processChatQuery(user, 'Help me, I am in danger!');
    assert.strictEqual(res.emergencyDetected, true);
    assert.strictEqual(res.emergencyTriggerRecommended, true);
    assert(res.safetyAdvice.length > 0);
  });

  await runTest('assistantService: Returns non-emergency legal guidance for informational questions', async () => {
    const res = await assistantService.processChatQuery(user, 'What is the procedure for filing a domestic violence protection order?');
    assert.strictEqual(res.emergencyDetected, false);
    assert(res.legalExplanation.length > 0);
    assert(res.legalRagResult.judgments.length > 0);
  });

  // 3. Voice SOS Integration Test
  await runTest('Voice SOS: Creates active EmergencyEvent with triggerType: "voice"', async () => {
    const emergencyService = require('./services/emergencyService');
    const emergency = await emergencyService.createEmergency(user._id, {
      triggerType: 'voice',
      signals: [{ type: 'voice_stress', points: 25 }]
    });

    assert.strictEqual(emergency.triggerType, 'voice');
    assert.strictEqual(emergency.status, 'active');
    assert.strictEqual(emergency.trustedContactsNotified, true);
  });

  // 4. Emergency Evidence Capture & Storage Tests
  await runTest('evidenceService: Saves audio evidence metadata and appends timeline entry', async () => {
    const emergency = await EmergencyEvent.findOne({ user: user._id, status: 'active' });
    assert(emergency, 'Active emergency must exist');

    const sampleBase64 = 'data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwEAAAAA';
    const evidence = await evidenceService.saveAudioEvidence({
      userId: user._id,
      emergencyId: emergency._id,
      audioBuffer: sampleBase64,
      mimeType: 'audio/webm',
      durationSeconds: 10
    });

    assert.strictEqual(evidence.evidenceType, 'audio');
    assert.strictEqual(evidence.durationSeconds, 10);
    assert.strictEqual(evidence.provenanceClass, 'USER_RECORDED');
    assert(evidence.sha256Checksum.length > 0);

    const updatedEmergency = await EmergencyEvent.findById(emergency._id);
    const hasTimeline = updatedEmergency.timeline.some(t => (t.message || t.description || '').includes('Emergency audio evidence captured'));
    assert(hasTimeline, 'Emergency timeline must record evidence capture');
  });

  await runTest('evidenceService: Enforces ownership protection (403 for unauthorized user)', async () => {
    const otherUser = await User.create({
      name: 'Unauthorized User',
      email: `unauth_${Date.now()}@example.com`,
      passwordHash: 'hash'
    });
    const emergency = await EmergencyEvent.findOne({ user: user._id, status: 'active' });

    try {
      await evidenceService.getEmergencyEvidence(otherUser._id, emergency._id);
      assert.fail('Should have thrown 403 error');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
    }
  });

  // 5. Firebase Notifications & Trusted Circle Tests
  await runTest('notificationService: Dispatches Firebase/Trusted Circle alerts (Project medimate-5af1e)', async () => {
    const emergency = await EmergencyEvent.findOne({ user: user._id, status: 'active' });
    const notifications = await notificationService.dispatchEmergencyNotifications(user, emergency);

    assert(notifications.length > 0);
    assert.strictEqual(notifications[0].user.toString(), user._id.toString());
    assert(['SENT', 'DELIVERED', 'UNKNOWN', 'FAILED', 'PENDING'].includes(notifications[0].status));
  });

  await runTest('notificationService: Updates notification status to READ upon markAsRead', async () => {
    const notif = await Notification.findOne({ user: user._id });
    assert(notif, 'Notification must exist');

    const updated = await notificationService.markAsRead(user._id, notif._id);
    assert.strictEqual(updated.status, 'READ');
    assert(updated.readAt !== null);
  });

  // Clean up test data
  await EvidenceMetadata.deleteMany({ user: user._id });
  await Notification.deleteMany({ user: user._id });
  await EmergencyEvent.deleteMany({ user: user._id });
  await TrustedContact.deleteMany({ user: user._id });
  await User.deleteMany({ _id: user._id });

  console.log(`\n======================================================`);
  console.log(`Phase 9 Verification Summary: ${passCount} / ${testCount} PASSED`);
  console.log(`======================================================\n`);

  await mongoose.disconnect();
  process.exit(passCount === testCount ? 0 : 1);
}

runPhase9Tests();
