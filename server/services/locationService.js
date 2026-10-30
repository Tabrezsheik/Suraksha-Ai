/**
 * Location & Tracking Service (Phase 5 — Live GPS & Real-Time Emergency Dashboard)
 *
 * Orchestrates location recording, emergency currentLocation updates, deduplication,
 * and historical location retrieval for active emergencies.
 */

const LocationEvent = require('../models/LocationEvent');
const EmergencyEvent = require('../models/EmergencyEvent');

const formatLocation = (loc) => {
  if (!loc) return null;
  const obj = loc.toObject ? loc.toObject() : loc;
  return {
    id: obj._id ? obj._id.toString() : obj.id,
    user: obj.user,
    emergencyEvent: obj.emergencyEvent || null,
    latitude: obj.latitude,
    longitude: obj.longitude,
    accuracy: typeof obj.accuracy === 'number' ? obj.accuracy : null,
    speed: typeof obj.speed === 'number' ? obj.speed : null,
    heading: typeof obj.heading === 'number' ? obj.heading : null,
    source: obj.source || 'emergency',
    recordedAt: obj.recordedAt || obj.createdAt
  };
};

/**
 * Record a location update for an active emergency
 */
const recordLocation = async (userId, data = {}) => {
  const { emergencyId, latitude, longitude, accuracy, speed, heading, source } = data;

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    const error = new Error('Latitude and Longitude are required numeric fields');
    error.statusCode = 400;
    throw error;
  }

  let emergency = null;
  if (emergencyId) {
    emergency = await EmergencyEvent.findById(emergencyId);
    if (!emergency) {
      const error = new Error('Emergency event not found');
      error.statusCode = 404;
      throw error;
    }

    if (emergency.user.toString() !== userId.toString()) {
      const error = new Error('Access denied: You can only submit tracking for your own emergency');
      error.statusCode = 403;
      throw error;
    }

    if (emergency.status !== 'active') {
      const error = new Error(`Cannot submit tracking location for an emergency that is ${emergency.status}`);
      error.statusCode = 400;
      throw error;
    }
  }

  const now = new Date();

  // 60-Second Persistence Gate: check if the latest LocationEvent for this emergency was recorded < 60s ago
  if (emergencyId) {
    const lastLoc = await LocationEvent.findOne({ emergencyEvent: emergencyId }).sort({ recordedAt: -1 });
    if (lastLoc) {
      const elapsedMs = now.getTime() - new Date(lastLoc.recordedAt).getTime();
      if (elapsedMs < 60000) {
        // Within 60-second window: do NOT persist new LocationEvent document
        const formattedLast = formatLocation(lastLoc);
        formattedLast.isPersisted = false;
        return formattedLast;
      }
    }
  }

  // Create new LocationEvent document
  const locationEvent = new LocationEvent({
    user: userId,
    emergencyEvent: emergencyId || null,
    latitude,
    longitude,
    accuracy: typeof accuracy === 'number' ? accuracy : null,
    speed: typeof speed === 'number' ? speed : null,
    heading: typeof heading === 'number' ? heading : null,
    source: source === 'guardian' ? 'guardian' : 'emergency',
    recordedAt: now
  });

  await locationEvent.save();

  // Update EmergencyEvent.currentLocation if linked with quality selection
  let updatedTimeline = [];
  if (emergency) {
    const hadNoLocation = !emergency.currentLocation || typeof emergency.currentLocation.latitude !== 'number';

    const currentAcc = emergency.currentLocation && typeof emergency.currentLocation.accuracy === 'number'
      ? emergency.currentLocation.accuracy
      : null;
    const currentTs = emergency.currentLocation && emergency.currentLocation.timestamp
      ? new Date(emergency.currentLocation.timestamp).getTime()
      : 0;
    const isRecent = (now.getTime() - currentTs) < 60000; // within last 60 seconds

    // Quality check: prevent poor location reading from overwriting a recent high-precision location
    let shouldUpdateCurrentLoc = true;
    if (!hadNoLocation && isRecent && currentAcc !== null && typeof accuracy === 'number') {
      if (accuracy > 500 && currentAcc <= 100) {
        // Low precision reading (>500m) arriving after a high precision reading (<=100m)
        shouldUpdateCurrentLoc = false;
      } else if (accuracy > (currentAcc * 3) && currentAcc <= 50) {
        // Degraded accuracy by >3x compared to recent high-precision reading
        shouldUpdateCurrentLoc = false;
      }
    }

    if (shouldUpdateCurrentLoc) {
      emergency.currentLocation = {
        latitude,
        longitude,
        accuracy: typeof accuracy === 'number' ? accuracy : null,
        timestamp: now
      };
    }

    // Dynamic Risk Refresh: Evaluate spatial SafetyZone proximity using existing Phase 6 risk engine
    try {
      const SafetyZone = require('../models/SafetyZone');
      const riskService = require('./riskService');
      const activeHighRiskZones = await SafetyZone.find({ active: true, riskLevel: 'high' });

      let inHighRiskZone = false;
      for (const zone of activeHighRiskZones) {
        if (zone.center && typeof zone.center.latitude === 'number' && typeof zone.center.longitude === 'number') {
          const R = 6371000;
          const dLat = (latitude - zone.center.latitude) * Math.PI / 180;
          const dLon = (longitude - zone.center.longitude) * Math.PI / 180;
          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(zone.center.latitude * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distMeters = R * c;

          if (distMeters <= (zone.radiusMeters || 500)) {
            inHighRiskZone = true;
            break;
          }
        }
      }

      const activeSignals = [];
      if (inHighRiskZone) {
        activeSignals.push({ type: 'high_risk_location', points: 20 });
      }

      const refreshedRisk = riskService.calculateInitialRisk(emergency.triggerType || 'manual', activeSignals);
      if (refreshedRisk.score !== emergency.currentRiskScore) {
        emergency.currentRiskScore = refreshedRisk.score;
        emergency.riskLevel = refreshedRisk.level;
        emergency.timeline.push({
          type: 'risk_update',
          message: `Risk updated based on location context: ${refreshedRisk.score} (${refreshedRisk.level.toUpperCase()})`,
          timestamp: now
        });
      }
    } catch (riskRefreshErr) {
      console.warn('[LocationService] Dynamic risk refresh warning:', riskRefreshErr.message);
    }

    if (hadNoLocation) {
      emergency.timeline.push({
        type: 'location',
        message: 'GPS tracking started: Current location received',
        timestamp: now
      });
    }

    // Add location entry to emergency timeline if initial update or periodic tracking
    if (hadNoLocation || emergency.timeline.length < 20) {
      const accuracyStr = typeof accuracy === 'number' ? ` (Accuracy: ±${Math.round(accuracy)}m)` : '';
      emergency.timeline.push({
        type: 'location',
        message: `Location updated: Lat ${latitude.toFixed(4)}, Lon ${longitude.toFixed(4)}${accuracyStr}`,
        timestamp: now
      });
    }

    await emergency.save();
    updatedTimeline = (emergency.timeline || []).map(t => ({
      type: t.type,
      message: t.message,
      timestamp: t.timestamp
    }));
  }

  const formatted = formatLocation(locationEvent);
  formatted.isPersisted = true;
  if (updatedTimeline.length > 0) {
    formatted.timeline = updatedTimeline;
  }
  return formatted;
};

/**
 * Get Location History for an Emergency Event
 */
const getLocationHistory = async (userId, emergencyId) => {
  const emergency = await EmergencyEvent.findById(emergencyId);
  if (!emergency) {
    const error = new Error('Emergency event not found');
    error.statusCode = 404;
    throw error;
  }

  if (emergency.user.toString() !== userId.toString()) {
    const error = new Error('Access denied: You can only view tracking history for your own emergency');
    error.statusCode = 403;
    throw error;
  }

  const locations = await LocationEvent.find({ emergencyEvent: emergencyId }).sort({ recordedAt: 1 });
  return locations.map(formatLocation);
};

module.exports = {
  recordLocation,
  getLocationHistory,
  formatLocation
};
