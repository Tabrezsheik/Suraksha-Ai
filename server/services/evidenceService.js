const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const EvidenceMetadata = require('../models/EvidenceMetadata');
const EmergencyEvent = require('../models/EmergencyEvent');

const UPLOADS_DIR = path.join(__dirname, '../uploads/evidence');

// Ensure upload directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const getObjectIdString = (val) => {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (val._id) return val._id.toString();
  if (typeof val.toString === 'function') return val.toString();
  return String(val);
};

class EvidenceService {
  async saveAudioEvidence({ userId, emergencyId, audioBuffer, mimeType = 'audio/webm', durationSeconds = 0, originalName }) {
    // 1. Verify Emergency Event exists and belongs to requesting user
    const emergency = await EmergencyEvent.findById(emergencyId);
    if (!emergency) {
      const err = new Error('Emergency event not found');
      err.statusCode = 404;
      throw err;
    }

    const emergencyOwnerId = getObjectIdString(emergency.user);
    const requestingUserId = getObjectIdString(userId);

    if (!emergencyOwnerId || !requestingUserId || emergencyOwnerId !== requestingUserId) {
      const err = new Error('Access denied: You do not own this emergency event');
      err.statusCode = 403;
      throw err;
    }

    // 2. Generate unique filename and write buffer to protected local uploads directory
    const safeMime = (typeof mimeType === 'string' && mimeType) ? mimeType : 'audio/webm';
    const fileExt = safeMime.includes('mp3') ? 'mp3' : safeMime.includes('wav') ? 'wav' : 'webm';
    const fileName = `ev_${emergencyId}_${Date.now()}.${fileExt}`;
    const filePath = path.join(UPLOADS_DIR, fileName);

    let bufferToSave = audioBuffer;
    if (!Buffer.isBuffer(audioBuffer)) {
      if (typeof audioBuffer === 'string' && audioBuffer.startsWith('data:')) {
        const base64Data = audioBuffer.split(',')[1];
        bufferToSave = Buffer.from(base64Data, 'base64');
      } else if (typeof audioBuffer === 'string') {
        bufferToSave = Buffer.from(audioBuffer, 'base64');
      } else {
        bufferToSave = Buffer.from([]);
      }
    }

    fs.writeFileSync(filePath, bufferToSave);

    // 3. Calculate SHA-256 checksum & file size
    const checksum = crypto.createHash('sha256').update(bufferToSave).digest('hex');
    const fileSize = bufferToSave.length;

    // 4. Create EvidenceMetadata document
    const evidence = await EvidenceMetadata.create({
      user: userId,
      emergencyEvent: emergencyId,
      evidenceType: 'audio',
      fileName,
      filePath,
      fileSizeBytes: fileSize,
      mimeType,
      durationSeconds: Math.round(durationSeconds) || 5,
      sha256Checksum: checksum,
      provenanceClass: 'USER_RECORDED',
      isProtected: true
    });

    // 5. Append timeline entry to EmergencyEvent
    emergency.timeline.push({
      type: 'evidence',
      message: `Emergency audio evidence captured (${evidence.durationSeconds}s)`,
      timestamp: new Date()
    });
    await emergency.save();

    return evidence;
  }

  async getEmergencyEvidence(userId, emergencyId) {
    const emergency = await EmergencyEvent.findById(emergencyId);
    if (!emergency) {
      const err = new Error('Emergency event not found');
      err.statusCode = 404;
      throw err;
    }

    const emergencyOwnerId = getObjectIdString(emergency.user);
    const requestingUserId = getObjectIdString(userId);

    if (!emergencyOwnerId || !requestingUserId || emergencyOwnerId !== requestingUserId) {
      const err = new Error('Access denied: You do not own this emergency event');
      err.statusCode = 403;
      throw err;
    }

    return await EvidenceMetadata.find({ emergencyEvent: emergencyId }).sort({ createdAt: -1 });
  }
}

module.exports = new EvidenceService();
