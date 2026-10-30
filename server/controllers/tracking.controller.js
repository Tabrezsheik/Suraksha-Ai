/**
 * Tracking Controller (Phase 5 — Live GPS & Real-Time Emergency Dashboard)
 *
 * HTTP controller for recording location updates and retrieving location history.
 */

const locationService = require('../services/locationService');

/**
 * POST /api/tracking/location
 * Submit live location update for an active emergency
 */
const recordLocation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { emergencyId, latitude, longitude, accuracy, speed, heading, source } = req.body;

    const locationData = await locationService.recordLocation(userId, {
      emergencyId,
      latitude,
      longitude,
      accuracy,
      speed,
      heading,
      source
    });

    // Emit real-time Socket.IO event to room emergency:<emergencyId> ONLY when location is persisted
    const io = req.app.get('io');
    if (io && emergencyId && locationData && locationData.isPersisted !== false) {
      io.to(`emergency:${emergencyId}`).emit('location_updated', {
        emergencyId,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        speed: locationData.speed,
        heading: locationData.heading,
        timestamp: locationData.recordedAt,
        timeline: locationData.timeline || undefined
      });
    }

    res.status(201).json({
      success: true,
      message: locationData.isPersisted !== false ? 'Location recorded' : 'Location update throttled (within 60s window)',
      data: locationData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/tracking/:emergencyId
 * Retrieve recorded location history for an emergency
 */
const getLocationHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { emergencyId } = req.params;

    const history = await locationService.getLocationHistory(userId, emergencyId);

    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  recordLocation,
  getLocationHistory
};
