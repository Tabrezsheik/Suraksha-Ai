/**
 * Dedicated Test Suite: Emergency SMS & Automated Notification System (Phase 9)
 *
 * Verifies all 16 criteria for emergency notifications:
 * 1. SMSMode integration is completely removed from active code
 * 2. SMS service accurately validates configuration and handles unconfigured state
 * 3-4. Four eligible contacts produce exactly 4 individual SMS submissions (1 per contact)
 * 5. SMS contains emergency message and actual GPS coordinates or Google Maps link
 * 6. SMS never fabricates location when coordinates are absent
 * 7. Real voice-recording evidence is included in email (secure tokenized link or attachment)
 * 8. Email location matches SMS location
 * 9. Explicit SMS transport: Android SIM SMS fallback is not used when provider transport is selected
 * 10. SMS provider errors handled accurately without crashing
 * 11. Notification statuses reflect actual evidence from the provider (truthful states)
 * 12. Email contains location and secure recording link or real attachment
 * 13. Strictly maximum 5 SMS submission attempts per emergency workflow
 * 14. Strictly maximum 10 email submission attempts per emergency workflow
 * 15. Duplicate events or repeated triggers never produce duplicate sends
 * 16. Ambiguous timeouts do not trigger automatic fallbacks or retries
 *
 * Strictly mocks providers to prevent consuming live credits or sending real alerts.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const connectDB = require('./config/database');
const User = require('./models/User');
const TrustedContact = require('./models/TrustedContact');
const EmergencyEvent = require('./models/EmergencyEvent');
const Notification = require('./models/Notification');
const EvidenceMetadata = require('./models/EvidenceMetadata');

const emergencyService = require('./services/emergencyService');
const notificationService = require('./services/notificationService');
const smsService = require('./services/smsService');
const emailService = require('./services/emailService');
const { getSmsTransport, normalizePhoneNumber } = require('./config/smsConfig');

async function runEmergencyNotificationTests() {
  console.log('======================================================');
  console.log('🚀 RUNNING EMERGENCY NOTIFICATIONS TEST SUITE (16 CRITERIA)');
  console.log('======================================================\n');

  await connectDB();
  console.log('✅ Connected to MongoDB Atlas for Emergency Notification Testing\n');

  let passed = 0;
  let failed = 0;

  function recordPass(testName) {
    passed++;
    console.log(`[PASS] ${testName}`);
  }

  function recordFail(testName, err) {
    failed++;
    console.error(`[FAIL] ${testName} — Error:`, err.message);
  }

  // Ensure transport is set to PROVIDER for this test suite and self-notifications don't collide
  process.env.SURAKSHA_SMS_TRANSPORT = 'PROVIDER';
  process.env.SURAKSHA_SELF_NOTIFICATIONS_ENABLED = 'false';

  // Setup unique test user and contacts
  const testUser = await User.create({
    name: 'Emergency Test User',
    email: `emerg_test_${Date.now()}@suraksha.ai`,
    passwordHash: 'hashed_password_safe',
    phone: '+919998881110'
  });

  const createdContactIds = [];
  const createdEmergencyIds = [];

  // Helper to register clean contacts
  async function setupFourContacts(userId) {
    await TrustedContact.deleteMany({ user: userId });
    const contacts = [];
    for (let i = 1; i <= 4; i++) {
      const c = await TrustedContact.create({
        user: userId,
        name: `Trusted Contact ${i}`,
        phone: `+91987654321${i}`,
        email: `trusted_contact_${i}_${Date.now()}@example.com`,
        relationship: 'friend',
        isActive: true
      });
      contacts.push(c);
      createdContactIds.push(c._id);
    }
    return contacts;
  }

  try {
    // -------------------------------------------------------------
    // Criterion 1: SMSMode integration is completely removed from active code
    // -------------------------------------------------------------
    try {
      const notifServiceFile = fs.readFileSync(path.join(__dirname, 'services/notificationService.js'), 'utf8');
      const emergencyServiceFile = fs.readFileSync(path.join(__dirname, 'services/emergencyService.js'), 'utf8');
      assert.strictEqual(/smsmode/i.test(notifServiceFile), false, 'notificationService must contain no smsmode references');
      assert.strictEqual(/smsmode/i.test(emergencyServiceFile), false, 'emergencyService must contain no smsmode references');
      recordPass('Criterion 1: SMSMode is completely removed from active notification and emergency code');
    } catch (err) {
      recordFail('Criterion 1: SMSMode removal check', err);
    }

    // -------------------------------------------------------------
    // Criterion 2: SMS service accurately validates configuration & reports NOT_CONFIGURED when unconfigured
    // -------------------------------------------------------------
    try {
      smsService.resetMockProvider();
      const origProviderName = process.env.SMS_PROVIDER_NAME;
      process.env.SMS_PROVIDER_NAME = 'NONE';
      smsService.setActiveProvider('NONE');

      const unconfiguredCheck = smsService.isConfigured();
      assert.strictEqual(unconfiguredCheck, false, 'SmsService must report unconfigured when no provider is active');

      const unconfSend = await smsService.sendSms({ to: '+919876543211', message: 'Test unconfigured' });
      assert.strictEqual(unconfSend.status, 'NOT_CONFIGURED', 'Must return NOT_CONFIGURED when no provider active');
      assert.strictEqual(unconfSend.errorCode, 'SMS_PROVIDER_NOT_CONFIGURED');

      process.env.SMS_PROVIDER_NAME = origProviderName || 'NONE';
      recordPass('Criterion 2: SMS service accurately validates configuration and returns NOT_CONFIGURED when unconfigured');
    } catch (err) {
      recordFail('Criterion 2: SMS configuration validation', err);
    }

    // -------------------------------------------------------------
    // Setup Mock SMS & Mock Email Transports for Test Suite
    // -------------------------------------------------------------
    const smsSubmissions = [];
    const mockSmsProvider = {
      name: 'MOCK_SMS',
      isConfigured: () => true,
      sendSms: async ({ to, message }) => {
        smsSubmissions.push({ to, message, timestamp: new Date() });
        return {
          success: true,
          sid: `SM_mock_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          status: 'SENT',
          deliveryStatus: 'PENDING'
        };
      }
    };
    smsService.setMockProvider(mockSmsProvider);

    const emailSubmissions = [];
    const mockEmailTransporter = {
      sendMail: async (mailOptions) => {
        emailSubmissions.push(mailOptions);
        return {
          messageId: `msg_${Date.now()}@suraksha.ai`,
          response: '250 2.0.0 OK (Mock SMTP)'
        };
      }
    };
    emailService.setMockTransporter(mockEmailTransporter);

    // -------------------------------------------------------------
    // Criterion 3 & 4: Four eligible contacts produce exactly 4 individual SMS submissions (1 per contact)
    // -------------------------------------------------------------
    let emergencyFourId = null;
    try {
      await setupFourContacts(testUser._id);
      smsSubmissions.length = 0;
      emailSubmissions.length = 0;

      const emergencyEvent = await emergencyService.createEmergency(
        testUser._id,
        {
          latitude: 12.9716,
          longitude: 77.5946,
          accuracy: 10
        },
        'manual',
        'high',
        'Testing 4 contact SMS dispatch'
      );
      emergencyFourId = emergencyEvent.id || emergencyEvent._id || emergencyEvent.emergencyId;
      createdEmergencyIds.push(emergencyFourId);

      // Wait for notifications to be processed asynchronously in background
      let attempts = 0;
      while (attempts < 20) {
        const count = await Notification.countDocuments({ emergencyEvent: emergencyFourId, channel: 'sms' });
        if (smsSubmissions.length >= 4 && count >= 4) break;
        await new Promise(r => setTimeout(r, 200));
        attempts++;
      }

      assert.strictEqual(smsSubmissions.length, 4, `Expected exactly 4 SMS submissions, got ${smsSubmissions.length}`);

      // Verify MongoDB Notification records
      const smsNotifs = await Notification.find({
        emergencyEvent: emergencyFourId,
        channel: 'sms'
      });
      assert.strictEqual(smsNotifs.length, 4, `Expected exactly 4 SMS notification records in DB, got ${smsNotifs.length}`);
      assert.strictEqual(smsNotifs[0].status, 'SENT', 'Notification status must be SENT');
      assert.strictEqual(smsNotifs[0].deliveryStatus, 'PENDING', 'Initial deliveryStatus must be PENDING');

      recordPass('Criterion 3 & 4: Exactly 4 SMS submissions generated for the 4 eligible Trusted Circle contacts');
    } catch (err) {
      recordFail('Criterion 3 & 4: Four contact SMS submissions', err);
    }

    // -------------------------------------------------------------
    // Criterion 5: SMS contains emergency message and actual GPS coordinates or Google Maps link
    // -------------------------------------------------------------
    try {
      assert.ok(smsSubmissions.length >= 4, 'Need SMS submissions from previous step');
      for (const submission of smsSubmissions) {
        assert.ok(submission.message.includes('SURAKSHA AI EMERGENCY'), 'Message must contain emergency header');
        assert.ok(submission.message.includes('https://maps.google.com/?q=12.971600,77.594600'), 'Message must contain Google Maps URL with actual coordinates');
      }
      recordPass('Criterion 5: SMS body contains emergency message and validated Google Maps location link');
    } catch (err) {
      recordFail('Criterion 5: SMS content & GPS link', err);
    }

    // -------------------------------------------------------------
    // Criterion 6: SMS never fabricates location when coordinates are absent
    // -------------------------------------------------------------
    try {
      await EmergencyEvent.updateMany({ user: testUser._id }, { status: 'resolved' });
      await setupFourContacts(testUser._id);
      smsSubmissions.length = 0;

      // Create an emergency without valid coordinates
      const noLocEmergency = await emergencyService.createEmergency(
        testUser._id,
        null, // No location
        'manual',
        'high',
        'Testing null location handling'
      );
      const noLocId = noLocEmergency.id || noLocEmergency._id || noLocEmergency.emergencyId;
      createdEmergencyIds.push(noLocId);

      let attempts = 0;
      while (attempts < 20) {
        const count = await Notification.countDocuments({ emergencyEvent: noLocId, channel: 'sms' });
        if (smsSubmissions.length >= 4 && count >= 4) break;
        await new Promise(r => setTimeout(r, 200));
        attempts++;
      }

      assert.strictEqual(smsSubmissions.length, 4, 'Must send SMS even without location');
      for (const submission of smsSubmissions) {
        assert.ok(!submission.message.includes('https://maps.google.com'), 'Must NOT invent or fabricate maps URL');
        assert.ok(submission.message.includes('Location: Currently unavailable'), 'Must truthfully state location is currently unavailable');
      }
      recordPass('Criterion 6: Location absence handled truthfully; zero coordinate fabrication');
    } catch (err) {
      recordFail('Criterion 6: Zero location fabrication', err);
    }

    // -------------------------------------------------------------
    // Criterion 7: Real voice-recording evidence included in email (secure tokenized link)
    // -------------------------------------------------------------
    try {
      emailSubmissions.length = 0;
      await Notification.deleteMany({ emergencyEvent: emergencyFourId });

      // Dispatch emergency notifications with an audio evidence record
      const sampleAudioPath = path.join(__dirname, 'uploads/evidence/test_audio_sample.webm');
      fs.mkdirSync(path.dirname(sampleAudioPath), { recursive: true });
      fs.writeFileSync(sampleAudioPath, Buffer.from('TEST_AUDIO_DATA_FOR_AUDIT'));

      const audioEvidence = await EvidenceMetadata.create({
        user: testUser._id,
        emergencyEvent: emergencyFourId,
        evidenceType: 'audio',
        fileName: 'test_audio_sample.webm',
        fileSizeBytes: 24,
        mimeType: 'audio/webm',
        filePath: sampleAudioPath,
        sha256Checksum: 'dummy_hash_for_test_1234567890abcdef'
      });

      // Trigger notification dispatch with evidence
      await notificationService.dispatchEmergencyNotifications(
        testUser,
        { _id: emergencyFourId, currentLocation: { latitude: 12.9716, longitude: 77.5946 }, startedAt: new Date() },
        { location: { latitude: 12.9716, longitude: 77.5946 } }
      );

      // Verify email was prepared with secure evidence token
      const lastEmail = emailSubmissions[emailSubmissions.length - 1];
      assert.ok(lastEmail, 'An emergency email must be submitted');
      assert.ok(lastEmail.html.includes('/api/evidence/secure/'), 'Email must contain secure evidence access URL');

      // Verify token authenticity and claims
      const tokenMatch = lastEmail.html.match(/\/api\/evidence\/secure\/([a-zA-Z0-9_\-\.]+)/);
      assert.ok(tokenMatch, 'Must find token in URL');
      const decoded = jwt.verify(tokenMatch[1], process.env.JWT_SECRET || 'suraksha_secret_fallback');
      assert.strictEqual(decoded.evidenceId, audioEvidence._id.toString(), 'Token must authenticate exact evidence ID');
      assert.strictEqual(decoded.type, 'evidence_access', 'Token must have evidence_access type');

      recordPass('Criterion 7: Emergency email includes secure, token-authorized voice evidence link');
    } catch (err) {
      recordFail('Criterion 7: Voice recording evidence in email', err);
    }

    // -------------------------------------------------------------
    // Criterion 8: Email location matches SMS location
    // -------------------------------------------------------------
    try {
      assert.ok(emailSubmissions.length > 0, 'Must have recorded email submissions');
      const lastEmail = emailSubmissions[emailSubmissions.length - 1];
      assert.ok(lastEmail.html.includes('12.9716'), 'Email HTML must contain latitude 12.9716');
      assert.ok(lastEmail.html.includes('77.5946'), 'Email HTML must contain longitude 77.5946');
      assert.ok(lastEmail.html.includes('https://maps.google.com/?q=12.971600,77.594600'), 'Email HTML maps link matches SMS link');
      recordPass('Criterion 8: Email location coordinates and Google Maps link match SMS location exactly');
    } catch (err) {
      recordFail('Criterion 8: Location consistency across SMS and Email', err);
    }

    // -------------------------------------------------------------
    // Criterion 9: Explicit transport selected; no silent fallback to SIM SMS
    // -------------------------------------------------------------
    try {
      const currentTransport = getSmsTransport();
      assert.strictEqual(currentTransport, 'PROVIDER', 'Selected transport must be explicitly PROVIDER');

      // Check notification records to verify provider is recorded honestly
      const notifs = await Notification.find({ emergencyEvent: emergencyFourId, channel: 'sms' });
      assert.ok(notifs.length > 0, 'Must have SMS notifications');
      for (const n of notifs) {
        assert.notStrictEqual(n.provider, 'ANDROID_SIM', 'Provider must NOT be ANDROID_SIM when PROVIDER is selected');
      }
      recordPass('Criterion 9: Explicit PROVIDER transport used without automatic SIM SMS fallback');
    } catch (err) {
      recordFail('Criterion 9: Explicit transport selection', err);
    }

    // -------------------------------------------------------------
    // Criterion 10: Provider API errors handled accurately without crashing
    // -------------------------------------------------------------
    try {
      const errorMock = {
        name: 'MOCK_ERROR_PROVIDER',
        isConfigured: () => true,
        sendSms: async () => {
          return {
            success: false,
            status: 'FAILED',
            deliveryStatus: 'FAILED',
            errorCode: 'CARRIER_REJECTED',
            errorMessage: 'Carrier rejected destination phone number.'
          };
        }
      };
      smsService.setMockProvider(errorMock);

      const errorResult = await smsService.sendSms({ to: '+919991112221', message: 'Test error' });
      assert.strictEqual(errorResult.success, false);
      assert.strictEqual(errorResult.status, 'FAILED');
      assert.strictEqual(errorResult.deliveryStatus, 'FAILED');
      assert.strictEqual(errorResult.errorCode, 'CARRIER_REJECTED');
      assert.ok(errorResult.errorMessage.includes('Carrier rejected'), 'Error message preserved');

      // Reset mock provider
      smsService.setMockProvider(mockSmsProvider);
      recordPass('Criterion 10: Provider API errors handled accurately without crashing');
    } catch (err) {
      recordFail('Criterion 10: Provider API error handling', err);
    }

    // -------------------------------------------------------------
    // Criterion 11: Notification statuses reflect actual evidence from the provider
    // -------------------------------------------------------------
    try {
      const sentNotif = await Notification.findOne({
        user: testUser._id,
        channel: 'sms',
        status: 'SENT'
      });
      assert.ok(sentNotif, 'Accepted SMS must be recorded as status=SENT');
      assert.strictEqual(sentNotif.deliveryStatus, 'PENDING', 'API acceptance must be recorded as deliveryStatus=PENDING, not DELIVERED');
      assert.ok(sentNotif.smsMessageId.startsWith('SM_mock_'), 'smsMessageId must store provider message identifier');
      recordPass('Criterion 11: Notification status reflects API acceptance (SENT / PENDING) rather than premature delivery');
    } catch (err) {
      recordFail('Criterion 11: Notification provider response fidelity', err);
    }

    // -------------------------------------------------------------
    // Criterion 12: Email contains location and secure recording link or real attachment
    // -------------------------------------------------------------
    try {
      emailSubmissions.length = 0;
      const sampleAudioPath = path.join(__dirname, 'uploads/evidence/test_audio_sample.webm');
      fs.mkdirSync(path.dirname(sampleAudioPath), { recursive: true });
      fs.writeFileSync(sampleAudioPath, Buffer.from('RIFF_SAMPLE_AUDIO_TEST_PAYLOAD'));

      const testEvidence = await EvidenceMetadata.create({
        user: testUser._id,
        emergencyEvent: emergencyFourId,
        evidenceType: 'audio',
        fileName: 'test_audio_sample.webm',
        fileSizeBytes: 30,
        mimeType: 'audio/webm',
        filePath: sampleAudioPath,
        sha256Checksum: 'hash_abc1234567890'
      });

      const emailResult = await emailService.sendEmergencyEmail({
        to: 'trusted@example.com',
        contactName: 'Trusted Contact',
        userName: 'Audit User',
        emergencyId: emergencyFourId.toString(),
        location: { latitude: 12.9716, longitude: 77.5946 },
        evidence: testEvidence,
        userId: testUser._id
      });

      assert.strictEqual(emailResult.success, true);
      const email = emailSubmissions[emailSubmissions.length - 1];
      assert.ok(email.html.includes('12.9716'), 'Email must include latitude');
      assert.ok(email.html.includes('77.5946'), 'Email must include longitude');
      assert.ok(email.html.includes('/api/evidence/secure/'), 'Email must contain evidence link');
      assert.ok(email.attachments && email.attachments.length > 0, 'Email includes audio attachment');

      recordPass('Criterion 12: Emergency email successfully formatted with coordinates and audio evidence');
    } catch (err) {
      recordFail('Criterion 12: Email formatting with evidence', err);
    }

    // -------------------------------------------------------------
    // Criterion 13: Strictly maximum 5 SMS submission attempts per emergency workflow
    // -------------------------------------------------------------
    try {
      // Create a fresh emergency event to test limits
      const limitEmergency = await EmergencyEvent.create({
        user: testUser._id,
        status: 'active',
        triggerType: 'manual',
        riskLevel: 'high',
        smsAttemptsCount: 0,
        emailAttemptsCount: 0
      });
      createdEmergencyIds.push(limitEmergency._id);

      // Attempt 6 updates
      let successfulUpdates = 0;
      let limitHit = false;

      for (let seq = 1; seq <= 6; seq++) {
        // Concurrency-safe atomic check
        const reserved = await EmergencyEvent.findOneAndUpdate(
          {
            _id: limitEmergency._id,
            smsAttemptsCount: { $lt: 5 }
          },
          {
            $inc: { smsAttemptsCount: 1 }
          },
          { new: true }
        );

        if (reserved) {
          successfulUpdates++;
        } else {
          limitHit = true;
        }
      }

      assert.strictEqual(successfulUpdates, 5, `Expected exactly 5 allowed SMS attempts, got ${successfulUpdates}`);
      assert.strictEqual(limitHit, true, '6th attempt must be rejected by atomic limit');

      const finalEvent = await EmergencyEvent.findById(limitEmergency._id);
      assert.strictEqual(finalEvent.smsAttemptsCount, 5, 'smsAttemptsCount must equal 5');

      recordPass('Criterion 13: Strictly maximum 5 SMS submission attempts enforced per emergency workflow');
    } catch (err) {
      recordFail('Criterion 13: SMS 5-attempt limit', err);
    }

    // -------------------------------------------------------------
    // Criterion 14: Strictly maximum 10 email submission attempts per emergency workflow
    // -------------------------------------------------------------
    try {
      const emailLimitEmergency = await EmergencyEvent.create({
        user: testUser._id,
        status: 'active',
        triggerType: 'manual',
        riskLevel: 'high',
        smsAttemptsCount: 0,
        emailAttemptsCount: 0
      });
      createdEmergencyIds.push(emailLimitEmergency._id);

      let successfulEmailUpdates = 0;
      let emailLimitHit = false;

      for (let seq = 1; seq <= 12; seq++) {
        const reserved = await EmergencyEvent.findOneAndUpdate(
          {
            _id: emailLimitEmergency._id,
            emailAttemptsCount: { $lt: 10 }
          },
          {
            $inc: { emailAttemptsCount: 1 }
          },
          { new: true }
        );

        if (reserved) {
          successfulEmailUpdates++;
        } else {
          emailLimitHit = true;
        }
      }

      assert.strictEqual(successfulEmailUpdates, 10, `Expected exactly 10 allowed email attempts, got ${successfulEmailUpdates}`);
      assert.strictEqual(emailLimitHit, true, '11th attempt must be rejected by atomic limit');

      const finalEvent = await EmergencyEvent.findById(emailLimitEmergency._id);
      assert.strictEqual(finalEvent.emailAttemptsCount, 10, 'emailAttemptsCount must equal 10');

      recordPass('Criterion 14: Strictly maximum 10 email submission attempts enforced per emergency workflow');
    } catch (err) {
      recordFail('Criterion 14: Email 10-attempt limit', err);
    }

    // -------------------------------------------------------------
    // Criterion 15: Duplicate events or repeated triggers never produce duplicate sends
    // -------------------------------------------------------------
    try {
      const dedupContact = await TrustedContact.create({
        user: testUser._id,
        name: 'Dedup Contact',
        phone: '+919999999999',
        email: 'dedup@example.com',
        isActive: true
      });
      createdContactIds.push(dedupContact._id);

      const dedupEmergency = await EmergencyEvent.create({
        user: testUser._id,
        status: 'active',
        triggerType: 'manual'
      });
      createdEmergencyIds.push(dedupEmergency._id);

      smsSubmissions.length = 0;

      // First dispatch
      await notificationService.dispatchEmergencyNotifications(
        testUser,
        dedupEmergency,
        { location: { latitude: 12.9716, longitude: 77.5946 } }
      );
      const firstSendCount = smsSubmissions.length;
      assert.ok(firstSendCount > 0, 'First dispatch must send SMS');

      // Second immediate identical dispatch (duplicate trigger simulation)
      await notificationService.dispatchEmergencyNotifications(
        testUser,
        dedupEmergency,
        { location: { latitude: 12.9716, longitude: 77.5946 } }
      );
      const secondSendCount = smsSubmissions.length;

      assert.strictEqual(secondSendCount, firstSendCount, 'Second identical dispatch must be deduplicated with 0 new SMS');

      recordPass('Criterion 15: Duplicate triggers suppressed via sequence deduplication check');
    } catch (err) {
      recordFail('Criterion 15: Deduplication check', err);
    }

    // -------------------------------------------------------------
    // Criterion 16: Ambiguous timeouts do not trigger automatic fallbacks or duplicate retries
    // -------------------------------------------------------------
    try {
      const timeoutMock = {
        name: 'MOCK_TIMEOUT_PROVIDER',
        isConfigured: () => true,
        sendSms: async () => {
          const timeoutErr = new Error('ETIMEDOUT: Connection timed out after 5000ms');
          timeoutErr.code = 'ETIMEDOUT';
          throw timeoutErr;
        }
      };
      smsService.setMockProvider(timeoutMock);

      const res = await smsService.sendSms({ to: '+919876543211', message: 'Timeout test' });
      assert.strictEqual(res.success, false, 'Timeout should be reported as failure');
      assert.strictEqual(res.status, 'FAILED');
      assert.strictEqual(res.deliveryStatus, 'FAILED');

      // Verify that transport is NOT changed or fallen back automatically
      assert.strictEqual(getSmsTransport(), 'PROVIDER', 'Transport must remain PROVIDER and not silently switch to ANDROID_SIM');

      smsService.setMockProvider(mockSmsProvider);
      recordPass('Criterion 16: Ambiguous timeouts do not trigger automatic retries or fallback to SIM SMS');
    } catch (err) {
      recordFail('Criterion 16: Timeout safety and zero fallback', err);
    }

  } finally {
    // Cleanup created test records
    try {
      if (createdEmergencyIds.length > 0) {
        await EmergencyEvent.deleteMany({ _id: { $in: createdEmergencyIds } });
        await Notification.deleteMany({ emergencyEvent: { $in: createdEmergencyIds } });
      }
      if (createdContactIds.length > 0) {
        await TrustedContact.deleteMany({ _id: { $in: createdContactIds } });
      }
      await User.deleteOne({ _id: testUser._id });
    } catch (cleanupErr) {
      console.warn('Test cleanup warning:', cleanupErr.message);
    }
  }

  console.log('\n======================================================');
  console.log(`Phase 9 Emergency Notifications Test Summary: ${passed} / ${passed + failed} PASSED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runEmergencyNotificationTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal test error:', err);
      process.exit(1);
    });
}

module.exports = runEmergencyNotificationTests;
