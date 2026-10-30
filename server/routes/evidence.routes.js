const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const evidenceController = require('../controllers/evidence.controller');
const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

router.post(
  '/upload',
  authMiddleware,
  [
    body('emergencyId').isMongoId().withMessage('emergencyId must be a valid MongoId'),
    body('audioData').notEmpty().withMessage('audioData is required')
  ],
  validateRequest,
  evidenceController.uploadEvidence
);

router.get(
  '/secure/:token',
  evidenceController.getSecureEvidenceByToken
);

router.get(
  '/:emergencyId',
  authMiddleware,
  [
    param('emergencyId').isMongoId().withMessage('emergencyId must be a valid MongoId')
  ],
  validateRequest,
  evidenceController.getEmergencyEvidence
);

module.exports = router;
