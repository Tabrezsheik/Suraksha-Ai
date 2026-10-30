const notificationService = require('../services/notificationService');
const smsService = require('../services/smsService');
const emailProviderService = require('../services/emailProviderService');
const selfNotificationService = require('../services/selfNotificationService');
const Notification = require('../models/Notification');
const TrustedContact = require('../models/TrustedContact');

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await notificationService.getUserNotifications(req.user._id);
    return res.status(200).json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('[NotificationController] Get error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notifications'
    });
  }
};

exports.markRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await notificationService.markAsRead(req.user._id, id);
    return res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('[NotificationController] Mark read error:', error);
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to update notification status'
    });
  }
};

exports.registerFcmToken = async (req, res) => {
  try {
    const { contactId, fcmToken } = req.body;
    if (!fcmToken) {
      return res.status(422).json({
        success: false,
        message: 'Validation Error: fcmToken is required'
      });
    }

    if (contactId) {
      const contact = await TrustedContact.findOne({ _id: contactId, user: req.user._id });
      if (!contact) {
        return res.status(440).json({
          success: false,
          message: 'Contact not found'
        });
      }
      contact.fcmToken = fcmToken;
      await contact.save();
      return res.status(200).json({
        success: true,
        message: 'FCM token registered to contact successfully',
        data: contact
      });
    }

    return res.status(200).json({
      success: true,
      message: 'FCM token registered successfully'
    });
  } catch (error) {
    console.error('[NotificationController] Register FCM error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to register FCM token'
    });
  }
};

exports.updateSmsStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, deliveryStatus, smsMessageId, errorCode, errorMessage } = req.body;
    const notification = await notificationService.updateSmsStatus(req.user._id, id, {
      status,
      deliveryStatus,
      smsMessageId,
      errorCode,
      errorMessage
    });
    return res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('[NotificationController] Update SMS status error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update SMS status'
    });
  }
};

/**
 * Webhook handler for SMS delivery status callbacks.
 * Validates webhook signature when supported, updates Notification delivery state,
 * and strictly prevents loop triggers (never creates new emergencies or alerts).
 */
exports.smsDeliveryCallback = async (req, res) => {
  try {
    const signature = req.headers['x-provider-signature'] || req.headers['x-twilio-signature'] || '';
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const fullUrl = `${protocol}://${host}${req.originalUrl}`;

    // Validate webhook signature if provider adapter is configured
    if (signature && smsService.isConfigured()) {
      const isValid = smsService.validateSignature(signature, fullUrl, req.body);
      if (!isValid) {
        return res.status(403).json({
          success: false,
          message: 'Invalid Webhook Signature'
        });
      }
    }

    const messageId = req.body.MessageSid || req.body.messageId || req.body.sid || req.body.id;
    const messageStatus = req.body.MessageStatus || req.body.status || req.body.deliveryStatus;
    const errorCode = req.body.ErrorCode || req.body.errorCode;
    const errorMessage = req.body.ErrorMessage || req.body.errorMessage;

    if (!messageId) {
      return res.status(400).json({
        success: false,
        message: 'Message identifier (MessageSid/messageId) is required'
      });
    }

    const notif = await Notification.findOne({ smsMessageId: messageId });
    if (!notif) {
      // Return 200 so external provider stops retrying unknown or test SIDs
      return res.status(200).json({
        success: true,
        message: 'Notification with Message identifier not found, acknowledged.'
      });
    }

    // Map provider message status to Suraksha delivery states
    const statusLower = (messageStatus || '').toLowerCase();
    if (statusLower === 'delivered' || statusLower === 'success') {
      notif.status = 'DELIVERED';
      notif.deliveryStatus = 'DELIVERED';
    } else if (statusLower === 'undelivered') {
      notif.status = 'UNDELIVERED';
      notif.deliveryStatus = 'UNDELIVERED';
    } else if (statusLower === 'failed' || statusLower === 'rejected') {
      notif.status = 'FAILED';
      notif.deliveryStatus = 'FAILED';
    } else if (statusLower === 'sent' || statusLower === 'queued' || statusLower === 'sending') {
      notif.status = 'SENT';
      notif.deliveryStatus = 'PENDING';
    }

    if (errorCode || errorMessage) {
      notif.providerError = `Provider Error [${errorCode || 'N/A'}]: ${errorMessage || 'None'}`;
    }

    // Loop prevention: Only update the existing record. Do not trigger any notifications.
    await notif.save();

    return res.status(200).json({
      success: true,
      message: 'SMS status updated successfully'
    });
  } catch (error) {
    console.error('[NotificationController] SMS delivery callback error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal error processing SMS callback'
    });
  }
};
// Backward compatibility alias
exports.twilioSmsCallback = exports.smsDeliveryCallback;

