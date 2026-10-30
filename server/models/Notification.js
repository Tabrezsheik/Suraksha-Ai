const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  trustedContact: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TrustedContact',
    default: null
  },
  emergencyEvent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmergencyEvent',
    default: null,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  notificationType: {
    type: String,
    enum: ['emergency_alert', 'emergency_update', 'guardian_warning', 'system_alert', 'self_alert'],
    default: 'emergency_alert'
  },
  status: {
    type: String,
    enum: ['PENDING', 'SENT', 'ACCEPTED', 'DELIVERED', 'READ', 'FAILED', 'UNDELIVERED', 'UNKNOWN', 'UNAVAILABLE', 'NOT_CONFIGURED', 'SIMULATED'],
    default: 'PENDING'
  },
  channel: {
    type: String,
    enum: ['push', 'sms', 'email'],
    default: 'sms'
  },
  provider: {
    type: String,
    default: 'NONE'
  },
  deliveryStatus: {
    type: String,
    enum: ['DELIVERED', 'FAILED', 'UNKNOWN', 'PENDING', 'ACCEPTED', 'UNDELIVERED'],
    default: 'PENDING'
  },
  smsMessageId: {
    type: String,
    default: null
  },
  emailOperationId: {
    type: String,
    default: null
  },
  emailOperationLocation: {
    type: String,
    default: null
  },
  operationLocation: {
    type: String,
    default: null
  },
  sequence: {
    type: Number,
    default: 1
  },
  recipientPhone: {
    type: String,
    default: null
  },
  recipientEmail: {
    type: String,
    default: null
  },
  providerError: {
    type: String,
    default: null
  },
  fcmMessageId: {
    type: String,
    default: null
  },
  readAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

notificationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
