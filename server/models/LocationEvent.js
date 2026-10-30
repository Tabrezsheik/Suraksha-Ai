/**
 * LocationEvent Model (Phase 5 — Live GPS & Real-Time Emergency Dashboard)
 *
 * Stores location updates recorded during active emergency sessions.
 */

const mongoose = require('mongoose');

const locationEventSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    emergencyEvent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyEvent',
      index: true
    },
    latitude: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90']
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180']
    },
    accuracy: {
      type: Number,
      default: null
    },
    speed: {
      type: Number,
      default: null
    },
    heading: {
      type: Number,
      default: null
    },
    source: {
      type: String,
      enum: ['guardian', 'emergency'],
      default: 'emergency'
    },
    recordedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes matching Database.md §7
locationEventSchema.index({ user: 1, recordedAt: -1 });
locationEventSchema.index({ emergencyEvent: 1, recordedAt: -1 });

module.exports = mongoose.model('LocationEvent', locationEventSchema);