/**
 * Webhook handler for Email API delivery status callbacks.
 * Updates Notification delivery state and prevents loop triggers.
 */
exports.emailDeliveryCallback = async (req, res) => {
  try {
    const payload = req.body || {};
    const operationId = payload.id || payload.operationId || payload.sid || payload.messageId;

    if (!operationId) {
      return res.status(400).json({
        success: false,
        message: 'Operation ID is required'
      });
    }

    const notif = await Notification.findOne({ emailOperationId: operationId });
    if (!notif) {
      return res.status(200).json({
        success: true,
        message: 'Notification with operationId not found, acknowledged.'
      });
    }

    const rawStatus = (payload.status || '').toUpperCase();
    if (rawStatus === 'DELIVERED' || rawStatus === 'SUCCEEDED' || rawStatus === 'COMPLETED') {
      notif.status = 'DELIVERED';
      notif.deliveryStatus = 'DELIVERED';
    } else if (rawStatus === 'FAILED' || rawStatus === 'BOUNCED') {
      notif.status = 'FAILED';
      notif.deliveryStatus = 'FAILED';
    } else if (rawStatus === 'UNDELIVERED') {
      notif.status = 'UNDELIVERED';
      notif.deliveryStatus = 'UNDELIVERED';
    } else if (rawStatus === 'SENT' || rawStatus === 'ACCEPTED' || rawStatus === 'QUEUED') {
      notif.status = 'SENT';
      notif.deliveryStatus = 'PENDING';
    }

    if (payload.errorCode || payload.errorMessage) {
      notif.providerError = `Email Error [${payload.errorCode || 'N/A'}]: ${payload.errorMessage || ''}`;
    }

    // Loop prevention: Only update existing record
    await notif.save();

    return res.status(200).json({
      success: true,
      message: 'Email status updated successfully',
      data: {
        id: notif._id,
        status: notif.status,
        deliveryStatus: notif.deliveryStatus
      }
    });
  } catch (error) {
    console.error('[NotificationController] Email delivery callback error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal error processing Email callback'
    });
  }
};
// Backward compatibility alias
exports.twilioEmailCallback = exports.emailDeliveryCallback;

/**
 * Retrieve & sync current status for an Email notification.
 */
exports.getEmailStatus = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notif = await Notification.findOne({ _id: notificationId, user: req.user._id });

    if (!notif) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    if (!notif.emailOperationId && !notif.emailOperationLocation && !notif.operationLocation) {
      return res.status(200).json({
        success: true,
        data: notif
      });
    }

    const opLocation = notif.emailOperationLocation || notif.operationLocation || null;
    const statusRes = await emailProviderService.getEmailStatus(notif.emailOperationId, opLocation);
    if (statusRes && statusRes.success) {
      if (statusRes.status) notif.status = statusRes.status;
      if (statusRes.deliveryStatus) notif.deliveryStatus = statusRes.deliveryStatus;
      if (statusRes.operationLocation && !notif.emailOperationLocation) {
        notif.emailOperationLocation = statusRes.operationLocation;
        notif.operationLocation = statusRes.operationLocation;
      }
      await notif.save();
    }

    return res.status(200).json({
      success: true,
      data: notif
    });
  } catch (error) {
    console.error('[NotificationController] Get Email status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve Email status'
    });
  }
};
// Backward compatibility alias
exports.getTwilioEmailStatus = exports.getEmailStatus;

/**
 * Gated Live Test Endpoint for Self-Notifications.
 */
exports.liveTestSelfAlert = async (req, res) => {
  try {
    const { channel = 'all', confirmLiveSend } = req.body;
    const result = await selfNotificationService.sendGatedLiveTest({
      channel,
      confirmLiveSend,
      user: req.user
    });

    if (result.rejected) {
      return res.status(result.statusCode || 403).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('[NotificationController] Live test error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to execute live test'
    });
  }
};
