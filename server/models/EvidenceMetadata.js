const mongoose = require('mongoose');

const evidenceMetadataSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  emergencyEvent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmergencyEvent',
    required: true,
    index: true
  },
  evidenceType: {
    type: String,
    enum: ['audio', 'photo', 'video', 'text_note'],
    default: 'audio'
  },
  fileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSizeBytes: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    default: 'audio/webm'
  },
  durationSeconds: {
    type: Number,
    default: 0
  },
  sha256Checksum: {
    type: String,
    default: null
  },
  provenanceClass: {
    type: String,
    enum: ['REAL_PUBLIC_DATA', 'OFFICIAL_DATA', 'USER_RECORDED', 'TEST_DEMO_DATA'],
    default: 'USER_RECORDED'
  },
  isProtected: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

evidenceMetadataSchema.index({ emergencyEvent: 1, createdAt: -1 });

module.exports = mongoose.model('EvidenceMetadata', evidenceMetadataSchema);
