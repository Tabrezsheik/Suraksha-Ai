/**
 * Routes HTTP Router (Phase 8 — AI Safe Route)
 *
 * Exposes API endpoints for route calculation and safety evaluation.
 */

const express = require('express');
const { body } = require('express-validator');
const routesController = require('../controllers/routes.controller');
const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

// Require authentication for all route calculation endpoints
router.use(authMiddleware);

/**
 * POST /api/routes/calculate
 * Calculate safe and fast route options between origin and destination
 */
router.post(
  '/calculate',
  [
    body('origin').isObject().withMessage('origin must be an object'),
    body('origin.latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('origin.latitude must be a valid float between -90 and 90'),
    body('origin.longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('origin.longitude must be a valid float between -180 and 180'),
    body('destination').isObject().withMessage('destination must be an object'),
    body('destination.latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('destination.latitude must be a valid float between -90 and 90'),
    body('destination.longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('destination.longitude must be a valid float between -180 and 180'),
    validateRequest
  ],
  routesController.calculateRoutes
);

module.exports = router;
