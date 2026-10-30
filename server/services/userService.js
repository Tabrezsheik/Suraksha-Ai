const User = require('../models/User');

/**
 * userService — SURAKSHA AI
 *
 * User profile business logic (Rules.md §4).
 * Handles profile retrieval and profile update.
 * Ensures security: passwordHash, email, role, and _id cannot be modified via profile edit.
 */

/**
 * Formats a user profile response.
 * @param {Object} user - Mongoose User document
 * @returns {Object} Safe profile data
 */
const formatProfile = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  phone: user.phone || null,
  ageGroup: user.ageGroup || null,
  gender: user.gender || null,
  role: user.role,
  profilePicture: user.profilePicture || null,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

/**
 * Gets the profile of an authenticated user.
 * @param {string} userId - From verified JWT
 * @returns {Object} User profile
 */
const getProfile = async (userId) => {
  const user = await User.findById(userId);

  if (!user || !user.isActive) {
    const err = new Error('User not found');
    err.statusCode = 404;
    err.errorCode = 'USER_NOT_FOUND';
    throw err;
  }

  return formatProfile(user);
};

/**
 * Updates basic profile fields for the authenticated user.
 * Protected fields (email, passwordHash, role, _id) cannot be modified here.
 * @param {string} userId - From verified JWT
 * @param {Object} updateData - Allowed fields: name, phone, ageGroup, gender, profilePicture
 * @returns {Object} Updated user profile
 */
const updateProfile = async (userId, updateData) => {
  const user = await User.findById(userId);

  if (!user || !user.isActive) {
    const err = new Error('User not found');
    err.statusCode = 404;
    err.errorCode = 'USER_NOT_FOUND';
    throw err;
  }

  // Whitelist editable fields
  if (updateData.name !== undefined) {
    user.name = updateData.name.trim();
  }

  if (updateData.phone !== undefined) {
    user.phone = updateData.phone ? updateData.phone.trim() : null;
  }

  if (updateData.ageGroup !== undefined) {
    user.ageGroup = updateData.ageGroup ? updateData.ageGroup.trim() : null;
  }

  if (updateData.gender !== undefined) {
    user.gender = updateData.gender ? updateData.gender.trim() : null;
  }

  if (updateData.profilePicture !== undefined) {
    user.profilePicture = updateData.profilePicture ? updateData.profilePicture.trim() : null;
  }

  await user.save();

  return formatProfile(user);
};

module.exports = {
  getProfile,
  updateProfile,
  formatProfile
};
