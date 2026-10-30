/**
 * Guardian Service (Phase 7 — Guardian Mode Monitoring & Anomaly Detection)
 *
 * Implements journey session lifecycle, continuous location monitoring,
 * server-side 500m route deviation detection, 5-minute suspicious stoppage detection,
 * SafetyZone proximity checks, user check-in handling, 60s auto-escalation timer,
 * and emergency escalation with triggerType: "guardian".
 */

const GuardianSession = require('../models/GuardianSession');
const GuardianEvent = require('../models/GuardianEvent');
const SafetyZone = require('../models/SafetyZone');
const LocationEvent = require('../models/LocationEvent');
const EmergencyEvent = require('../models/EmergencyEvent');
const emergencyService = require('./emergencyService');

const ROUTE_DEVIATION_METERS = 500;
const STOPPAGE_SPEED_THRESHOLD = 0.5; // m/s
const STOPPAGE_DURATION_SECONDS = 120; // 2 minutes (prolonged stop threshold)
const CHECKIN_TIMEOUT_MS = 60000; // 60 seconds

// Store active check-in timeout timers in memory
const timeoutRegistry = new Map();

/**
 * Standard Haversine distance calculation in meters
 */
const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Start Guardian Mode Session
 */
const startSession = async (userId, destination, origin = null, selectedRoute = null, prolongedStopThresholdSeconds = 120) => {
  // Check if user already has an active Guardian session
  const existingSession = await GuardianSession.findOne({ user: userId, status: 'active' });
  if (existingSession) {
    const err = new Error('An active Guardian session already exists');
    err.code = 'GUARDIAN_SESSION_ACTIVE';
    err.statusCode = 409;
    throw err;
  }

  const validThresholds = [60, 120, 300, 600, 900];
  const threshold = (typeof prolongedStopThresholdSeconds === 'number' && validThresholds.includes(prolongedStopThresholdSeconds))
    ? prolongedStopThresholdSeconds
    : 120;

  const sessionData = {
    user: userId,
    destination: {
      latitude: destination.latitude,
      longitude: destination.longitude,
      name: destination.name || 'Selected Destination'
    },
    prolongedStopThresholdSeconds: threshold,
    status: 'active',
    startedAt: new Date()
  };

  if (origin && origin.latitude && origin.longitude) {
    sessionData.origin = {
      latitude: origin.latitude,
      longitude: origin.longitude,
      name: origin.name || 'Starting Location'
    };
  }

  if (selectedRoute) {
    if (selectedRoute.isEstimatedGeometry) {
      const err = new Error('Guardian Mode unavailable — verified route geometry required.');
      err.code = 'UNVERIFIED_ROUTE_GEOMETRY';
      err.statusCode = 400;
      throw err;
    }
    if (!selectedRoute.coordinates || !Array.isArray(selectedRoute.coordinates) || selectedRoute.coordinates.length < 2) {
      const err = new Error('Guardian Mode unavailable — verified route geometry required.');
      err.code = 'MISSING_ROUTE_GEOMETRY';
      err.statusCode = 400;
      throw err;
    }
    sessionData.selectedRoute = selectedRoute;
  }

  const session = new GuardianSession(sessionData);

  await session.save();
  return session;
};

/**
 * Stop Guardian Mode Session
 */
const stopSession = async (userId, sessionId) => {
  const session = await GuardianSession.findById(sessionId);
  if (!session) {
    const err = new Error('Guardian session not found');
    err.code = 'GUARDIAN_SESSION_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  if (session.user.toString() !== userId.toString()) {
    const err = new Error('Access denied: You can only stop your own Guardian session');
    err.code = 'FORBIDDEN';
    err.statusCode = 403;
    throw err;
  }

  session.status = 'stopped';
  session.endedAt = new Date();
  await session.save();
  return session;
};

/**
 * Get Active Session for User
 */
const getActiveSession = async (userId) => {
  return await GuardianSession.findOne({ user: userId, status: 'active' });
};

/**
 * Record Guardian Location & Perform Server-Side Anomaly Checks
 */
