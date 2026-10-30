/**
 * Routes Controller (Phase 8 Final Upgrade — Deep Safety Intelligence)
 *
 * Handles HTTP route calculation endpoints with Travel Context and Traveller Profile support.
 */

const routeService = require('../services/routeService');

/**
 * Calculate AI Safe Route options
 * POST /api/routes/calculate
 */
const calculateRoutes = async (req, res, next) => {
  try {
    const { origin, destination, travelContext, travellerProfile } = req.body;

    if (!origin || typeof origin !== 'object' || !destination || typeof destination !== 'object') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message: 'Both origin and destination objects with latitude and longitude are required'
        }
      });
    }

    const result = await routeService.calculateRoutes(origin, destination, {
      travelContext,
      travellerProfile
    });

    return res.status(200).json({
      success: true,
      message: 'Routes calculated successfully',
      data: result
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code || 'ROUTE_CALCULATION_ERROR',
          message: error.message
        }
      });
    }
    next(error);
  }
};

module.exports = {
  calculateRoutes
};
