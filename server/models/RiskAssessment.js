const mongoose = require('mongoose');

const riskAssessmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  emergencyEvent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmergencyEvent',
    index: true
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  level: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  signals: [
    {
      type: { type: String, required: true },
      points: { type: Number, required: true },
      description: { type: String }
    }
  ],
  source: {
    type: String,
    default: 'rule_engine'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for emergency risk history retrieval per Database.md §8 & §18
riskAssessmentSchema.index({ emergencyEvent: 1, createdAt: -1 });

module.exports = mongoose.model('RiskAssessment', riskAssessmentSchema);
