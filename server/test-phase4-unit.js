/**
 * Phase 4 Emergency Core Unit & Service Test Suite
 *
 * Tests:
 * 1. riskService rule-based initial risk calculations
 * 2. emergencyService SOS creation, duplicate prevention, ownership checks, cancel/resolve lifecycle
 * 3. emergency.controller HTTP handler mock calls
 */

const mongoose = require('mongoose');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_suraksha_ai_2026';
process.env.JWT_EXPIRES_IN = '7d';

const riskService = require('./services/riskService');
const emergencyService = require('./services/emergencyService');
const contactService = require('./services/contactService');
const emergencyController = require('./controllers/emergency.controller');
const EmergencyEvent = require('./models/EmergencyEvent');

async function runPhase4Tests() {
  console.log('=== SURAKSHA AI PHASE 4 EMERGENCY CORE TESTS ===\n');
  let testCount = 0;
  let passCount = 0;

  const runAsyncTest = async (name, testFn) => {
    testCount++;
    try {
      await testFn();
      console.log(`[PASS] Test #${testCount}: ${name}`);
      passCount++;
    } catch (err) {
      console.log(`[FAIL] Test #${testCount}: ${name}`);
      console.error('       Reason:', err.message);
    }
  };

  const createMockRes = () => {
    const res = {
      statusCode: null,
      body: null,
      status: function (code) {
        this.statusCode = code;
        return this;
      },
      json: function (data) {
        this.body = data;
        return this;
      }
    };
    return res;
  };

  const userId = '507f1f77bcf86cd799439011';
  const otherUserId = '507f1f77bcf86cd799439099';
  const emergencyId = '507f1f77bcf86cd799439033';

  // 1. riskService.calculateInitialRisk - Base score & band
  await runAsyncTest('riskService: manual trigger returns base score 30 and LOW risk level', async () => {
    const risk = riskService.calculateInitialRisk('manual');
    if (risk.score !== 30) throw new Error(`Expected score 30, got ${risk.score}`);
    if (risk.level !== 'low') throw new Error(`Expected level low, got ${risk.level}`);
  });

  // 2. riskService.calculateInitialRisk - Signals & clamping
  await runAsyncTest('riskService: calculates signals and clamps score to 100 max', async () => {
    const risk = riskService.calculateInitialRisk('voice', [
      { type: 'distress_keyword', points: 30 },
      { type: 'high_risk_location', points: 20 },
      { type: 'voice_stress', points: 25 }
    ]);
    // 30 base + 10 voice + 30 + 20 + 25 = 115 -> clamped to 100
    if (risk.score !== 100) throw new Error(`Expected clamped score 100, got ${risk.score}`);
    if (risk.level !== 'critical') throw new Error(`Expected level critical, got ${risk.level}`);
  });

  // 3. emergencyService.createEmergency - Success flow
  await runAsyncTest('emergencyService.createEmergency: creates active emergency with location & timeline', async () => {
    const origFindOne = EmergencyEvent.findOne;
    const origGetActiveContacts = contactService.getActiveContacts;
    const origSave = EmergencyEvent.prototype.save;

    try {
      EmergencyEvent.findOne = async () => null; // No existing active emergency
      contactService.getActiveContacts = async () => [{ id: 'c1', name: 'Mother' }];
      EmergencyEvent.prototype.save = async function () {
        this._id = new mongoose.Types.ObjectId(emergencyId);
        return this;
      };

      const result = await emergencyService.createEmergency(userId, {
        triggerType: 'manual',
        location: { latitude: 14.6819, longitude: 77.6006, accuracy: 10 }
      });

      if (result.status !== 'active') throw new Error(`Expected status active, got ${result.status}`);
      if (!result.trustedContactsNotified) throw new Error('Expected trustedContactsNotified to be true');
      if (!result.currentLocation || result.currentLocation.latitude !== 14.6819) {
        throw new Error('Initial location not captured properly');
      }
      if (!Array.isArray(result.timeline) || result.timeline.length < 4) {
        throw new Error('Expected initial timeline events');
      }
    } finally {
      EmergencyEvent.findOne = origFindOne;
      contactService.getActiveContacts = origGetActiveContacts;
      EmergencyEvent.prototype.save = origSave;
    }
  });

  // 4. emergencyService.createEmergency - Duplicate Prevention (409 Conflict)
  await runAsyncTest('emergencyService.createEmergency: rejects duplicate active emergency with 409', async () => {
    const origFindOne = EmergencyEvent.findOne;

    try {
      EmergencyEvent.findOne = async () => ({ _id: emergencyId, status: 'active' });

      let thrownErr = null;
      try {
        await emergencyService.createEmergency(userId, { triggerType: 'manual' });
      } catch (err) {
        thrownErr = err;
      }

      if (!thrownErr) throw new Error('Expected duplicate active emergency error');
      if (thrownErr.statusCode !== 409) throw new Error(`Expected statusCode 409, got ${thrownErr.statusCode}`);
    } finally {
      EmergencyEvent.findOne = origFindOne;
    }
  });

  // 5. emergencyService.cancelEmergency - Success
  await runAsyncTest('emergencyService.cancelEmergency: updates status to cancelled & sets endedAt', async () => {
    const origFindById = EmergencyEvent.findById;

    try {
      const mockEmergency = {
        _id: new mongoose.Types.ObjectId(emergencyId),
        user: new mongoose.Types.ObjectId(userId),
        status: 'active',
        startedAt: new Date(),
        timeline: [],
        toObject: function () { return this; },
        save: async function () { return this; }
      };

      EmergencyEvent.findById = async () => mockEmergency;

      const result = await emergencyService.cancelEmergency(userId, emergencyId);
      if (result.status !== 'cancelled') throw new Error(`Expected status cancelled, got ${result.status}`);
      if (!result.endedAt) throw new Error('Expected endedAt timestamp to be set');
      const cancelTimeline = result.timeline.find(t => t.type === 'cancelled');
      if (!cancelTimeline) throw new Error('Expected cancelled event in timeline');
    } finally {
      EmergencyEvent.findById = origFindById;
    }
  });

  // 5b. emergencyService.cancelEmergency - Repeated cancellation idempotency
  await runAsyncTest('emergencyService.cancelEmergency: repeated cancellation of already-cancelled emergency is idempotent and returns cancelled record', async () => {
    const origFindById = EmergencyEvent.findById;

    try {
      const mockEmergency = {
        _id: new mongoose.Types.ObjectId(emergencyId),
        user: new mongoose.Types.ObjectId(userId),
        status: 'cancelled',
        startedAt: new Date(),
        endedAt: new Date(),
        timeline: [{ type: 'cancelled', message: 'Emergency cancelled by user', timestamp: new Date() }],
        toObject: function () { return this; }
      };

      EmergencyEvent.findById = async () => mockEmergency;

      const result = await emergencyService.cancelEmergency(userId, emergencyId);
      if (result.status !== 'cancelled') throw new Error(`Expected status cancelled, got ${result.status}`);
      if (!result.endedAt) throw new Error('Expected endedAt timestamp to be preserved');
    } finally {
      EmergencyEvent.findById = origFindById;
    }
  });

  // 6. emergencyService.cancelEmergency - Ownership check (403 Forbidden)
  await runAsyncTest('emergencyService.cancelEmergency: rejects cancellation by different user with 403', async () => {
    const origFindById = EmergencyEvent.findById;

    try {
      const mockEmergency = {
        _id: new mongoose.Types.ObjectId(emergencyId),
        user: new mongoose.Types.ObjectId(userId),
        status: 'active',
        timeline: []
      };

      EmergencyEvent.findById = async () => mockEmergency;

      let thrownErr = null;
      try {
        await emergencyService.cancelEmergency(otherUserId, emergencyId);
      } catch (err) {
        thrownErr = err;
      }

      if (!thrownErr) throw new Error('Expected authorization error');
      if (thrownErr.statusCode !== 403) throw new Error(`Expected statusCode 403, got ${thrownErr.statusCode}`);
    } finally {
      EmergencyEvent.findById = origFindById;
    }
  });

  // 7. emergencyService.resolveEmergency - Success
  await runAsyncTest('emergencyService.resolveEmergency: updates status to resolved & sets endedAt', async () => {
    const origFindById = EmergencyEvent.findById;

    try {
      const mockEmergency = {
        _id: new mongoose.Types.ObjectId(emergencyId),
        user: new mongoose.Types.ObjectId(userId),
        status: 'active',
        startedAt: new Date(),
        timeline: [],
        toObject: function () { return this; },
        save: async function () { return this; }
      };

      EmergencyEvent.findById = async () => mockEmergency;

      const result = await emergencyService.resolveEmergency(userId, emergencyId, 'User confirmed safe');
      if (result.status !== 'resolved') throw new Error(`Expected status resolved, got ${result.status}`);
      if (!result.endedAt) throw new Error('Expected endedAt timestamp to be set');
      const resolveTimeline = result.timeline.find(t => t.type === 'resolved');
      if (!resolveTimeline) throw new Error('Expected resolved event in timeline');
    } finally {
      EmergencyEvent.findById = origFindById;
    }
  });

  // 8. emergencyService.resolveEmergency - Rejects invalid transition (already resolved/cancelled)
  await runAsyncTest('emergencyService.resolveEmergency: rejects resolving an already resolved emergency (400)', async () => {
    const origFindById = EmergencyEvent.findById;

    try {
      const mockEmergency = {
        _id: new mongoose.Types.ObjectId(emergencyId),
        user: new mongoose.Types.ObjectId(userId),
        status: 'resolved',
        timeline: []
      };

      EmergencyEvent.findById = async () => mockEmergency;

      let thrownErr = null;
      try {
        await emergencyService.resolveEmergency(userId, emergencyId);
      } catch (err) {
        thrownErr = err;
      }

      if (!thrownErr) throw new Error('Expected invalid transition error');
      if (thrownErr.statusCode !== 400) throw new Error(`Expected statusCode 400, got ${thrownErr.statusCode}`);
    } finally {
      EmergencyEvent.findById = origFindById;
    }
  });

  // 9. emergencyController.activateSOS
  await runAsyncTest('emergencyController.activateSOS: returns 201 with created emergency data', async () => {
    const origCreateEmergency = emergencyService.createEmergency;

    try {
      emergencyService.createEmergency = async (id, data) => ({
        id: emergencyId,
        status: 'active',
        triggerType: data.triggerType || 'manual'
      });

      const req = { user: { id: userId }, body: { triggerType: 'manual' } };
      const res = createMockRes();

      await emergencyController.activateSOS(req, res, () => {});

      if (res.statusCode !== 201) throw new Error(`Expected 201, got ${res.statusCode}`);
      if (!res.body.success || !res.body.data) throw new Error('Invalid controller response format');
    } finally {
      emergencyService.createEmergency = origCreateEmergency;
    }
  });

  // 10. emergencyController.getActiveEmergency
  await runAsyncTest('emergencyController.getActiveEmergency: returns 200 with active emergency', async () => {
    const origGetActive = emergencyService.getActiveEmergency;

    try {
      emergencyService.getActiveEmergency = async (id) => ({
        id: emergencyId,
        status: 'active',
        riskLevel: 'low'
      });

      const req = { user: { id: userId } };
      const res = createMockRes();

      await emergencyController.getActiveEmergency(req, res, () => {});

      if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}`);
      if (!res.body.success || res.body.data.id !== emergencyId) throw new Error('Invalid active emergency response');
    } finally {
      emergencyService.getActiveEmergency = origGetActive;
    }
  });

  // Helper to generate a valid test JWT
  const jwt = require('jsonwebtoken');
  const validToken = jwt.sign({ id: userId, email: 'john@example.com' }, process.env.JWT_SECRET, { expiresIn: '1h' });

  // 11. Route Validation Test — location: null (Nullable location handling)
  await runAsyncTest('emergency.routes: accepts location: null cleanly without 422 error', async () => {
    const express = require('express');
    const http = require('http');
    const emergencyRoutes = require('./routes/emergency.routes');
    const origCreateEmergency = emergencyService.service || emergencyService.createEmergency;

    try {
      emergencyService.createEmergency = async () => ({ id: emergencyId, status: 'active' });

      const app = express();
      app.use(express.json());
      app.use('/api/emergency', emergencyRoutes);

      const server = http.createServer(app);
      await new Promise((resolve) => server.listen(0, resolve));
      const port = server.address().port;

      const res = await fetch(`http://localhost:${port}/api/emergency`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validToken}`
        },
        body: JSON.stringify({ triggerType: 'manual', location: null })
      });
      const data = await res.json();
      await new Promise((resolve) => server.close(resolve));

      if (res.status !== 201) {
        throw new Error(`Expected status 201 for location: null, got ${res.status}: ${JSON.stringify(data)}`);
      }
    } finally {
      emergencyService.createEmergency = origCreateEmergency;
    }
  });

  // 13. emergencyService.updateInitialLocation — Success
  await runAsyncTest('emergencyService.updateInitialLocation: updates currentLocation and appends timeline entry', async () => {
    const origFindById = EmergencyEvent.findById;

    try {
      const mockEmergency = {
        _id: new mongoose.Types.ObjectId(emergencyId),
        user: new mongoose.Types.ObjectId(userId),
        status: 'active',
        currentLocation: null,
        timeline: [],
        toObject: function () { return this; },
        save: async function () { return this; }
      };

      EmergencyEvent.findById = async () => mockEmergency;

      const result = await emergencyService.updateInitialLocation(userId, emergencyId, { latitude: 14.6819, longitude: 77.6006, accuracy: 5 });

      if (!result.currentLocation || result.currentLocation.latitude !== 14.6819) {
        throw new Error('Expected currentLocation to be updated');
      }
      const locTimeline = result.timeline.find(t => t.type === 'location');
      if (!locTimeline) throw new Error('Expected location timeline entry');
    } finally {
      EmergencyEvent.findById = origFindById;
    }
  });

  // 14. Route Test — PATCH /api/emergency/:emergencyId/location
  await runAsyncTest('emergency.routes: PATCH /api/emergency/:id/location updates initial location asynchronously', async () => {
    const express = require('express');
    const http = require('http');
    const emergencyRoutes = require('./routes/emergency.routes');
    const origUpdateInitialLocation = emergencyService.updateInitialLocation;

    try {
      emergencyService.updateInitialLocation = async (uId, eId, loc) => ({
        id: eId,
        status: 'active',
        currentLocation: loc
      });

      const app = express();
      app.use(express.json());
      app.use('/api/emergency', emergencyRoutes);

      const server = http.createServer(app);
      await new Promise((resolve) => server.listen(0, resolve));
      const port = server.address().port;

      const res = await fetch(`http://localhost:${port}/api/emergency/${emergencyId}/location`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validToken}`
        },
        body: JSON.stringify({ location: { latitude: 14.6819, longitude: 77.6006, accuracy: 8 } })
      });
      const data = await res.json();
      await new Promise((resolve) => server.close(resolve));

      if (res.status !== 200) {
        throw new Error(`Expected status 200, got ${res.status}: ${JSON.stringify(data)}`);
      }
      if (!data.success || !data.data.currentLocation || data.data.currentLocation.latitude !== 14.6819) {
        throw new Error('Invalid location update response format');
      }
    } finally {
      emergencyService.updateInitialLocation = origUpdateInitialLocation;
    }
  });

  // 15. emergencyService.updateInitialLocation — Replaces "Initial location unavailable" entry
  await runAsyncTest('emergencyService.updateInitialLocation: converts existing "Initial location unavailable" entry to "Initial location captured"', async () => {
    const origFindById = EmergencyEvent.findById;

    try {
      const mockEmergency = {
        _id: new mongoose.Types.ObjectId(emergencyId),
        user: new mongoose.Types.ObjectId(userId),
        status: 'active',
        currentLocation: null,
        timeline: [
          { type: 'sos', message: 'Silent SOS activated (manual)', timestamp: new Date() },
          { type: 'location', message: 'Initial location unavailable (Permission denied or location disabled)', timestamp: new Date() },
          { type: 'risk_update', message: 'Initial risk score calculated: 30 (LOW)', timestamp: new Date() }
        ],
        toObject: function () { return this; },
        save: async function () { return this; }
      };

      EmergencyEvent.findById = async () => mockEmergency;

      const result = await emergencyService.updateInitialLocation(userId, emergencyId, { latitude: 14.6948, longitude: 77.5787, accuracy: 12 });

      if (!result.currentLocation || result.currentLocation.latitude !== 14.6948) {
        throw new Error('Expected currentLocation to be updated');
      }

      const hasUnavailable = result.timeline.some(t => t.message && t.message.includes('Initial location unavailable'));
      if (hasUnavailable) {
        throw new Error('Timeline still contains "Initial location unavailable" after successful location update');
      }

      const capturedEntry = result.timeline.find(t => t.message && t.message.includes('Initial location captured'));
      if (!capturedEntry || !capturedEntry.message.includes('14.6948')) {
        throw new Error('Expected timeline entry with captured coordinates');
      }
    } finally {
      EmergencyEvent.findById = origFindById;
    }
  });

  console.log(`\n========================================`);
  console.log(`Phase 4 Emergency Core Tests Summary: ${passCount} / ${testCount} Passed`);
  console.log(`========================================\n`);

  if (passCount !== testCount) {
    process.exit(1);
  }
}

runPhase4Tests().catch(err => {
  console.error('Test execution crashed:', err);
  process.exit(1);
});
