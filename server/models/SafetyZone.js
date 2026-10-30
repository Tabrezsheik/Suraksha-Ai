const mongoose = require('mongoose');

const safetyZoneSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  center: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  radiusMeters: {
    type: Number,
    required: true,
    default: 500
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    required: true,
    index: true
  },
  zoneType: {
    type: String,
    enum: [
      'police',
      'hospital',
      'pharmacy',
      'transit',
      'crime_hotspot',
      'recent_evidence',
      'monitored_area',
      'district_context'
    ],
    default: 'monitored_area',
    index: true
  },
  source: {
    type: String,
    default: 'dataset',
    index: true
  },
  incidentDate: {
    type: Date
  },
  publishedDate: {
    type: Date
  },
  sourceDate: {
    type: Date
  },
  retrievedAt: {
    type: Date,
    default: Date.now
  },
  crimeCategory: {
    type: String,
    enum: ['crimes_against_women', 'robbery', 'theft', 'assault', 'stalking', 'general']
  },
  geographicPrecision: {
    type: String,
    enum: ['exact', 'street', 'neighborhood', 'district'],
    default: 'neighborhood'
  },
  confidence: {
    type: String,
    enum: ['HIGH', 'MEDIUM', 'LOW'],
    default: 'MEDIUM'
  },
  coveragePeriod: {
    type: String
  },
  description: {
    type: String
  },
  active: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

safetyZoneSchema.index({ riskLevel: 1, active: 1 });
safetyZoneSchema.index({ zoneType: 1, active: 1 });

module.exports = mongoose.model('SafetyZone', safetyZoneSchema);
