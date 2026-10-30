const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const assistantController = require('../controllers/assistant.controller');
const authMiddleware = require('../middleware/authMiddleware');
const { optionalAuth } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

// Chat endpoint (optional authentication so guests and users can chat)
router.post(
  '/chat',
  optionalAuth,
  [
    body('message')
      .trim()
      .notEmpty()
      .withMessage('message is required and cannot be empty')
      .isLength({ max: 4000 })
      .withMessage('message cannot exceed 4000 characters'),
    body('conversationId')
      .optional()
      .isUUID()
      .withMessage('conversationId must be a valid UUID')
  ],
  validateRequest,
  assistantController.chat
);

// Conversation management (user-authenticated)
router.get(
  '/conversations',
  optionalAuth,
  assistantController.listConversations
);

router.get(
  '/conversations/:id',
  optionalAuth,
  [
    param('id').isUUID().withMessage('Valid conversation UUID is required')
  ],
  validateRequest,
  assistantController.getConversationMessages
);

router.delete(
  '/conversations/:id',
  optionalAuth,
  [
    param('id').isUUID().withMessage('Valid conversation UUID is required')
  ],
  validateRequest,
  assistantController.deleteConversation
);

// Verified Legal Case Studies
router.get(
  '/case-studies',
  optionalAuth,
  assistantController.getCaseStudies
);

// Study progress tracking
router.get(
  '/study-progress',
  optionalAuth,
  assistantController.getStudyProgress
);

// Quiz submission
router.post(
  '/quiz/submit',
  optionalAuth,
  [
    body('actIdentifier').trim().notEmpty().withMessage('actIdentifier is required'),
    body('sectionNumber').trim().notEmpty().withMessage('sectionNumber is required'),
    body('questionText').trim().notEmpty().withMessage('questionText is required'),
    body('selectedOption').trim().notEmpty().withMessage('selectedOption is required'),
    body('correctOption').trim().notEmpty().withMessage('correctOption is required')
  ],
  validateRequest,
  assistantController.submitQuiz
);

// Existing Phase 9 Case Explorer endpoints (preserved)
router.get('/case-explorer/taxonomy', optionalAuth, assistantController.getTaxonomy);
router.get('/case-explorer/cases', optionalAuth, assistantController.getExplorerCases);

module.exports = router;
