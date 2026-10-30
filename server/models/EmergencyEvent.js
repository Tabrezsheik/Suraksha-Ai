const mongoose = require('mongoose');

const emergencyEventSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  triggerType: {
    type: String,
    enum: ['manual', 'voice', 'guardian'],
    default: 'manual'
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'resolved'],
    default: 'active',
    index: true
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date
  },
  initialRiskScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 30
  },
  currentRiskScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 30
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low',
    index: true
  },
  currentLocation: {
    latitude: { type: Number },
    longitude: { type: Number },
    accuracy: { type: Number },
    timestamp: { type: Date }
  },
  trustedContactsNotified: {
    type: Boolean,
    default: false
  },
  smsAttemptsCount: {
    type: Number,
    default: 0
  },
  emailAttemptsCount: {
    type: Number,
    default: 0
  },
  evidenceIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Evidence'
  }],
  timeline: [{
    type: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Compound indexes for query optimization matching Database.md
emergencyEventSchema.index({ user: 1, startedAt: -1 });
emergencyEventSchema.index({ status: 1, startedAt: -1 });

module.exports = mongoose.model('EmergencyEvent', emergencyEventSchema);
