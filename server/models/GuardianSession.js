const mongoose = require('mongoose');

const guardianSessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  destination: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    name: { type: String, default: 'Selected Destination' }
  },
  origin: {
    latitude: { type: Number },
    longitude: { type: Number },
    name: { type: String, default: 'Starting Location' }
  },
  selectedRoute: {
    routeId: { type: String },
    name: { type: String },
    distanceMeters: { type: Number },
    durationSeconds: { type: Number },
    riskScore: { type: Number },
    riskLevel: { type: String },
    geometry: { type: mongoose.Schema.Types.Mixed }
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'stopped', 'escalated'],
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
  lastLocation: {
    latitude: { type: Number },
    longitude: { type: Number },
    recordedAt: { type: Date }
  },
  prolongedStopThresholdSeconds: {
    type: Number,
    default: 120
  },
  stationarySince: {
    type: Date
  },
  lastProlongedStopAlertAt: {
    type: Date
  }
}, {
  timestamps: true
});

guardianSessionSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('GuardianSession', guardianSessionSchema);