const recordLocation = async (userId, sessionId, locationData, io = null) => {
  const session = await GuardianSession.findById(sessionId);
  if (!session) {
    const err = new Error('Guardian session not found');
    err.code = 'GUARDIAN_SESSION_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  if (session.user.toString() !== userId.toString()) {
    const err = new Error('Access denied to this Guardian session');
    err.code = 'FORBIDDEN';
    err.statusCode = 403;
    throw err;
  }

  if (session.status !== 'active') {
    const err = new Error(`Guardian session is ${session.status}`);
    err.code = 'GUARDIAN_SESSION_INACTIVE';
    err.statusCode = 400;
    throw err;
  }

  const { latitude, longitude, speed = 0, accuracy = null } = locationData;
  const now = new Date();
  const thresholdSecs = session.prolongedStopThresholdSeconds || 120;

  // Save LocationEvent with source: "guardian" per Database.md §7
  const locEvent = new LocationEvent({
    user: userId,
    latitude,
    longitude,
    accuracy,
    speed,
    source: 'guardian',
    recordedAt: now
  });
  await locEvent.save();

  // Capture previous location for deviation/stoppage comparison BEFORE updating session.lastLocation
  const prevLocation = session.lastLocation && session.lastLocation.latitude
    ? { latitude: session.lastLocation.latitude, longitude: session.lastLocation.longitude, recordedAt: session.lastLocation.recordedAt }
    : null;

  // Determine movement state
  const stepMove = prevLocation ? calculateDistanceMeters(prevLocation.latitude, prevLocation.longitude, latitude, longitude) : 0;
  const isMoving = (prevLocation && stepMove > 20) || speed >= STOPPAGE_SPEED_THRESHOLD;

  if (isMoving) {
    // Movement Reset: reset stationary timing and clear duplicate alert guard
    session.stationarySince = null;
    session.lastProlongedStopAlertAt = null;
  } else {
    // User is stationary: establish or maintain stationarySince timestamp
    if (!session.stationarySince) {
      session.stationarySince = prevLocation && prevLocation.recordedAt ? prevLocation.recordedAt : now;
    }
  }

  session.lastLocation = { latitude, longitude, recordedAt: now };
  await session.save();

  // 1. SafetyZone High-Risk Location Check
  let isHighRiskLocation = false;
  const activeSafetyZones = await SafetyZone.find({ active: true, riskLevel: 'high' });
  for (const zone of activeSafetyZones) {
    const distToZone = calculateDistanceMeters(latitude, longitude, zone.center.latitude, zone.center.longitude);
    if (distToZone <= zone.radiusMeters) {
      isHighRiskLocation = true;
      break;
    }
  }

  // 2. Server-Side Route Deviation Check (> 500m off expected direct line towards destination)
  let detectedAnomalyType = null;
  const destLat = session.destination.latitude;
  const destLon = session.destination.longitude;

  // Calculate direct distance from current location to destination
  const distToDest = calculateDistanceMeters(latitude, longitude, destLat, destLon);

  if (prevLocation && prevLocation.latitude) {
    const prevDist = calculateDistanceMeters(prevLocation.latitude, prevLocation.longitude, destLat, destLon);
    
    // Deviation check: if current location is > 500m further away from destination than previous location
    if (distToDest > prevDist + ROUTE_DEVIATION_METERS && stepMove > 100) {
      detectedAnomalyType = 'route_deviation';
    }
  }

  // 3. Server-Side Suspicious Stoppage Check (configurable duration: 60s, 120s, 300s, 600s, 900s)
  if (!detectedAnomalyType && session.stationarySince) {
    const timeSpanSecs = (now.getTime() - new Date(session.stationarySince).getTime()) / 1000;

    // Stationary check: stationary duration >= configured threshold and no previous alert fired for this incident
    if (timeSpanSecs >= thresholdSecs && !session.lastProlongedStopAlertAt) {
      detectedAnomalyType = 'suspicious_stoppage';
    }
  }

  // If an anomaly is detected and no pending check-in exists, create GuardianEvent and notify client
  if (detectedAnomalyType) {
    const existingCheckIn = await GuardianEvent.findOne({
      user: userId,
      guardianSession: session._id,
      status: 'check_in'
    });

    if (!existingCheckIn) {
      if (detectedAnomalyType === 'suspicious_stoppage') {
        session.lastProlongedStopAlertAt = now;
        await session.save();
      }

      const gEvent = new GuardianEvent({
        user: userId,
        guardianSession: session._id,
        type: detectedAnomalyType,
        riskScore: detectedAnomalyType === 'route_deviation' ? 15 : 10,
        status: 'check_in',
        location: { latitude, longitude, timestamp: now },
        detectedAt: now
      });

      await gEvent.save();

      // Emit Socket.IO guardian_warning event to room user:<userId>
      if (io) {
        io.to(`user:${userId}`).emit('guardian_warning', {
          eventId: gEvent._id.toString(),
          type: detectedAnomalyType,
          message: detectedAnomalyType === 'route_deviation'
            ? 'Unusual activity detected: Route Deviation'
            : 'Unusual activity detected: Possible prolonged stop detected.',
          requiresCheckIn: true,
          timeoutSeconds: 60
        });
      }

      // Schedule 60-second automatic escalation timer
      scheduleCheckInTimeout(gEvent._id.toString(), userId, session._id.toString(), io);
    }
  }

  return {
    recordedAt: now,
    anomaly: detectedAnomalyType,
    isHighRiskLocation
  };
};

/**
 * Schedule 60-second Check-In Auto-Escalation Timer
 */
const scheduleCheckInTimeout = (eventId, userId, sessionId, io) => {
  if (timeoutRegistry.has(eventId)) {
    clearTimeout(timeoutRegistry.get(eventId));
  }

  const timer = setTimeout(async () => {
    try {
      timeoutRegistry.delete(eventId);
      const gEvent = await GuardianEvent.findById(eventId);

      if (gEvent && gEvent.status === 'check_in') {
        console.log(`[guardianService] 60s Check-in timeout reached for event ${eventId}. Auto-escalating to emergency.`);
        await processCheckIn(userId, eventId, 'get_help', io);
      }
    } catch (err) {
      console.error('[guardianService] Error executing 60s check-in auto-escalation:', err);
    }
  }, CHECKIN_TIMEOUT_MS);

  timeoutRegistry.set(eventId, timer);
};

