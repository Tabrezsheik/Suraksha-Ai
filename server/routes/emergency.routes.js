/**
 * Emergency Routes (Phase 4 — Silent SOS & Emergency Core)
 *
 * REST route declarations for emergency activation, active state lookup, cancel, and resolve.
 */

const express = require('express');
const { body, param } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const emergencyController = require('../controllers/emergency.controller');

const router = express.Router();

// Apply auth middleware to all emergency routes
router.use(authMiddleware);

/**
 * @route   POST /api/emergency
 * @desc    Activate Silent SOS & create EmergencyEvent
 * @access  Private
 */
router.post(
  '/',
  [
    body('triggerType')
      .optional({ nullable: true })
      .isIn(['manual', 'voice', 'guardian'])
      .withMessage('triggerType must be manual, voice, or guardian'),
    body('location')
      .optional({ nullable: true })
      .isObject()
      .withMessage('location must be an object'),
    body('location.latitude')
      .optional({ nullable: true })
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude must be between -90 and 90'),
    body('location.longitude')
      .optional({ nullable: true })
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude must be between -180 and 180'),
    body('location.accuracy')
      .optional({ nullable: true })
      .isNumeric()
      .withMessage('Accuracy must be a number'),
    validateRequest
  ],
  emergencyController.activateSOS
);

/**
 * @route   GET /api/emergency/active
 * @desc    Get user's current active emergency (or null)
 * @access  Private
 */
router.get(
  '/active',
  emergencyController.getActiveEmergency
);

/**
 * @route   GET /api/emergency/:emergencyId
 * @desc    Get emergency details by ID
 * @access  Private
 */
router.get(
  '/:emergencyId',
  [
    param('emergencyId')
      .isMongoId()
      .withMessage('Invalid emergency ID format'),
    validateRequest
  ],
  emergencyController.getEmergencyDetails
);

/**
 * @route   PATCH /api/emergency/:emergencyId/cancel
 * @desc    Cancel active emergency
 * @access  Private
 */
router.patch(
  '/:emergencyId/cancel',
  [
    param('emergencyId')
      .isMongoId()
      .withMessage('Invalid emergency ID format'),
    validateRequest
  ],
  emergencyController.cancelEmergency
);

/**
 * @route   PATCH /api/emergency/:emergencyId/resolve
 * @desc    Resolve active emergency
 * @access  Private
 */
router.patch(
  '/:emergencyId/resolve',
  [
    param('emergencyId')
      .isMongoId()
      .withMessage('Invalid emergency ID format'),
    body('resolution')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Resolution note must be a string up to 500 characters'),
    validateRequest
  ],
  emergencyController.resolveEmergency
);

/**
 * @route   PATCH /api/emergency/:emergencyId/location
 * @desc    Update initial location of an active emergency asynchronously
 * @access  Private
 */
router.patch(
  '/:emergencyId/location',
  [
    param('emergencyId')
      .isMongoId()
      .withMessage('Invalid emergency ID format'),
    body('location')
      .isObject()
      .withMessage('location must be an object'),
    body('location.latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude must be between -90 and 90'),
    body('location.longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude must be between -180 and 180'),
    body('location.accuracy')
      .optional({ nullable: true })
      .isNumeric()
      .withMessage('Accuracy must be a number'),
    validateRequest
  ],
  emergencyController.updateInitialLocation
);

/**
 * @route   POST /api/emergency/:emergencyId/update
 * @desc    Record 60-second periodic emergency update & dispatch Trusted Circle notifications
 * @access  Private
 */
router.post(
  '/:emergencyId/update',
  [
    param('emergencyId')
      .isMongoId()
      .withMessage('Invalid emergency ID format'),
    body('sequenceNumber')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('sequenceNumber must be an integer >= 1'),
    validateRequest
  ],
  emergencyController.recordPeriodicUpdate
);

module.exports = router;
