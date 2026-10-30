const userService = require('../services/userService');

/**
 * users.controller — SURAKSHA AI
 *
 * Thin HTTP controller for user profile endpoints (Rules.md §4).
 * Reads validated request data, calls userService, returns standard responses.
 */

/**
 * GET /api/users/me
 * Protected — returns authenticated user's profile
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await userService.getProfile(req.user.id);

    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/users/me
 * Protected — updates basic profile fields
 */
const updateProfile = async (req, res, next) => {
  try {
    const updatedUser = await userService.updateProfile(req.user.id, req.body);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProfile,
  updateProfile
};
