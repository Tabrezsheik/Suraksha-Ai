/**
 * Emergency Core Service (Phase 4 — Silent SOS & Emergency Core)
 *
 * Orchestrates emergency creation, active emergency lookup, ownership verification,
 * initial location/risk processing, Trusted Circle integration, timeline events,
 * and Cancel/Resolve lifecycle state transitions.
 */

const EmergencyEvent = require('../models/EmergencyEvent');
const contactService = require('./contactService');
const riskService = require('./riskService');

const formatEmergency = (emergency) => {
  if (!emergency) return null;
  const obj = emergency.toObject ? emergency.toObject() : emergency;
  return {
    id: obj._id ? obj._id.toString() : obj.id,
    emergencyId: obj._id ? obj._id.toString() : obj.id,
    user: obj.user,
    triggerType: obj.triggerType,
    status: obj.status,
    startedAt: obj.startedAt,
    endedAt: obj.endedAt || null,
    initialRiskScore: obj.initialRiskScore,
    currentRiskScore: obj.currentRiskScore,
    riskLevel: obj.riskLevel,
    currentLocation: obj.currentLocation || null,
    trustedContactsNotified: Boolean(obj.trustedContactsNotified),
    evidenceIds: obj.evidenceIds || [],
    timeline: (obj.timeline || []).map(t => ({
      type: t.type,
      message: t.message,
      timestamp: t.timestamp
    })),
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt
  };
};

/**
 * Activate Silent SOS & Create Emergency Event
 */
const createEmergency = async (userId, data = {}) => {
  // 1. Check if user already has an active emergency (prevent duplicates)
  const existingActive = await EmergencyEvent.findOne({ user: userId, status: 'active' });
  if (existingActive) {
    const error = new Error('An active emergency already exists for this user');
    error.statusCode = 409;
    error.code = 'DUPLICATE_ACTIVE_EMERGENCY';
    error.existingEmergencyId = existingActive._id.toString();
    throw error;
  }

  // 2. Query user's active trusted contacts
  const activeContacts = await contactService.getActiveContacts(userId);
  const contactsCount = Array.isArray(activeContacts) ? activeContacts.length : 0;
  const hasActiveContacts = contactsCount > 0;

  // 3. Calculate initial risk score & level
  const dataObj = (data && typeof data === 'object') ? data : {};
  const triggerType = dataObj.triggerType || (typeof arguments[2] === 'string' ? arguments[2] : 'manual');
  const initialRisk = riskService.calculateInitialRisk(triggerType, dataObj.signals || []);

  // 4. Initial location processing
  let initialLoc = null;
  const locObj = dataObj.location || dataObj;
  if (locObj && typeof locObj.latitude === 'number' && typeof locObj.longitude === 'number') {
    initialLoc = {
      latitude: locObj.latitude,
      longitude: locObj.longitude,
      accuracy: typeof locObj.accuracy === 'number' ? locObj.accuracy : null,
      timestamp: new Date()
    };
  }

  // 5. Construct initial timeline
  const now = new Date();
  const timeline = [
    {
      type: 'sos',
      message: `Silent SOS activated (${triggerType})`,
      timestamp: now
    }
  ];

  if (initialLoc) {
    timeline.push({
      type: 'location',
      message: `Initial location captured: Lat ${initialLoc.latitude.toFixed(4)}, Lon ${initialLoc.longitude.toFixed(4)}`,
      timestamp: now
    });
  } else {
    timeline.push({
      type: 'location',
      message: 'Initial location unavailable (Permission denied or location disabled)',
      timestamp: now
    });
  }

  timeline.push({
    type: 'risk_update',
    message: `Initial risk score calculated: ${initialRisk.score} (${initialRisk.level.toUpperCase()})`,
    timestamp: now
  });

  if (hasActiveContacts) {
    timeline.push({
      type: 'alert',
      message: `Trusted Circle alert trigger point executed (${contactsCount} active contacts identified)`,
      timestamp: now
    });
  } else {
    timeline.push({
      type: 'alert',
      message: 'Trusted Circle checked: No active contacts found',
      timestamp: now
    });
  }

  // 6. Save EmergencyEvent
  const emergency = new EmergencyEvent({
    user: userId,
    triggerType,
    status: 'active',
    startedAt: now,
    initialRiskScore: initialRisk.score,
    currentRiskScore: initialRisk.score,
    riskLevel: initialRisk.level,
    currentLocation: initialLoc,
    trustedContactsNotified: hasActiveContacts,
    timeline
  });

  await emergency.save();

  // Dispatch Firebase & Trusted Circle notifications asynchronously
  try {
    const notificationService = require('./notificationService');
    const selfNotificationService = require('./selfNotificationService');
    const User = require('../models/User');
    const targetUserId = (userId && userId._id) ? userId._id : userId;
    const userObj = (userId && userId.name && userId._id) ? userId : await User.findById(targetUserId);
    if (userObj) {
      notificationService.dispatchEmergencyNotifications(userObj, emergency).catch((err) => {
        console.error('[EmergencyService] Async notification dispatch warning:', err.message);
      });
    }

    // Dispatch automatic self-notification to configured account owner
    selfNotificationService.notifyAccountOwner(emergency, {
      sequenceNumber: 1,
      location: initialLoc,
      riskScore: initialRisk.score,
      riskLevel: initialRisk.level,
      triggerType
    }).catch((sErr) => {
      console.error('[EmergencyService] Async self-notification dispatch warning:', sErr.message);
    });
  } catch (nErr) {
    console.error('[EmergencyService] Notification trigger error:', nErr.message);
  }

  return formatEmergency(emergency);
};

