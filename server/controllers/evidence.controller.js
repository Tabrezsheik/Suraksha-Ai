const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const evidenceService = require('../services/evidenceService');
const EvidenceMetadata = require('../models/EvidenceMetadata');

exports.uploadEvidence = async (req, res) => {
  try {
    const { emergencyId, audioData, mimeType, durationSeconds } = req.body;

    if (!emergencyId) {
      return res.status(422).json({
        success: false,
        message: 'Validation Error: emergencyId is required'
      });
    }

    if (!audioData) {
      return res.status(422).json({
        success: false,
        message: 'Validation Error: audioData is required'
      });
    }

    const evidence = await evidenceService.saveAudioEvidence({
      userId: req.user._id,
      emergencyId,
      audioBuffer: audioData,
      mimeType: mimeType || 'audio/webm',
      durationSeconds: durationSeconds || 5
    });

    return res.status(201).json({
      success: true,
      message: 'Emergency audio evidence recorded successfully',
      data: evidence
    });
  } catch (error) {
    console.error('[EvidenceController] Upload error:', error);
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to upload emergency evidence'
    });
  }
};

exports.getEmergencyEvidence = async (req, res) => {
  try {
    const { emergencyId } = req.params;
    const evidenceList = await evidenceService.getEmergencyEvidence(req.user._id, emergencyId);
    return res.status(200).json({
      success: true,
      data: evidenceList
    });
  } catch (error) {
    console.error('[EvidenceController] Get evidence error:', error);
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to retrieve evidence metadata'
    });
  }
};

/**
 * Secure, authorized token-based audio evidence access (for Trusted Circle email links)
 * Validates signed 24h expiration token without exposing raw file paths or unauthenticated URLs.
 */
exports.getSecureEvidenceByToken = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied: Token is required'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'suraksha_secret_fallback');
    } catch (jwtErr) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Token is invalid or expired'
      });
    }

    if (!decoded || decoded.type !== 'evidence_access' || !decoded.evidenceId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Invalid token purpose'
      });
    }

    const evidence = await EvidenceMetadata.findById(decoded.evidenceId);
    if (!evidence) {
      return res.status(404).json({
        success: false,
        message: 'Evidence record not found'
      });
    }

    if (!evidence.filePath || !fs.existsSync(evidence.filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Evidence file not found on server storage'
      });
    }

    res.setHeader('Content-Type', evidence.mimeType || 'audio/webm');
    res.setHeader('Content-Disposition', `inline; filename="${evidence.fileName || 'evidence.webm'}"`);
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

    const stream = fs.createReadStream(evidence.filePath);
    stream.on('error', (streamErr) => {
      console.error('[EvidenceController] File stream error:', streamErr);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Failed to stream evidence file' });
      }
    });
    return stream.pipe(res);
  } catch (error) {
    console.error('[EvidenceController] Secure token evidence access error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process evidence request'
    });
  }
};
