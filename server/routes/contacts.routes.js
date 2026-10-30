const express = require('express');
const { body, param } = require('express-validator');
const contactsController = require('../controllers/contacts.controller');
const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

/**
 * Trusted Circle Routes — SURAKSHA AI
 * Matches API.md section 7.
 * All contacts routes require authentication.
 */

// Validation for POST /api/contacts
const addContactValidators = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Contact name is required')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),

  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+?[1-9]\d{6,14}$/)
    .withMessage('Please provide a valid phone number'),

  body('email')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('relationship')
    .optional()
    .isIn(['parent', 'friend', 'relative', 'other'])
    .withMessage('Relationship must be one of: parent, friend, relative, other'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

// Validation for PATCH /api/contacts/:contactId
const updateContactValidators = [
  param('contactId')
    .isMongoId()
    .withMessage('Invalid contact ID format'),

  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Contact name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),

  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[1-9]\d{6,14}$/)
    .withMessage('Please provide a valid phone number'),

  body('email')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('relationship')
    .optional()
    .isIn(['parent', 'friend', 'relative', 'other'])
    .withMessage('Relationship must be one of: parent, friend, relative, other'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

// Validation for DELETE /api/contacts/:contactId
const deleteContactValidators = [
  param('contactId')
    .isMongoId()
    .withMessage('Invalid contact ID format')
];

/**
 * GET /api/contacts
 * Protected — list all contacts for authenticated user
 */
router.get('/', authMiddleware, contactsController.getContacts);

/**
 * GET /api/contacts/active
 * Protected — list active contacts ready for emergency notifications
 */
router.get('/active', authMiddleware, contactsController.getActiveContacts);

/**
 * POST /api/contacts
 * Protected — add a new trusted contact
 */
router.post(
  '/',
  authMiddleware,
  addContactValidators,
  validateRequest,
  contactsController.addContact
);

/**
 * PATCH /api/contacts/:contactId
 * Protected — update a trusted contact
 */
router.patch(
  '/:contactId',
  authMiddleware,
  updateContactValidators,
  validateRequest,
  contactsController.updateContact
);

/**
 * DELETE /api/contacts/:contactId
 * Protected — delete a trusted contact
 */
router.delete(
  '/:contactId',
  authMiddleware,
  deleteContactValidators,
  validateRequest,
  contactsController.deleteContact
);

module.exports = router;
