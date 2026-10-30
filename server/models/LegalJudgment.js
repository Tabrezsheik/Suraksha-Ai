const mongoose = require('mongoose');

const legalJudgmentSchema = new mongoose.Schema({
  court: {
    type: String,
    default: 'High Court of Andhra Pradesh',
    required: true
  },
  courtCode: {
    type: String,
    default: '28~2',
    required: true,
    index: true
  },
  decisionYear: {
    type: Number,
    enum: [2025, 2026],
    required: true,
    index: true
  },
  decisionDate: {
    type: String,
    required: true
  },
  cnr: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  judge: {
    type: String,
    default: 'Bench / Hon’ble High Court of Andhra Pradesh'
  },
  caseIdentifier: {
    type: String,
    required: true
  },
  summary: {
    type: String,
    required: true
  },
  extractedText: {
    type: String,
    required: true
  },
  keywords: [{
    type: String,
    index: true
  }],
  categories: [{
    type: String,
    enum: ['domestic_violence', 'threat_intimidation', 'sexual_violence', 'protection_order', 'police_procedure', 'family_child_safety'],
    index: true
  }],
  act: {
    type: String,
    default: 'Indian Legislation'
  },
  actCode: {
    type: String,
    index: true
  },
  sections: [{
    type: String,
    index: true
  }],
  provenanceClass: {
    type: String,
    enum: ['OFFICIAL_DATA', 'REAL_PUBLIC_DATA', 'TEST_DEMO_DATA'],
    default: 'OFFICIAL_DATA'
  },
  sourceRepository: {
    type: String,
    default: 'vanga/indian-high-court-judgments'
  },
  repositoryUrl: {
    type: String,
    default: 'https://github.com/vanga/indian-high-court-judgments'
  },
  sourceUrl: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

legalJudgmentSchema.index({ courtCode: 1, decisionYear: 1 });
legalJudgmentSchema.index({ categories: 1, decisionYear: -1 });

module.exports = mongoose.model('LegalJudgment', legalJudgmentSchema);
