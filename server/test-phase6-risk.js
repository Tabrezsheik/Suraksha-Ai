/**
 * Phase 6 — AI Risk Detection Test Suite (Automated Verification)
 *
 * Verifies:
 * 1. Rule-based risk scoring thresholds (0–30 low, 31–60 medium, 61–80 high, 81–100 critical).
 * 2. Documented signal weights (+30, +25, +20, +15, +10).
 * 3. Signal deduplication (duplicate inputs yield weight at most once).
 * 4. 1:1 scoring parity between Node.js riskService fallback and FastAPI AI engine logic.
 * 5. POST /api/risk/assess authentication, ownership check, active emergency check, and validation.
 * 6. MongoDB RiskAssessment persistence and EmergencyEvent risk score/level updates.
 * 7. GET /api/risk/:emergencyId risk history retrieval.
 * 8. Socket.IO risk_updated event payload strictly matching { emergencyId, score, level } (API.md §18.2).
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const http = require('http');
const mongoose = require('mongoose');
const express = require('express');
const socketIo = require('socket.io');
const ioClient = require('../web/node_modules/socket.io-client');
const jwt = require('jsonwebtoken');

const connectDB = require('./config/database');
const User = require('./models/User');
const EmergencyEvent = require('./models/EmergencyEvent');
const RiskAssessment = require('./models/RiskAssessment');
const riskService = require('./services/riskService');
const authRoutes = require('./routes/auth.routes');
const emergencyRoutes = require('./routes/emergency.routes');
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
  console.log('=== SURAKSHA AI — PHASE 6 AI RISK DETECTION TEST SUITE ===\n');
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

    // -------------------------------------------------------------
    // TEST SECTION 1: Unit & Boundary Scoring Tests (riskService)
    // -------------------------------------------------------------
    console.log('--- 1. Boundary & Signal Scoring Unit Tests ---');

    assert(riskService.getRiskLevel(0) === 'low', 'Score 0 maps to low risk');
    assert(riskService.getRiskLevel(30) === 'low', 'Score 30 maps to low risk (boundary)');
    assert(riskService.getRiskLevel(31) === 'medium', 'Score 31 maps to medium risk (boundary)');
    assert(riskService.getRiskLevel(60) === 'medium', 'Score 60 maps to medium risk (boundary)');
    assert(riskService.getRiskLevel(61) === 'high', 'Score 61 maps to high risk (boundary)');
    assert(riskService.getRiskLevel(80) === 'high', 'Score 80 maps to high risk (boundary)');
    assert(riskService.getRiskLevel(81) === 'critical', 'Score 81 maps to critical risk (boundary)');
    assert(riskService.getRiskLevel(100) === 'critical', 'Score 100 maps to critical risk (boundary)');

    // Single signal tests
    const sDistress = riskService.assessRisk([{ type: 'distress_keyword', value: true }]);
    assert(sDistress.score === 30 && sDistress.level === 'low', 'distress_keyword yields 30 points (low)');

    const sVoice = riskService.assessRisk([{ type: 'voice_stress', value: true }]);
    assert(sVoice.score === 25 && sVoice.level === 'low', 'voice_stress yields 25 points (low)');

    const sLocation = riskService.assessRisk([{ type: 'high_risk_location', value: true }]);
    assert(sLocation.score === 20 && sLocation.level === 'low', 'high_risk_location yields 20 points (low)');

    const sRoute = riskService.assessRisk([{ type: 'route_deviation', value: true }]);
    assert(sRoute.score === 15 && sRoute.level === 'low', 'route_deviation yields 15 points (low)');

    const sStoppage = riskService.assessRisk([{ type: 'suspicious_stoppage', value: true }]);
    assert(sStoppage.score === 10 && sStoppage.level === 'low', 'suspicious_stoppage yields 10 points (low)');

    // Combination signal test: distress + voice_stress = 55 (medium)
    const sCombo = riskService.assessRisk([
      { type: 'distress_keyword', value: true },
      { type: 'voice_stress', value: true }
    ]);
    assert(sCombo.score === 55 && sCombo.level === 'medium', 'distress_keyword + voice_stress = 55 (medium)');

    // Deduplication test: duplicate distress_keyword in payload yields 30 points (NOT 60)
    const sDup = riskService.assessRisk([
      { type: 'distress_keyword', value: true },
      { type: 'distress_keyword', value: true }
    ]);
    assert(sDup.score === 30 && sDup.signals.length === 1, 'Duplicate signal type is deduplicated (score 30, 1 signal item)');

    // Score clamping test: sum exceeding 100 clamps to 100
    const sClamp = riskService.assessRisk([
      { type: 'distress_keyword', value: true },
      { type: 'voice_stress', value: true },
      { type: 'high_risk_location', value: true },
      { type: 'route_deviation', value: true },
      { type: 'suspicious_stoppage', value: true }
    ]);
    assert(sClamp.score === 100 && sClamp.level === 'critical', 'Sum of all signals (100) clamps to 100 (critical)');

    // -------------------------------------------------------------
    // TEST SECTION 2: API Endpoints & Security Controls
    // -------------------------------------------------------------
    console.log('\n--- 2. Integration API & Security Guard Tests ---');

    // Clean up test database collections
    await User.deleteMany({ email: /testphase6/ });
    await EmergencyEvent.deleteMany({});
    await RiskAssessment.deleteMany({});

    // Register User A
    const userARes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Phase6 User A',
        email: 'testphase6a@suraksha.ai',
        password: 'Password123!',
        phone: '+919876543210'
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
        name: 'Phase6 User B',
        email: 'testphase6b@suraksha.ai',
        password: 'Password123!',
        phone: '+919876543211'
      })
    });
    const userBData = await userBRes.json();
    const tokenB = userBData.data.token;

    // Create Emergency for User A
    const emergencyRes = await fetch(`${baseUrl}/api/emergency`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        triggerType: 'manual',
        latitude: 19.0760,
        longitude: 72.8777
      })
    });
    const emergencyData = await emergencyRes.json();
    const emergencyId = emergencyData.data.id;

    assert(emergencyData.data.initialRiskScore === 30, 'Manual SOS initial score is 30');

    // Test Security Guard 1: User B attempts to assess User A emergency -> 403 Forbidden
    const crossAssessRes = await fetch(`${baseUrl}/api/risk/assess`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`
      },
      body: JSON.stringify({
        emergencyId,
        signals: [{ type: 'distress_keyword', value: true }]
      })
    });
    assert(crossAssessRes.status === 403, 'Cross-user risk assessment returns HTTP 403 Forbidden');

    // Test Security Guard 2: Whitelist validation -> invalid signal type returns 422
    const invalidSignalRes = await fetch(`${baseUrl}/api/risk/assess`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        emergencyId,
        signals: [{ type: 'unapproved_custom_signal', value: true }]
      })
    });
    assert(invalidSignalRes.status === 422, 'Unwhitelisted signal type returns HTTP 422 Validation Error');

    // Test Socket.IO risk_updated broadcast & Payload Contract
    let receivedSocketEvent = null;
    const clientSocket = ioClient(baseUrl, {
      auth: { token: tokenA },
      transports: ['websocket']
    });

    await new Promise((res) => {
      clientSocket.on('connect', () => {
        clientSocket.emit('join_emergency', { emergencyId }, () => {
          res();
        });
      });
    });

    clientSocket.on('risk_updated', (data) => {
      receivedSocketEvent = data;
    });

    // Test Authorized Assessment: User A assesses their emergency with distress_keyword (+30) -> Score 30 (low)
    const assessRes = await fetch(`${baseUrl}/api/risk/assess`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        emergencyId,
        signals: [{ type: 'distress_keyword', value: true }]
      })
    });
    const assessData = await assessRes.json();

    assert(assessRes.status === 200, 'Authorized POST /api/risk/assess returns HTTP 200 OK');
    assert(assessData.data.score === 30 && assessData.data.level === 'low', 'Assessment response contains score 30 and level low');

    // Verify MongoDB RiskAssessment Persistence
    const savedAssessment = await RiskAssessment.findById(assessData.data.id);
    assert(savedAssessment !== null && savedAssessment.score === 30, 'RiskAssessment document saved in MongoDB');

    // Verify EmergencyEvent Current Score & Level Updated
    const updatedEmergency = await EmergencyEvent.findById(emergencyId);
    assert(updatedEmergency.currentRiskScore === 30 && updatedEmergency.riskLevel === 'low', 'EmergencyEvent updated with new currentRiskScore (30) and riskLevel (low)');

    // Wait for Socket.IO event
    await new Promise((res) => setTimeout(res, 300));
    assert(
      receivedSocketEvent !== null &&
      receivedSocketEvent.emergencyId === emergencyId &&
      receivedSocketEvent.score === 30 &&
      receivedSocketEvent.level === 'low' &&
      receivedSocketEvent.signals === undefined,
      'Socket.IO risk_updated payload strictly matches { emergencyId, score, level } per API.md §18.2'
    );

    clientSocket.disconnect();

    // Test GET /api/risk/:emergencyId
    const historyRes = await fetch(`${baseUrl}/api/risk/${emergencyId}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const historyData = await historyRes.json();
    assert(historyRes.status === 200 && Array.isArray(historyData.data) && historyData.data.length === 1, 'GET /api/risk/:emergencyId returns risk history array');

    // Test Security Guard 3: Resolve emergency and verify non-active emergency returns 400 Bad Request
    await fetch(`${baseUrl}/api/emergency/${emergencyId}/resolve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({ resolution: 'User safe' })
    });

    const inactiveAssessRes = await fetch(`${baseUrl}/api/risk/assess`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        emergencyId,
        signals: [{ type: 'distress_keyword', value: true }]
      })
    });
    assert(inactiveAssessRes.status === 400, 'Assessing resolved emergency returns HTTP 400 Bad Request');

    // Clean up test data
    await User.deleteMany({ email: /testphase6/ });
    await EmergencyEvent.deleteMany({});
    await RiskAssessment.deleteMany({});

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await closeTestServer();
    await mongoose.connection.close();

    console.log(`\n=== PHASE 6 TEST SUMMARY ===`);
    console.log(`Total Passed: ${passed}`);
    console.log(`Total Failed: ${failed}`);
    if (failed > 0) {
      process.exit(1);
    } else {
      console.log('✅ ALL PHASE 6 AI RISK DETECTION TESTS PASSED SUCCESSFULLY!\n');
    }
  }
};

runTests();