/**
 * Process User Check-In Response ('safe' vs 'get_help')
 */
const processCheckIn = async (userId, eventId, checkInStatus, io = null) => {
  const gEvent = await GuardianEvent.findById(eventId);
  if (!gEvent) {
    const err = new Error('Guardian event not found');
    err.code = 'GUARDIAN_EVENT_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  if (gEvent.user.toString() !== userId.toString()) {
    const err = new Error('Access denied to this Guardian event');
    err.code = 'FORBIDDEN';
    err.statusCode = 403;
    throw err;
  }

  // Clear timeout timer if active
  if (timeoutRegistry.has(eventId)) {
    clearTimeout(timeoutRegistry.get(eventId));
    timeoutRegistry.delete(eventId);
  }

  const now = new Date();

  if (checkInStatus === 'safe') {
    gEvent.status = 'safe';
    gEvent.resolvedAt = now;
    await gEvent.save();

    // Reset session stationary alert state after user confirms safe
    const session = await GuardianSession.findById(gEvent.guardianSession);
    if (session) {
      session.stationarySince = null;
      session.lastProlongedStopAlertAt = null;
      await session.save();
    }

    return {
      status: 'safe',
      message: 'Safety confirmed. Guardian Mode continues monitoring.'
    };
  }

  if (checkInStatus === 'get_help') {
    gEvent.status = 'escalated';
    gEvent.resolvedAt = now;

    // Update GuardianSession status to escalated
    const session = await GuardianSession.findById(gEvent.guardianSession);
    if (session) {
      session.status = 'escalated';
      session.endedAt = now;
      await session.save();
    }

    // Create EmergencyEvent with triggerType: "guardian" via existing emergency creation logic
    const signals = [
      { type: gEvent.type, value: true, points: gEvent.type === 'route_deviation' ? 15 : 10 }
    ];

    const emergencyData = {
      triggerType: 'guardian',
      latitude: gEvent.location ? gEvent.location.latitude : null,
      longitude: gEvent.location ? gEvent.location.longitude : null,
      signals
    };

    // Delegate to existing emergencyService.createEmergency without modifying it
    const emergency = await emergencyService.createEmergency(userId, emergencyData, io);

    // Link emergencyEvent to GuardianEvent
    gEvent.emergencyEvent = emergency.id || emergency._id;
    await gEvent.save();

    return {
      status: 'escalated',
      emergencyId: emergency.id || emergency._id,
      message: 'Emergency escalated successfully'
    };
  }

  const err = new Error("Invalid check-in status. Must be 'safe' or 'get_help'");
  err.code = 'INVALID_CHECKIN_STATUS';
  err.statusCode = 422;
  throw err;
};

/**
 * Server-Side Active Session Prolonged Stop Monitor
 * Evaluates stationary elapsed time for all active Guardian sessions every 10 seconds.
 */

let monitorIntervalId = null;

const startActiveSessionMonitor = (io = null) => {
  if (monitorIntervalId) return;

  monitorIntervalId = setInterval(async () => {
    try {
      const activeSessions = await GuardianSession.find({ status: 'active' });
      const now = new Date();

      for (const session of activeSessions) {
        const thresholdSecs = session.prolongedStopThresholdSeconds || 120;
        const userId = session.user.toString();

        if (session.stationarySince) {
          const elapsedSecs = (now.getTime() - new Date(session.stationarySince).getTime()) / 1000;

          if (elapsedSecs >= thresholdSecs && !session.lastProlongedStopAlertAt) {
            // Guard against duplicate alerts for the same incident
            const existingCheckIn = await GuardianEvent.findOne({
              user: session.user,
              guardianSession: session._id,
              status: 'check_in'
            });

            if (!existingCheckIn) {
              session.lastProlongedStopAlertAt = now;
              await session.save();

              const gEvent = new GuardianEvent({
                user: session.user,
                guardianSession: session._id,
                type: 'suspicious_stoppage',
                riskScore: 10,
                status: 'check_in',
                location: session.lastLocation ? { latitude: session.lastLocation.latitude, longitude: session.lastLocation.longitude, timestamp: now } : null,
                detectedAt: now
              });
              await gEvent.save();

              if (io) {
                io.to(`user:${userId}`).emit('guardian_warning', {
                  eventId: gEvent._id.toString(),
                  type: 'suspicious_stoppage',
                  message: 'Unusual activity detected: Possible prolonged stop detected.',
                  requiresCheckIn: true,
                  timeoutSeconds: 60
                });
              }

              scheduleCheckInTimeout(gEvent._id.toString(), userId, session._id.toString(), io);
            }
          }
        }
      }
    } catch (err) {
      console.error('[guardianService] Error in active session monitor:', err.message);
    }
  }, 10000);
};

module.exports = {
  startSession,
  stopSession,
  getActiveSession,
  recordLocation,
  processCheckIn,
  calculateDistanceMeters,
  startActiveSessionMonitor
};

