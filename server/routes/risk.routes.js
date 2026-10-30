const express = require('express');
const { body, param } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const riskController = require('../controllers/risk.controller');

const router = express.Router();

const ALLOWED_SIGNALS = [
  'distress_keyword',
  'voice_stress',
  'high_risk_location',
  'route_deviation',
  'suspicious_stoppage'
];

/**
 * POST /api/risk/assess
 * Evaluates dynamic risk signals, persists RiskAssessment, updates EmergencyEvent, emits Socket.IO risk_updated.
 */
router.post(
  '/assess',
  authMiddleware,
  [
    body('emergencyId')
      .optional()
      .isMongoId()
      .withMessage('emergencyId must be a valid MongoId'),
    body('signals')
      .optional()
      .isArray()
      .withMessage('signals must be an array'),
    body('signals.*.type')
      .optional()
      .isString()
      .trim()
      .toLowerCase()
      .isIn(ALLOWED_SIGNALS)
      .withMessage(`Signal type must be one of: ${ALLOWED_SIGNALS.join(', ')}`),
    body('signals.*.value')
      .optional()
      .isBoolean()
      .withMessage('Signal value must be a boolean'),
    body('triggerType')
      .optional()
      .isIn(['manual', 'voice', 'guardian'])
      .withMessage('triggerType must be manual, voice, or guardian')
  ],
  validateRequest,
  riskController.assessRisk
);

/**
 * GET /api/risk/:emergencyId
 * Fetches risk assessment history for an authorized emergency.
 */
router.get(
  '/:emergencyId',
  authMiddleware,
  [
    param('emergencyId')
      .isMongoId()
      .withMessage('Invalid emergencyId parameter')
  ],
  validateRequest,
  riskController.getRiskHistory
);

module.exports = router;
