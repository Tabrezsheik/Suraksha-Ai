/**
 * Guardian Controller (Phase 7 — Guardian Mode Monitoring & Anomaly Detection)
 *
 * Handles HTTP requests for starting/stopping Guardian Mode sessions,
 * recording continuous location updates, processing check-in responses,
 * and fetching active Guardian status.
 */

const guardianService = require('../services/guardianService');

/**
 * POST /api/guardian/start
 */
const startGuardian = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { destination, origin, selectedRoute, prolongedStopThresholdSeconds } = req.body;

    const session = await guardianService.startSession(userId, destination, origin, selectedRoute, prolongedStopThresholdSeconds);

    return res.status(200).json({
      success: true,
      message: 'Guardian Mode activated',
      data: {
        sessionId: session._id.toString(),
        status: session.status,
        destination: session.destination,
        origin: session.origin,
        selectedRoute: session.selectedRoute,
        prolongedStopThresholdSeconds: session.prolongedStopThresholdSeconds || 120,
        stationarySince: session.stationarySince || null,
        startedAt: session.startedAt
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/guardian/:sessionId/stop
 */
const stopGuardian = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;

    const session = await guardianService.stopSession(userId, sessionId);

    return res.status(200).json({
      success: true,
      message: 'Guardian Mode stopped',
      data: {
        sessionId: session._id.toString(),
        status: session.status,
        endedAt: session.endedAt
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/guardian/:sessionId/location
 */
const recordLocation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;
    const locationData = req.body;
    const io = req.app.get('io');

    const result = await guardianService.recordLocation(userId, sessionId, locationData, io);

    return res.status(200).json({
      success: true,
      message: 'Location recorded',
      data: {
        timestamp: result.recordedAt,
        anomaly: result.anomaly || null,
        isHighRiskLocation: result.isHighRiskLocation || false
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/guardian/:eventId/check-in
 */
const processCheckIn = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;
    const { status } = req.body;
    const io = req.app.get('io');

    const result = await guardianService.processCheckIn(userId, eventId, status, io);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        status: result.status,
        emergencyId: result.emergencyId || null
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/guardian/active
 */
const getActiveSession = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const session = await guardianService.getActiveSession(userId);

    return res.status(200).json({
      success: true,
      data: session
        ? {
            sessionId: session._id.toString(),
            status: session.status,
            destination: session.destination,
            prolongedStopThresholdSeconds: session.prolongedStopThresholdSeconds || 120,
            stationarySince: session.stationarySince || null,
            startedAt: session.startedAt,
            lastLocation: session.lastLocation
          }
        : null
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  startGuardian,
  stopGuardian,
  recordLocation,
  processCheckIn,
  getActiveSession
};
