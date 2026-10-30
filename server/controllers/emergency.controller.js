/**
 * Emergency Controller (Phase 4 — Silent SOS & Emergency Core)
 *
 * Thin HTTP layer for emergency lifecycle endpoints.
 */

const emergencyService = require('../services/emergencyService');

/**
 * POST /api/emergency
 * Activate Silent SOS & Create Emergency Event
 */
const activateSOS = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { triggerType, location, signals } = req.body;

    const emergency = await emergencyService.createEmergency(userId, {
      triggerType,
      location,
      signals
    });

    const io = req.app?.get ? req.app.get('io') : null;
    if (io && emergency) {
      io.to(`user:${userId}`).emit('emergency_created', {
        emergencyId: emergency.id || emergency.emergencyId,
        triggerType: emergency.triggerType
      });
    }

    res.status(201).json({
      success: true,
      message: 'Emergency activated',
      data: emergency
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/emergency/active
 * Get user's current active emergency
 */
const getActiveEmergency = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const emergency = await emergencyService.getActiveEmergency(userId);

    res.status(200).json({
      success: true,
      data: emergency
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/emergency/:emergencyId
 * Get emergency details by ID
 */
const getEmergencyDetails = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { emergencyId } = req.params;

    const emergency = await emergencyService.getEmergencyById(userId, emergencyId);

    res.status(200).json({
      success: true,
      data: emergency
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/emergency/:emergencyId/cancel
 * Cancel an active emergency
 */
const cancelEmergency = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { emergencyId } = req.params;

    const emergency = await emergencyService.cancelEmergency(userId, emergencyId);

    const io = req.app?.get ? req.app.get('io') : null;
    if (io) {
      io.to(`emergency:${emergencyId}`).emit('emergency_cancelled', { emergencyId });
      io.to(`user:${userId}`).emit('emergency_cancelled', { emergencyId });
    }

    res.status(200).json({
      success: true,
      message: 'Emergency cancelled',
      data: emergency
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/emergency/:emergencyId/resolve
 * Resolve an active emergency
 */
const resolveEmergency = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { emergencyId } = req.params;
    const { resolution } = req.body;

    const emergency = await emergencyService.resolveEmergency(userId, emergencyId, resolution);

    const io = req.app?.get ? req.app.get('io') : null;
    if (io) {
      io.to(`emergency:${emergencyId}`).emit('emergency_resolved', { emergencyId });
      io.to(`user:${userId}`).emit('emergency_resolved', { emergencyId });
    }

    res.status(200).json({
      success: true,
      message: 'Emergency resolved',
      data: emergency
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/emergency/:emergencyId/location
 * Update initial location for an active emergency event
 */
const updateInitialLocation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { emergencyId } = req.params;
    const { location } = req.body;

    const emergency = await emergencyService.updateInitialLocation(userId, emergencyId, location);

    res.status(200).json({
      success: true,
      message: 'Initial location updated',
      data: emergency
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/emergency/:emergencyId/update
 * Record 60-second periodic emergency update & dispatch Trusted Circle notifications
 */
const recordPeriodicUpdate = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { emergencyId } = req.params;
    const { sequenceNumber, location, evidenceSegment, evidenceStatus } = req.body;

    const emergency = await emergencyService.recordPeriodicUpdate(userId, emergencyId, {
      sequenceNumber,
      location,
      evidenceSegment,
      evidenceStatus
    });

    res.status(200).json({
      success: true,
      message: `Periodic emergency update #${sequenceNumber || 1} processed`,
      data: emergency
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  activateSOS,
  getActiveEmergency,
  getEmergencyDetails,
  cancelEmergency,
  resolveEmergency,
  updateInitialLocation,
  recordPeriodicUpdate
};
