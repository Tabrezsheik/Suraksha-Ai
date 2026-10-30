/**
 * Phase 5 Automated Unit, Controller & Integration Test Suite
 *
 * Verifies LocationEvent schema, locationService logic, tracking API routes,
 * coordinate validation, authorization, and Socket.IO authentication/room security.
 */

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const http = require('http');
const express = require('express');
const LocationEvent = require('./models/LocationEvent');
const EmergencyEvent = require('./models/EmergencyEvent');
const locationService = require('./services/locationService');
const trackingController = require('./controllers/tracking.controller');
const trackingRoutes = require('./routes/tracking.routes');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_suraksha_secret_key_12345';

let testCount = 0;
let passCount = 0;

async function runAsyncTest(name, fn) {
  testCount++;
  try {
    await fn();
    console.log(`[PASS] Test #${testCount}: ${name}`);
    passCount++;
  } catch (err) {
    console.error(`[FAIL] Test #${testCount}: ${name}`);
    console.error(`       Reason: ${err.message}`);
  }
}

async function runPhase5Tests() {
  console.log('=== SURAKSHA AI PHASE 5 LIVE GPS & TRACKING TESTS ===\n');

  const userId = new mongoose.Types.ObjectId().toString();
  const otherUserId = new mongoose.Types.ObjectId().toString();
  const emergencyId = new mongoose.Types.ObjectId().toString();
  const validToken = jwt.sign({ id: userId, email: 'john@example.com' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const otherToken = jwt.sign({ id: otherUserId, email: 'other@example.com' }, process.env.JWT_SECRET, { expiresIn: '1h' });

  // 1. LocationEvent Model Validation — Required Fields
  await runAsyncTest('LocationEvent Model: validates required user, latitude, longitude', async () => {
    const event = new LocationEvent({});
    const err = event.validateSync();
    if (!err || !err.errors.user || !err.errors.latitude || !err.errors.longitude) {
      throw new Error('Expected validation errors for missing user, latitude, longitude');
    }
  });

  // 2. LocationEvent Model Validation — Out of range latitude
  await runAsyncTest('LocationEvent Model: rejects latitude > 90', async () => {
    const event = new LocationEvent({
      user: userId,
      latitude: 120,
      longitude: 77.6
    });
    const err = event.validateSync();
    if (!err || !err.errors.latitude) {
      throw new Error('Expected validation error for latitude > 90');
    }
  });

  // 3. locationService.recordLocation — Success
  await runAsyncTest('locationService.recordLocation: saves LocationEvent & updates EmergencyEvent.currentLocation', async () => {
    const origLocSave = LocationEvent.prototype.save;
    const origFindById = EmergencyEvent.findById;
    const origFindOne = LocationEvent.findOne;

    try {
      LocationEvent.findOne = () => ({ sort: () => null });

      let locSaved = false;
      LocationEvent.prototype.save = async function () {
        locSaved = true;
        this._id = new mongoose.Types.ObjectId();
        return this;
      };

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

      const res = await locationService.recordLocation(userId, {
        emergencyId,
        latitude: 14.6819,
        longitude: 77.6006,
        accuracy: 8
      });

      if (!locSaved) throw new Error('Expected LocationEvent document to be saved');
      if (res.latitude !== 14.6819 || res.longitude !== 77.6006) throw new Error('Invalid returned location coordinates');
      if (!mockEmergency.currentLocation || mockEmergency.currentLocation.latitude !== 14.6819) {
        throw new Error('Expected EmergencyEvent.currentLocation to be updated');
      }
    } finally {
      LocationEvent.prototype.save = origLocSave;
      EmergencyEvent.findById = origFindById;
      LocationEvent.findOne = origFindOne;
    }
  });

  // 4. locationService.recordLocation — Cross-User Access Guard (403)
  await runAsyncTest('locationService.recordLocation: rejects cross-user tracking with 403 Forbidden', async () => {
    const origFindById = EmergencyEvent.findById;

    try {
      const mockEmergency = {
        _id: new mongoose.Types.ObjectId(emergencyId),
        user: new mongoose.Types.ObjectId(userId), // belongs to userId
        status: 'active',
        toObject: function () { return this; }
      };

      EmergencyEvent.findById = async () => mockEmergency;

      try {
        await locationService.recordLocation(otherUserId, { // called by otherUserId
          emergencyId,
          latitude: 14.6819,
          longitude: 77.6006
        });
        throw new Error('Should have thrown 403 error');
      } catch (err) {
        if (err.statusCode !== 403) throw err;
      }
    } finally {
      EmergencyEvent.findById = origFindById;
    }
  });

  // 5. locationService.recordLocation — Non-Active Emergency Guard (400)
  await runAsyncTest('locationService.recordLocation: rejects tracking for resolved emergency with 400 Bad Request', async () => {
    const origFindById = EmergencyEvent.findById;

    try {
      const mockEmergency = {
        _id: new mongoose.Types.ObjectId(emergencyId),
        user: new mongoose.Types.ObjectId(userId),
        status: 'resolved',
        toObject: function () { return this; }
      };

      EmergencyEvent.findById = async () => mockEmergency;

      try {
        await locationService.recordLocation(userId, {
          emergencyId,
          latitude: 14.6819,
          longitude: 77.6006
        });
        throw new Error('Should have thrown 400 error');
      } catch (err) {
        if (err.statusCode !== 400) throw err;
      }
    } finally {
      EmergencyEvent.findById = origFindById;
    }
  });

  // 6. locationService.getLocationHistory — History Retrieval
  await runAsyncTest('locationService.getLocationHistory: returns formatted location history array sorted by recordedAt', async () => {
    const origFindById = EmergencyEvent.findById;
    const origFind = LocationEvent.find;

    try {
      EmergencyEvent.findById = async () => ({
        _id: new mongoose.Types.ObjectId(emergencyId),
        user: new mongoose.Types.ObjectId(userId)
      });

      LocationEvent.find = () => ({
        sort: () => [
          { _id: '1', user: userId, emergencyEvent: emergencyId, latitude: 14.6819, longitude: 77.6006, recordedAt: new Date() },
          { _id: '2', user: userId, emergencyEvent: emergencyId, latitude: 14.6821, longitude: 77.6012, recordedAt: new Date() }
        ]
      });

      const history = await locationService.getLocationHistory(userId, emergencyId);
      if (!Array.isArray(history) || history.length !== 2) throw new Error('Expected 2 history items');
      if (history[0].latitude !== 14.6819 || history[1].latitude !== 14.6821) throw new Error('Invalid history coordinate values');
    } finally {
      EmergencyEvent.findById = origFindById;
      LocationEvent.find = origFind;
    }
  });

  // 7. Route Test — POST /api/tracking/location (201 Created)
  await runAsyncTest('tracking.routes: POST /api/tracking/location accepts location payload and returns 201 Created', async () => {
    const origRecordLocation = locationService.recordLocation;

    try {
      locationService.recordLocation = async (uId, data) => ({
        id: 'loc123',
        user: uId,
        latitude: data.latitude,
        longitude: data.longitude,
        recordedAt: new Date()
      });

      const app = express();
      app.use(express.json());
      app.use('/api/tracking', trackingRoutes);

      const server = http.createServer(app);
      await new Promise(r => server.listen(0, r));
      const port = server.address().port;

      const res = await fetch(`http://localhost:${port}/api/tracking/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validToken}`
        },
        body: JSON.stringify({
          emergencyId,
          latitude: 14.6825,
          longitude: 77.6020,
          accuracy: 5
        })
      });

      const data = await res.json();
      await new Promise(r => server.close(r));

      if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(data)}`);
      if (!data.success || data.data.latitude !== 14.6825) throw new Error('Invalid tracking API response format');
    } finally {
      locationService.recordLocation = origRecordLocation;
    }
  });

  // 8. Route Test — POST /api/tracking/location (Validation 422 for bad latitude)
  await runAsyncTest('tracking.routes: POST /api/tracking/location rejects latitude > 90 with 422 Validation Error', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/tracking', trackingRoutes);

    const server = http.createServer(app);
    await new Promise(r => server.listen(0, r));
    const port = server.address().port;

    const res = await fetch(`http://localhost:${port}/api/tracking/location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`
      },
      body: JSON.stringify({
        emergencyId,
        latitude: 999,
        longitude: 77.6020
      })
    });

    const data = await res.json();
    await new Promise(r => server.close(r));

    if (res.status !== 422) throw new Error(`Expected 422, got ${res.status}`);
    if (!data || data.message !== 'Validation failed') throw new Error('Expected Validation failed message');
  });

  // 9. Route Test — GET /api/tracking/:emergencyId (200 OK)
  await runAsyncTest('tracking.routes: GET /api/tracking/:emergencyId returns location history', async () => {
    const origGetHistory = locationService.getLocationHistory;

    try {
      locationService.getLocationHistory = async (uId, eId) => [
        { latitude: 14.6819, longitude: 77.6006, recordedAt: new Date() }
      ];

      const app = express();
      app.use(express.json());
      app.use('/api/tracking', trackingRoutes);

      const server = http.createServer(app);
      await new Promise(r => server.listen(0, r));
      const port = server.address().port;

      const res = await fetch(`http://localhost:${port}/api/tracking/${emergencyId}`, {
        headers: { Authorization: `Bearer ${validToken}` }
      });

      const data = await res.json();
      await new Promise(r => server.close(r));

      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      if (!data.success || !Array.isArray(data.data) || data.data.length !== 1) {
        throw new Error('Invalid history response structure');
      }
    } finally {
      locationService.getLocationHistory = origGetHistory;
    }
  });
  // 10. Dashboard Mount/Restoration Test — GET /api/emergency/active does not create emergency
  await runAsyncTest('emergency.routes: GET /api/emergency/active returns status without creating new emergency', async () => {
    const emergencyRoutes = require('./routes/emergency.routes');
    const emergencyService = require('./services/emergencyService');
    const origGetActive = emergencyService.getActiveEmergency;
    const origCreate = emergencyService.createEmergency;

    let createCalled = false;
    try {
      emergencyService.getActiveEmergency = async () => null; // No active emergency
      emergencyService.createEmergency = async () => {
        createCalled = true;
        return { id: 'should_not_run' };
      };

      const app = express();
      app.use(express.json());
      app.use('/api/emergency', emergencyRoutes);

      const server = http.createServer(app);
      await new Promise(r => server.listen(0, r));
      const port = server.address().port;

      const res = await fetch(`http://localhost:${port}/api/emergency/active`, {
        headers: { Authorization: `Bearer ${validToken}` }
      });

      const data = await res.json();
      await new Promise(r => server.close(r));

      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      if (!data.success || data.data !== null) throw new Error('Expected data to be null when safe');
      if (createCalled) throw new Error('GET /api/emergency/active incorrectly invoked createEmergency()!');
    } finally {
      emergencyService.getActiveEmergency = origGetActive;
      emergencyService.createEmergency = origCreate;
    }
  });

  // 11. Manual SOS Click Trigger Test — POST /api/emergency creates emergency only on explicit invocation
  await runAsyncTest('emergency.routes: POST /api/emergency creates emergency explicitly on manual trigger', async () => {
    const emergencyRoutes = require('./routes/emergency.routes');
    const emergencyService = require('./services/emergencyService');
    const origCreate = emergencyService.createEmergency;

    let createdCount = 0;
    try {
      emergencyService.createEmergency = async (uId, payload) => {
        createdCount++;
        return {
          id: 'em_123',
          user: uId,
          status: 'active',
          triggerType: payload.triggerType || 'manual',
          timeline: [{ type: 'sos', message: 'Silent SOS activated' }]
        };
      };

      const app = express();
      app.use(express.json());
      app.use('/api/emergency', emergencyRoutes);

      const server = http.createServer(app);
      await new Promise(r => server.listen(0, r));
      const port = server.address().port;

      const res = await fetch(`http://localhost:${port}/api/emergency`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validToken}`
        },
        body: JSON.stringify({ triggerType: 'manual' })
      });

      const data = await res.json();
      await new Promise(r => server.close(r));

      if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
      if (!data.success || data.data.id !== 'em_123') throw new Error('Invalid emergency creation response');
      if (createdCount !== 1) throw new Error(`Expected exactly 1 emergency creation, got ${createdCount}`);
    } finally {
      emergencyService.createEmergency = origCreate;
    }
  });

  // 12. locationService.recordLocation — 60-Second Persistence Throttling (within 60s window)
  await runAsyncTest('locationService.recordLocation: throttles persistence when update is within 60s of lastLocation', async () => {
    const origLocSave = LocationEvent.prototype.save;
    const origFindById = EmergencyEvent.findById;
    const origFindOne = LocationEvent.findOne;

    try {
      // Last location recorded 10 seconds ago
      const lastLocDate = new Date(Date.now() - 10000);
      LocationEvent.findOne = () => ({
        sort: () => ({
          _id: new mongoose.Types.ObjectId(),
          user: userId,
          emergencyEvent: emergencyId,
          latitude: 14.6819,
          longitude: 77.6006,
          accuracy: 10,
          recordedAt: lastLocDate,
          toObject: function () { return this; }
        })
      });

      let saveCalled = false;
      LocationEvent.prototype.save = async function () {
        saveCalled = true;
        return this;
      };

      const mockEmergency = {
        _id: new mongoose.Types.ObjectId(emergencyId),
        user: new mongoose.Types.ObjectId(userId),
        status: 'active',
        currentLocation: { latitude: 14.6819, longitude: 77.6006, accuracy: 10, timestamp: lastLocDate },
        timeline: [],
        toObject: function () { return this; },
        save: async function () { return this; }
      };

      EmergencyEvent.findById = async () => mockEmergency;

      const res = await locationService.recordLocation(userId, {
        emergencyId,
        latitude: 14.6820,
        longitude: 77.6007,
        accuracy: 8
      });

      if (saveCalled) throw new Error('Expected LocationEvent save NOT to be called within 60s window');
      if (res.isPersisted !== false) throw new Error('Expected res.isPersisted to be false');
    } finally {
      LocationEvent.prototype.save = origLocSave;
      EmergencyEvent.findById = origFindById;
      LocationEvent.findOne = origFindOne;
    }
  });

  // 13. locationService.recordLocation — 60-Second Persistence Allowed (>= 60s elapsed)
  await runAsyncTest('locationService.recordLocation: persists new LocationEvent when 60+ seconds have elapsed', async () => {
    const origLocSave = LocationEvent.prototype.save;
    const origFindById = EmergencyEvent.findById;
    const origFindOne = LocationEvent.findOne;

    try {
      // Last location recorded 65 seconds ago
      const lastLocDate = new Date(Date.now() - 65000);
      LocationEvent.findOne = () => ({
        sort: () => ({
          _id: new mongoose.Types.ObjectId(),
          user: userId,
          emergencyEvent: emergencyId,
          latitude: 14.6819,
          longitude: 77.6006,
          accuracy: 10,
          recordedAt: lastLocDate,
          toObject: function () { return this; }
        })
      });

      let saveCalled = false;
      LocationEvent.prototype.save = async function () {
        saveCalled = true;
        this._id = new mongoose.Types.ObjectId();
        return this;
      };

      const mockEmergency = {
        _id: new mongoose.Types.ObjectId(emergencyId),
        user: new mongoose.Types.ObjectId(userId),
        status: 'active',
        currentLocation: { latitude: 14.6819, longitude: 77.6006, accuracy: 10, timestamp: lastLocDate },
        timeline: [],
        toObject: function () { return this; },
        save: async function () { return this; }
      };

      EmergencyEvent.findById = async () => mockEmergency;

      const res = await locationService.recordLocation(userId, {
        emergencyId,
        latitude: 14.6830,
        longitude: 77.6015,
        accuracy: 6
      });

      if (!saveCalled) throw new Error('Expected LocationEvent save to be called after 60s elapsed');
      if (res.isPersisted !== true) throw new Error('Expected res.isPersisted to be true');
    } finally {
      LocationEvent.prototype.save = origLocSave;
      EmergencyEvent.findById = origFindById;
      LocationEvent.findOne = origFindOne;
    }
  });

  // 14. Socket.IO Guard Test — location_updated emitted ONLY when persisted
  await runAsyncTest('tracking.controller: emits location_updated ONLY when isPersisted !== false', async () => {
    const origRecordLocation = locationService.recordLocation;

    try {
      let emitCalled = false;
      const mockIo = {
        to: () => ({
          emit: (eventName) => {
            if (eventName === 'location_updated') emitCalled = true;
          }
        })
      };

      // Case A: Throttled update (isPersisted = false)
      locationService.recordLocation = async () => ({
        id: 'loc1',
        latitude: 14.6825,
        longitude: 77.6020,
        isPersisted: false
      });

      const appA = express();
      appA.use(express.json());
      appA.set('io', mockIo);
      appA.use('/api/tracking', trackingRoutes);

      const serverA = http.createServer(appA);
      await new Promise(r => serverA.listen(0, r));
      const portA = serverA.address().port;

      await fetch(`http://localhost:${portA}/api/tracking/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${validToken}` },
        body: JSON.stringify({ emergencyId, latitude: 14.6825, longitude: 77.6020 })
      });
      await new Promise(r => serverA.close(r));

      if (emitCalled) throw new Error('Expected Socket.IO emit NOT to be called when isPersisted is false');

      // Case B: Persisted update (isPersisted = true)
      locationService.recordLocation = async () => ({
        id: 'loc2',
        latitude: 14.6825,
        longitude: 77.6020,
        recordedAt: new Date(),
        isPersisted: true
      });

      const appB = express();
      appB.use(express.json());
      appB.set('io', mockIo);
      appB.use('/api/tracking', trackingRoutes);

      const serverB = http.createServer(appB);
      await new Promise(r => serverB.listen(0, r));
      const portB = serverB.address().port;

      await fetch(`http://localhost:${portB}/api/tracking/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${validToken}` },
        body: JSON.stringify({ emergencyId, latitude: 14.6825, longitude: 77.6020 })
      });
      await new Promise(r => serverB.close(r));

      if (!emitCalled) throw new Error('Expected Socket.IO emit to be called when isPersisted is true');
    } finally {
      locationService.recordLocation = origRecordLocation;
    }
  });

  console.log(`\n========================================`);
  console.log(`Phase 5 Tracking Tests Summary: ${passCount} / ${testCount} Passed`);
  console.log(`========================================\n`);

  if (passCount !== testCount) {
    process.exit(1);
  }
}

runPhase5Tests().catch(err => {
  console.error('Phase 5 test execution crashed:', err);
  process.exit(1);
});
