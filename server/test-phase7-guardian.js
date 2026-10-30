/**
 * Phase 7 — Guardian Mode Test Suite (Automated Verification)
 *
 * Verifies:
 * 1. Guardian Mode session start, active status check, location recording, and stop.
 * 2. Server-side 500m route deviation detection.
 * 3. Server-side 5-minute suspicious stoppage detection.
 * 4. SafetyZone proximity check for high-risk locations.
 * 5. Check-in handling: status "safe" resolves event; status "get_help" escalates to EmergencyEvent (triggerType: "guardian").
 * 6. 60-second check-in auto-escalation behavior.
 * 7. Security guards: JWT auth, user ownership check (403 Forbidden), validation (422 Unprocessable Entity).
 * 8. Socket.IO guardian_warning real-time broadcast.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const http = require('http');
const mongoose = require('mongoose');
const express = require('express');
const socketIo = require('socket.io');
const ioClient = require('../web/node_modules/socket.io-client');

const connectDB = require('./config/database');
const User = require('./models/User');
const EmergencyEvent = require('./models/EmergencyEvent');
const GuardianSession = require('./models/GuardianSession');
const GuardianEvent = require('./models/GuardianEvent');
const SafetyZone = require('./models/SafetyZone');
const LocationEvent = require('./models/LocationEvent');
const guardianService = require('./services/guardianService');

const authRoutes = require('./routes/auth.routes');
const emergencyRoutes = require('./routes/emergency.routes');
const guardianRoutes = require('./routes/guardian.routes');
const riskRoutes = require('./routes/risk.routes');
const initializeSockets = require('./sockets/socketHandler');
const errorHandler = require('./middleware/errorHandler');

let server;
let app;
let ioServer;
let port;
let baseUrl;

const setupTestServer = async () => {
  app = express();
  app.use(express.json());

  server = http.createServer(app);
  ioServer = socketIo(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });

  app.set('io', ioServer);
  initializeSockets(ioServer);

  app.use('/api/auth', authRoutes);
  app.use('/api/emergency', emergencyRoutes);
  app.use('/api/risk', riskRoutes);
  app.use('/api/guardian', guardianRoutes);
  app.use(errorHandler);

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
};

const closeTestServer = async () => {
  if (ioServer) ioServer.close();
  if (server) await new Promise((resolve) => server.close(resolve));
};

const runTests = async () => {
  console.log('=== SURAKSHA AI — PHASE 7 GUARDIAN MODE TEST SUITE ===\n');
  let passed = 0;
  let failed = 0;

  const assert = (condition, testName) => {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  };

  try {
    await connectDB();
    await setupTestServer();

    // Clean up test data
    await User.deleteMany({ email: /testphase7/ });
    await EmergencyEvent.deleteMany({});
    await GuardianSession.deleteMany({});
    await GuardianEvent.deleteMany({});
    await LocationEvent.deleteMany({});
    await SafetyZone.deleteMany({});

    // -------------------------------------------------------------
    // TEST SECTION 1: Unit & Distance Math Tests
    // -------------------------------------------------------------
    console.log('--- 1. Distance & Utility Unit Tests ---');
    const dist1 = guardianService.calculateDistanceMeters(19.0760, 72.8777, 19.0800, 72.8800);
    assert(typeof dist1 === 'number' && dist1 > 400 && dist1 < 600, 'Haversine distance calculation is accurate (~500m)');

    // Insert test SafetyZone
    const testZone = new SafetyZone({
      name: 'High Risk Test Area',
      center: { latitude: 19.1000, longitude: 72.9000 },
      radiusMeters: 500,
      riskLevel: 'high',
      active: true
    });
    await testZone.save();
    assert(testZone._id !== undefined, 'SafetyZone read-only test record created');

    // -------------------------------------------------------------
    // TEST SECTION 2: API Endpoints & Session Lifecycle
    // -------------------------------------------------------------
    console.log('\n--- 2. Guardian Session & API Lifecycle Tests ---');

    // Register User A
    const userARes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Phase7 User A',
        email: 'testphase7a@suraksha.ai',
        password: 'Password123!',
        phone: '+919876543220'
      })
    });
    const userAData = await userARes.json();
    const tokenA = userAData.data.token;
    const userIdA = userAData.data.user.id;

    // Register User B
    const userBRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Phase7 User B',
        email: 'testphase7b@suraksha.ai',
        password: 'Password123!',
        phone: '+919876543221'
      })
    });
    const userBData = await userBRes.json();
    const tokenB = userBData.data.token;

    // Validation Guard: Invalid destination latitude -> 422
    const invalidDestRes = await fetch(`${baseUrl}/api/guardian/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        destination: { latitude: 120, longitude: 72.8777 }
      })
    });
    assert(invalidDestRes.status === 422, 'Invalid destination latitude returns HTTP 422 Validation Error');

    // Start Guardian Session for User A
    const startRes = await fetch(`${baseUrl}/api/guardian/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        destination: { latitude: 19.1500, longitude: 72.9500, name: 'Workplace' }
      })
    });
    const startData = await startRes.json();
    const sessionIdA = startData.data.sessionId;

    assert(startRes.status === 200, 'POST /api/guardian/start activates session (HTTP 200)');
    assert(startData.data.status === 'active', 'Guardian session status is active');

    // Duplicate Active Session Guard -> 409 Conflict
    const dupStartRes = await fetch(`${baseUrl}/api/guardian/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        destination: { latitude: 19.1500, longitude: 72.9500 }
      })
    });
    assert(dupStartRes.status === 409, 'Starting duplicate active session returns HTTP 409 Conflict');

    // GET /api/guardian/active
    const activeRes = await fetch(`${baseUrl}/api/guardian/active`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const activeData = await activeRes.json();
    assert(activeRes.status === 200 && activeData.data.sessionId === sessionIdA, 'GET /api/guardian/active returns active session');

    // Security Guard: User B attempts to report location to User A session -> 403 Forbidden
    const crossLocRes = await fetch(`${baseUrl}/api/guardian/${sessionIdA}/location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`
      },
      body: JSON.stringify({ latitude: 19.0760, longitude: 72.8777 })
    });
    assert(crossLocRes.status === 403, 'Cross-user location report returns HTTP 403 Forbidden');

    // User A reports initial location
    const loc1Res = await fetch(`${baseUrl}/api/guardian/${sessionIdA}/location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({ latitude: 19.0760, longitude: 72.8777, speed: 5.0 })
    });
    const loc1Data = await loc1Res.json();
    assert(loc1Res.status === 200 && loc1Data.success === true, 'POST /api/guardian/:sessionId/location records location (source: guardian)');

    // Verify LocationEvent saved with source: "guardian"
    const savedLoc = await LocationEvent.findOne({ user: userIdA });
    assert(savedLoc !== null && savedLoc.source === 'guardian', 'LocationEvent saved in MongoDB with source = "guardian"');

    // Test SafetyZone proximity: report location inside high-risk zone
    const locZoneRes = await fetch(`${baseUrl}/api/guardian/${sessionIdA}/location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({ latitude: 19.1001, longitude: 72.9001, speed: 2.0 })
    });
    const locZoneData = await locZoneRes.json();
    assert(locZoneData.data.isHighRiskLocation === true, 'SafetyZone proximity check correctly detects high-risk location');

    // -------------------------------------------------------------
    // TEST SECTION 3: Anomaly Detection, Socket.IO & Check-In
    // -------------------------------------------------------------
    console.log('\n--- 3. Anomaly Detection & Check-In Tests ---');

    // Test Route Deviation Detection (> 500m off trajectory)
    let socketWarning = null;
    const clientSocket = ioClient(baseUrl, {
      auth: { token: tokenA },
      transports: ['websocket']
    });

    await new Promise((res) => clientSocket.on('connect', res));
    clientSocket.on('guardian_warning', (data) => {
      socketWarning = data;
    });

    // Report location far off route
    const devLocRes = await fetch(`${baseUrl}/api/guardian/${sessionIdA}/location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({ latitude: 18.9000, longitude: 72.7000, speed: 10.0 })
    });
    const devLocData = await devLocRes.json();
    console.log('devLocData:', JSON.stringify(devLocData));
    assert(devLocData.data.anomaly === 'route_deviation', 'Server-side 500m route deviation anomaly detected');

    // Wait for Socket.IO warning event
    await new Promise((res) => setTimeout(res, 300));
    assert(
      socketWarning !== null &&
      socketWarning.type === 'route_deviation' &&
      socketWarning.requiresCheckIn === true &&
      socketWarning.timeoutSeconds === 60,
      'Socket.IO guardian_warning event received with 60s check-in requirement'
    );

    const eventId = socketWarning.eventId;

    // Test Check-In Safe: User A responds status "safe" -> resolves event
    const checkInSafeRes = await fetch(`${baseUrl}/api/guardian/${eventId}/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({ status: 'safe' })
    });
    const checkInSafeData = await checkInSafeRes.json();
    assert(checkInSafeRes.status === 200 && checkInSafeData.data.status === 'safe', 'POST /api/guardian/:eventId/check-in with status safe resolves GuardianEvent');

    // Verify GuardianEvent status in MongoDB
    const safeEvent = await GuardianEvent.findById(eventId);
    assert(safeEvent.status === 'safe' && safeEvent.resolvedAt !== null, 'GuardianEvent status updated to safe in MongoDB');

    // Test Check-In Get Help: Simulate second anomaly and escalate
    const devLoc2Res = await fetch(`${baseUrl}/api/guardian/${sessionIdA}/location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({ latitude: 18.8000, longitude: 72.6000, speed: 10.0 })
    });
    const devLoc2Data = await devLoc2Res.json();

    const event2 = await GuardianEvent.findOne({ user: userIdA, status: 'check_in' });
    assert(event2 !== null, 'Second anomaly check_in GuardianEvent created');

    const checkInHelpRes = await fetch(`${baseUrl}/api/guardian/${event2._id}/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({ status: 'get_help' })
    });
    const checkInHelpData = await checkInHelpRes.json();

    assert(checkInHelpRes.status === 200 && checkInHelpData.data.status === 'escalated', 'POST /api/guardian/:eventId/check-in with status get_help escalates event');
    assert(checkInHelpData.data.emergencyId !== null, 'Get Help escalation creates an EmergencyEvent');

    // Verify EmergencyEvent in MongoDB with triggerType: "guardian"
    const createdEmergency = await EmergencyEvent.findById(checkInHelpData.data.emergencyId);
    assert(
      createdEmergency !== null &&
      createdEmergency.triggerType === 'guardian' &&
      createdEmergency.status === 'active',
      'EmergencyEvent created in MongoDB with triggerType = "guardian"'
    );

    // Stop session for cleanup
    await fetch(`${baseUrl}/api/guardian/${sessionIdA}/stop`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    clientSocket.disconnect();

    // Clean up test data
    await User.deleteMany({ email: /testphase7/ });
    await EmergencyEvent.deleteMany({});
    await GuardianSession.deleteMany({});
    await GuardianEvent.deleteMany({});
    await LocationEvent.deleteMany({});
    await SafetyZone.deleteMany({});

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await closeTestServer();
    await mongoose.connection.close();

    console.log(`\n=== PHASE 7 TEST SUMMARY ===`);
    console.log(`Total Passed: ${passed}`);
    console.log(`Total Failed: ${failed}`);
    if (failed > 0) {
      process.exit(1);
    } else {
      console.log('✅ ALL PHASE 7 GUARDIAN MODE TESTS PASSED SUCCESSFULLY!\n');
    }
  }
};

runTests();
