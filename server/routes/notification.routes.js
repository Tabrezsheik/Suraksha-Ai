const express = require('express');
const router = express.Router();
const { param, body } = require('express-validator');
const notificationController = require('../controllers/notification.controller');
const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

router.get(
  '/',
  authMiddleware,
  notificationController.getNotifications
);

router.patch(
  '/:id/read',
  authMiddleware,
  [
    param('id').isMongoId().withMessage('id must be a valid MongoId')
  ],
  validateRequest,
  notificationController.markRead
);

router.post(
  '/fcm-token',
  authMiddleware,
  [
    body('fcmToken').notEmpty().withMessage('fcmToken is required')
  ],
  validateRequest,
  notificationController.registerFcmToken
);

router.patch(
  '/:id/sms-status',
  authMiddleware,
  [
    param('id').isMongoId().withMessage('id must be a valid MongoId')
  ],
  validateRequest,
  notificationController.updateSmsStatus
);

// Generic SMS delivery status webhook callback
router.post(
  '/sms/callback',
  notificationController.smsDeliveryCallback
);

// Generic Email delivery status webhook callback
router.post(
  '/email/callback',
  notificationController.emailDeliveryCallback
);

// Generic Email operation status retrieve & sync
router.get(
  '/email/status/:notificationId',
  authMiddleware,
  [
    param('notificationId').isMongoId().withMessage('notificationId must be a valid MongoId')
  ],
  validateRequest,
  notificationController.getEmailStatus
);

// Backward-compatible routes for existing webhooks
router.post(
  '/twilio-sms/callback',
  notificationController.smsDeliveryCallback
);

router.post(
  '/twilio-email/callback',
  notificationController.emailDeliveryCallback
);

router.get(
  '/twilio-email/status/:notificationId',
  authMiddleware,
  [
    param('notificationId').isMongoId().withMessage('notificationId must be a valid MongoId')
  ],
  validateRequest,
  notificationController.getEmailStatus
);

// Gated Live Test Endpoint for Account Owner Self-Alerts
router.post(
  '/self-alert/live-test',
  authMiddleware,
  [
    body('confirmLiveSend').isBoolean().withMessage('confirmLiveSend boolean is required')
  ],
  validateRequest,
  notificationController.liveTestSelfAlert
);

module.exports = router;
