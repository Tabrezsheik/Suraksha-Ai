/**
 * Risk Controller (Phase 6 — AI Risk Detection)
 *
 * Handles HTTP requests for dynamic risk assessment and risk history retrieval.
 * Enforces server-side authentication, emergency ownership, active emergency state checks,
 * MongoDB RiskAssessment persistence, EmergencyEvent updates, and Socket.IO risk_updated emissions.
 */

const RiskAssessment = require('../models/RiskAssessment');
const EmergencyEvent = require('../models/EmergencyEvent');
const aiService = require('../services/aiService');

/**
 * POST /api/risk/assess
 */
const assessRisk = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { emergencyId, signals = [], triggerType = 'manual' } = req.body;

    let targetEmergency = null;

    if (emergencyId) {
      targetEmergency = await EmergencyEvent.findById(emergencyId);
      if (!targetEmergency) {
        return res.status(404).json({
          success: false,
          message: 'Emergency event not found',
          error: { code: 'EMERGENCY_NOT_FOUND' }
        });
      }

      // Security Guard 1: Ownership check
      if (targetEmergency.user.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only assess risk for your own emergency',
          error: { code: 'FORBIDDEN' }
        });
      }

      // Security Guard 2: Active status check
      if (targetEmergency.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: `Cannot assess risk for an emergency that is ${targetEmergency.status}`,
          error: { code: 'EMERGENCY_NOT_ACTIVE' }
        });
      }
    }

    // Call internal AI service (with automatic fallback to local rule engine)
    const assessmentResult = await aiService.assessRisk(signals, triggerType, emergencyId);

    // Save RiskAssessment record in MongoDB
    const assessmentDoc = new RiskAssessment({
      user: userId,
      emergencyEvent: emergencyId || null,
      score: assessmentResult.score,
      level: assessmentResult.level,
      signals: assessmentResult.signals || [],
      source: assessmentResult.source || 'rule_engine'
    });

    await assessmentDoc.save();

    // If linked to an active emergency, update EmergencyEvent current score/level and timeline
    if (targetEmergency) {
      const now = new Date();
      targetEmergency.currentRiskScore = assessmentResult.score;
      targetEmergency.riskLevel = assessmentResult.level;
      targetEmergency.timeline.push({
        type: 'risk_update',
        message: `Risk assessment updated: ${assessmentResult.score} (${assessmentResult.level.toUpperCase()})`,
        timestamp: now
      });

      await targetEmergency.save();

      // Emit Socket.IO risk_updated event strictly matching API.md §18.2 payload { emergencyId, score, level }
      const io = req.app.get('io');
      if (io) {
        io.to(`emergency:${emergencyId}`).emit('risk_updated', {
          emergencyId,
          score: assessmentResult.score,
          level: assessmentResult.level
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Risk assessment completed',
      data: {
        id: assessmentDoc._id.toString(),
        emergencyId: emergencyId || null,
        score: assessmentResult.score,
        level: assessmentResult.level,
        signals: assessmentResult.signals,
        source: assessmentDoc.source,
        createdAt: assessmentDoc.createdAt
      }
    });

  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/risk/:emergencyId
 */
const getRiskHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { emergencyId } = req.params;

    const emergency = await EmergencyEvent.findById(emergencyId);
    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: 'Emergency event not found',
        error: { code: 'EMERGENCY_NOT_FOUND' }
      });
    }

    if (emergency.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this emergency risk history',
        error: { code: 'FORBIDDEN' }
      });
    }

    const history = await RiskAssessment.find({ emergencyEvent: emergencyId })
      .sort({ createdAt: -1 });

    const formattedHistory = history.map(item => ({
      id: item._id.toString(),
      score: item.score,
      level: item.level,
      signals: item.signals,
      source: item.source,
      createdAt: item.createdAt
    }));

    return res.status(200).json({
      success: true,
      data: formattedHistory
    });

  } catch (err) {
    next(err);
  }
};

module.exports = {
  assessRisk,
  getRiskHistory
};
