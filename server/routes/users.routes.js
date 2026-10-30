const express = require('express');
const { body } = require('express-validator');
const usersController = require('../controllers/users.controller');
const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

/**
 * User Routes — SURAKSHA AI
 * Matches API.md section 6.
 * All user profile routes require authentication.
 */

// Validation for PATCH /api/users/me
const updateProfileValidators = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),

  body('phone')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^\+?[1-9]\d{6,14}$/)
    .withMessage('Please provide a valid phone number'),

  body('ageGroup')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('Age group cannot exceed 50 characters'),

  body('gender')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isIn(['Male', 'Female', 'Other', 'Prefer not to say'])
    .withMessage('Gender must be Male, Female, Other, or Prefer not to say'),

  body('profilePicture')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .custom((value) => {
      if (!value) return true;
      if (value.startsWith('data:image/') || value.startsWith('http://') || value.startsWith('https://')) {
        return true;
      }
      throw new Error('Profile picture must be a valid URL or image Data URL');
    })
];

/**
 * GET /api/users/me
 * Protected — get authenticated user profile
 */
router.get('/me', authMiddleware, usersController.getProfile);

/**
 * PATCH /api/users/me
 * Protected — update authenticated user profile
 */
router.patch(
  '/me',
  authMiddleware,
  updateProfileValidators,
  validateRequest,
  usersController.updateProfile
);

module.exports = router;
