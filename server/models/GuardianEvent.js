const mongoose = require('mongoose');

const guardianEventSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  guardianSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GuardianSession',
    index: true
  },
  emergencyEvent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmergencyEvent',
    index: true
  },
  type: {
    type: String,
    enum: ['route_deviation', 'suspicious_stoppage'],
    required: true
  },
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 15
  },
  status: {
    type: String,
    enum: ['detected', 'check_in', 'safe', 'escalated'],
    default: 'detected',
    index: true
  },
  location: {
    latitude: { type: Number },
    longitude: { type: Number },
    timestamp: { type: Date, default: Date.now }
  },
  detectedAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

guardianEventSchema.index({ user: 1, detectedAt: -1 });

module.exports = mongoose.model('GuardianEvent', guardianEventSchema);