/**
 * Get User's Current Active Emergency
 */
const getActiveEmergency = async (userId) => {
  const emergency = await EmergencyEvent.findOne({ user: userId, status: 'active' });
  return formatEmergency(emergency);
};

/**
 * Get Emergency Details by ID
 */
const getEmergencyById = async (userId, emergencyId) => {
  const emergency = await EmergencyEvent.findById(emergencyId);
  if (!emergency) {
    const error = new Error('Emergency event not found');
    error.statusCode = 404;
    throw error;
  }

  if (emergency.user.toString() !== userId.toString()) {
    const error = new Error('Access denied to this emergency event');
    error.statusCode = 403;
    throw error;
  }

  return formatEmergency(emergency);
};

/**
 * Cancel Emergency Event
 */
const cancelEmergency = async (userId, emergencyId) => {
  const emergency = await EmergencyEvent.findById(emergencyId);
  if (!emergency) {
    const error = new Error('Emergency event not found');
    error.statusCode = 404;
    throw error;
  }

  if (emergency.user.toString() !== userId.toString()) {
    const error = new Error('Access denied: You can only cancel your own emergency');
    error.statusCode = 403;
    throw error;
  }

  // Repeated cancellation of an already-cancelled event is idempotent and returns the cancelled record
  if (emergency.status === 'cancelled') {
    return formatEmergency(emergency);
  }

  if (emergency.status !== 'active') {
    const error = new Error(`Cannot cancel an emergency that is already ${emergency.status}`);
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();
  emergency.status = 'cancelled';
  emergency.endedAt = now;
  emergency.timeline.push({
    type: 'cancelled',
    message: 'Emergency cancelled by user',
    timestamp: now
  });

  await emergency.save();
  return formatEmergency(emergency);
};

/**
 * Resolve Emergency Event
 */
const resolveEmergency = async (userId, emergencyId, resolutionNote) => {
  const emergency = await EmergencyEvent.findById(emergencyId);
  if (!emergency) {
    const error = new Error('Emergency event not found');
    error.statusCode = 404;
    throw error;
  }

  if (emergency.user.toString() !== userId.toString()) {
    const error = new Error('Access denied: You can only resolve your own emergency');
    error.statusCode = 403;
    throw error;
  }

  if (emergency.status !== 'active') {
    const error = new Error(`Cannot resolve an emergency that is already ${emergency.status}`);
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();
  emergency.status = 'resolved';
  emergency.endedAt = now;
  emergency.timeline.push({
    type: 'resolved',
    message: resolutionNote && typeof resolutionNote === 'string' ? resolutionNote : 'Emergency resolved: User confirmed safe',
    timestamp: now
  });

  await emergency.save();
  return formatEmergency(emergency);
};

/**
 * Update Initial Location of an Active Emergency Event
 */
const updateInitialLocation = async (userId, emergencyId, locationData = {}) => {
  const emergency = await EmergencyEvent.findById(emergencyId);
  if (!emergency) {
    const error = new Error('Emergency event not found');
    error.statusCode = 404;
    throw error;
  }

  if (emergency.user.toString() !== userId.toString()) {
    const error = new Error('Access denied: You can only update your own emergency');
    error.statusCode = 403;
    throw error;
  }

  if (emergency.status !== 'active') {
    const error = new Error(`Cannot update location for an emergency that is ${emergency.status}`);
    error.statusCode = 400;
    throw error;
  }

  if (typeof locationData.latitude === 'number' && typeof locationData.longitude === 'number') {
    const now = new Date();
    emergency.currentLocation = {
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      accuracy: typeof locationData.accuracy === 'number' ? locationData.accuracy : null,
      timestamp: now
    };

    const capturedMessage = `Initial location captured: Lat ${locationData.latitude.toFixed(4)}, Lon ${locationData.longitude.toFixed(4)}`;

    const unavailableIdx = (emergency.timeline || []).findIndex(
      t => t.message && t.message.includes('Initial location unavailable')
    );

    if (unavailableIdx !== -1) {
      emergency.timeline[unavailableIdx].message = capturedMessage;
      emergency.timeline[unavailableIdx].timestamp = now;
    } else {
      const existingCapturedIdx = (emergency.timeline || []).findIndex(
        t => t.message && t.message.includes('Initial location captured')
      );

      if (existingCapturedIdx !== -1) {
        emergency.timeline[existingCapturedIdx].message = capturedMessage;
        emergency.timeline[existingCapturedIdx].timestamp = now;
      } else {
        emergency.timeline.push({
          type: 'location',
          message: capturedMessage,
          timestamp: now
        });
      }
    }

    await emergency.save();
  }

  return formatEmergency(emergency);
};

/**
 * Record a 60-Second Periodic Emergency Update
 */
const recordPeriodicUpdate = async (userId, emergencyId, data = {}) => {
  const emergency = await EmergencyEvent.findById(emergencyId);
  if (!emergency) {
    const error = new Error('Emergency event not found');
    error.statusCode = 404;
    throw error;
  }

  if (emergency.user.toString() !== userId.toString()) {
    const error = new Error('Access denied: You can only update your own emergency');
    error.statusCode = 403;
    throw error;
  }

  if (emergency.status !== 'active') {
    const error = new Error(`Cannot dispatch update for an emergency that is ${emergency.status}`);
    error.statusCode = 400;
    throw error;
  }

  const sequenceNumber = typeof data.sequenceNumber === 'number' ? data.sequenceNumber : 1;

  if (sequenceNumber > 20) {
    const error = new Error('Maximum periodic emergency updates (20) reached. Update #21 is not permitted.');
    error.statusCode = 400;
    error.code = 'MAX_UPDATES_EXCEEDED';
    throw error;
  }

  const dedupMessageKey = `Emergency update #${sequenceNumber} sent to Trusted Circle`;

  // Deduplication check
  const alreadyDispatched = (emergency.timeline || []).some(
    t => t.message && t.message.includes(dedupMessageKey)
  );

  if (alreadyDispatched) {
    return formatEmergency(emergency);
  }

  const now = new Date();

  // Update location if fresh location provided
  if (data.location && typeof data.location.latitude === 'number' && typeof data.location.longitude === 'number') {
    emergency.currentLocation = {
      latitude: data.location.latitude,
      longitude: data.location.longitude,
      accuracy: typeof data.location.accuracy === 'number' ? data.location.accuracy : null,
      timestamp: now
    };
  }

  const locObj = emergency.currentLocation;
  const locStr = locObj && typeof locObj.latitude === 'number'
    ? `Lat ${locObj.latitude.toFixed(4)}, Lon ${locObj.longitude.toFixed(4)}`
    : 'LOCATION_UPDATE_UNAVAILABLE';

  const riskScore = emergency.currentRiskScore;
  const riskLevel = emergency.riskLevel;
  const evidenceSeg = data.evidenceSegment || sequenceNumber;
  const evidenceState = data.evidenceStatus || 'RECORDING';

  const timelineMessage = `${dedupMessageKey} (${locStr}, Risk: ${riskScore} [${(riskLevel || 'low').toUpperCase()}], Audio: Segment ${evidenceSeg} - ${evidenceState})`;

  emergency.timeline.push({
    type: 'alert',
    message: timelineMessage,
    timestamp: now
  });

  await emergency.save();

  // Async dispatch notifications to Trusted Circle and Account Owner
  try {
    const notificationService = require('./notificationService');
    const selfNotificationService = require('./selfNotificationService');
    const User = require('../models/User');
    const userObj = await User.findById(userId);
    if (userObj) {
      notificationService.dispatchPeriodicEmergencyUpdate(userObj, emergency, sequenceNumber, {
        location: locObj,
        riskScore,
        riskLevel,
        evidenceSegment: evidenceSeg,
        evidenceStatus: evidenceState
      }).catch((err) => {
        console.error('[EmergencyService] Periodic update notification error:', err.message);
      });
    }

    // Dispatch automatic self-notification update to configured account owner
    selfNotificationService.notifyAccountOwner(emergency, {
      sequenceNumber,
      location: locObj,
      riskScore,
      riskLevel
    }).catch((sErr) => {
      console.error('[EmergencyService] Periodic self-notification warning:', sErr.message);
    });
  } catch (nErr) {
    console.error('[EmergencyService] Periodic notification trigger warning:', nErr.message);
  }

  return formatEmergency(emergency);
};

module.exports = {
  createEmergency,
  getActiveEmergency,
  getEmergencyById,
  cancelEmergency,
  resolveEmergency,
  updateInitialLocation,
  recordPeriodicUpdate,
  formatEmergency
};
