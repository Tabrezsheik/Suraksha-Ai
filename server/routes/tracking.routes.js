/**
 * Tracking Routes (Phase 5 — Live GPS & Real-Time Emergency Dashboard)
 *
 * REST route declarations for live location updates and emergency location history.
 */

const express = require('express');
const { body, param } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const trackingController = require('../controllers/tracking.controller');

const router = express.Router();

// All tracking routes require JWT authentication
router.use(authMiddleware);

/**
 * @route   POST /api/tracking/location
 * @desc    Submit continuous live location update
 * @access  Private
 */
router.post(
  '/location',
  [
    body('emergencyId')
      .optional({ nullable: true })
      .isMongoId()
      .withMessage('Invalid emergency ID format'),
    body('latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude is required and must be between -90 and 90'),
    body('longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude is required and must be between -180 and 180'),
    body('accuracy')
      .optional({ nullable: true })
      .isNumeric()
      .withMessage('Accuracy must be a number'),
    body('speed')
      .optional({ nullable: true })
      .isNumeric()
      .withMessage('Speed must be a number'),
    body('heading')
      .optional({ nullable: true })
      .isNumeric()
      .withMessage('Heading must be a number'),
    body('source')
      .optional()
      .isIn(['emergency', 'guardian'])
      .withMessage('Source must be emergency or guardian'),
    validateRequest
  ],
  trackingController.recordLocation
);

/**
 * @route   GET /api/tracking/:emergencyId
 * @desc    Get location tracking history for an emergency
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
  trackingController.getLocationHistory
);

module.exports = router;
