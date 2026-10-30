const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

/**
 * Auth Routes — SURAKSHA AI
 *
 * All routes match API.md section 5.
 * Public routes: register, login
 * Protected routes: /me, /logout (require valid JWT via authMiddleware)
 *
 * Validation rules use express-validator (Rules.md §6).
 * validateRequest middleware handles result and returns 422 on failure.
 */

// Registration validators
const registerValidators = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number'),

  body('phone')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^\+?[1-9]\d{6,14}$/)
    .withMessage('Please provide a valid phone number')
];

// Login validators
const loginValidators = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

/**
 * POST /api/auth/register
 * Public — create a new user account
 */
router.post(
  '/register',
  registerValidators,
  validateRequest,
  authController.register
);

/**
 * POST /api/auth/login
 * Public — authenticate and receive JWT
 */
router.post(
  '/login',
  loginValidators,
  validateRequest,
  authController.login
);

/**
 * GET /api/auth/me
 * Protected — returns the authenticated user's profile
 * Identity derived from verified JWT (never client-supplied)
 */
router.get(
  '/me',
  authMiddleware,
  authController.getMe
);

/**
 * POST /api/auth/logout
 * Protected — confirms token validity, signals logout intent
 * Client is responsible for discarding the token (stateless MVP logout)
 */
router.post(
  '/logout',
  authMiddleware,
  authController.logout
);

module.exports = router;
