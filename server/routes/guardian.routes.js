const express = require('express');
const { body, param } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const guardianController = require('../controllers/guardian.controller');

const router = express.Router();

/**
 * POST /api/guardian/start
 */
router.post(
  '/start',
  authMiddleware,
  [
    body('destination')
      .isObject()
      .withMessage('destination must be an object'),
    body('destination.latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('destination.latitude must be a valid float between -90 and 90'),
    body('destination.longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('destination.longitude must be a valid float between -180 and 180'),
    body('destination.name')
      .optional()
      .isString()
      .trim(),
    body('prolongedStopThresholdSeconds')
      .optional()
      .isInt()
      .isIn([60, 120, 300, 600, 900])
      .withMessage('prolongedStopThresholdSeconds must be one of [60, 120, 300, 600, 900]')
  ],
  validateRequest,
  guardianController.startGuardian
);

/**
 * GET /api/guardian/active
 */
router.get(
  '/active',
  authMiddleware,
  guardianController.getActiveSession
);

/**
 * PATCH /api/guardian/:sessionId/stop
 */
router.patch(
  '/:sessionId/stop',
  authMiddleware,
  [
    param('sessionId')
      .isMongoId()
      .withMessage('Invalid sessionId parameter')
  ],
  validateRequest,
  guardianController.stopGuardian
);

/**
 * POST /api/guardian/:sessionId/location
 */
router.post(
  '/:sessionId/location',
  authMiddleware,
  [
    param('sessionId')
      .isMongoId()
      .withMessage('Invalid sessionId parameter'),
    body('latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('latitude must be between -90 and 90'),
    body('longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('longitude must be between -180 and 180'),
    body('accuracy')
      .optional()
      .isFloat({ min: 0 }),
    body('speed')
      .optional()
      .isFloat({ min: 0 })
  ],
  validateRequest,
  guardianController.recordLocation
);

/**
 * POST /api/guardian/:eventId/check-in
 */
router.post(
  '/:eventId/check-in',
  authMiddleware,
  [
    param('eventId')
      .isMongoId()
      .withMessage('Invalid eventId parameter'),
    body('status')
      .isIn(['safe', 'get_help'])
      .withMessage("status must be 'safe' or 'get_help'")
  ],
  validateRequest,
  guardianController.processCheckIn
);

module.exports = router;
