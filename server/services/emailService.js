/**
 * Email Notification Service — SURAKSHA AI
 *
 * Dedicated backend service for emergency email alerts using Nodemailer (SMTP).
 * Delivers location, emergency status, and secure audio evidence access.
 */

const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

class EmailService {
  constructor() {
    this._mockTransporter = null;
  }

  /**
   * Check whether SMTP credentials are fully and validly configured.
   */
  isConfigured() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) return false;
    if (
      host.includes('example.com') ||
      user.includes('your_smtp_') ||
      pass.includes('your_smtp_')
    ) {
      return false;
    }
    return true;
  }

  setMockTransporter(mockTransporter) {
    this._mockTransporter = mockTransporter;
  }

  resetMockTransporter() {
    this._mockTransporter = null;
  }

  getTransporter() {
    if (this._mockTransporter) {
      return this._mockTransporter;
    }

    if (!this.isConfigured()) {
      return null;
    }

    const nodemailer = require('nodemailer');
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  /**
   * Generate a secure, time-limited token for authorized audio evidence access.
   */
  generateSecureToken(evidenceId, emergencyId, userId) {
    const secret = process.env.JWT_SECRET || 'suraksha_secret_fallback';
    return jwt.sign(
      {
        evidenceId: evidenceId ? evidenceId.toString() : null,
        emergencyId: emergencyId ? emergencyId.toString() : null,
        userId: userId ? userId.toString() : null,
        type: 'evidence_access'
      },
      secret,
      { expiresIn: '24h' }
    );
  }

  /**
   * Send emergency email to a trusted contact.
   */
  async sendEmergencyEmail({
    to,
    contactName,
    userName,
    emergencyId,
    status = 'active',
    timestamp = new Date(),
    location = null,
    evidence = null,
    userId = null,
    sequenceNumber = 1
  }) {
    if (!to || typeof to !== 'string' || !to.includes('@')) {
      return {
        success: false,
        status: 'FAILED',
        deliveryStatus: 'FAILED',
        errorCode: 'INVALID_EMAIL',
        errorMessage: 'Invalid recipient email address.'
      };
    }

    if (!this.isConfigured() && !this._mockTransporter) {
      return {
        success: false,
        status: 'FAILED',
        deliveryStatus: 'FAILED',
        reason: 'EMAIL_NOTIFICATION_UNAVAILABLE',
        errorMessage: 'SMTP email credentials not configured in environment.'
      };
    }

    try {
      const transporter = this.getTransporter();
      const fromAddress = process.env.SMTP_FROM || 'emergency@suraksha.ai';
      const formattedTime = new Date(timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

      // Location construction
      let locationText = 'Location: Currently unavailable.';
      let mapsUrl = null;
      if (
        location &&
        typeof location.latitude === 'number' &&
        typeof location.longitude === 'number' &&
        location.latitude >= -90 &&
        location.latitude <= 90 &&
        location.longitude >= -180 &&
        location.longitude <= 180
      ) {
        mapsUrl = `https://maps.google.com/?q=${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}`;
        locationText = `Coordinates: Lat ${location.latitude.toFixed(6)}, Lon ${location.longitude.toFixed(6)}\nGoogle Maps: ${mapsUrl}`;
      }

      // Evidence details & attachments
      let audioInfo = 'Audio Evidence: Emergency audio recording initiated. Audio evidence segment capture in progress.';
      const attachments = [];
      let secureLink = null;

      if (evidence) {
        const token = this.generateSecureToken(evidence._id || evidence.id, emergencyId, userId);
        const baseUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 5000}`;
        secureLink = `${baseUrl}/api/evidence/secure/${token}`;

        audioInfo = `Audio Evidence: Segment recorded (${evidence.durationSeconds || 0}s)\n` +
          `Secure Authorized Audio Link (valid for 24h): ${secureLink}\n` +
          `Timestamp: ${new Date(evidence.createdAt || timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

        // Attach physical file if under 10MB
        if (evidence.filePath && fs.existsSync(evidence.filePath)) {
          const stats = fs.statSync(evidence.filePath);
          if (stats.size > 0 && stats.size <= 10 * 1024 * 1024) {
            attachments.push({
              filename: evidence.fileName || 'emergency_recording.webm',
              path: evidence.filePath,
              contentType: evidence.mimeType || 'audio/webm'
            });
          }
        }
      }

      const subject = `[SURAKSHA AI EMERGENCY ALERT] Urgent: ${userName || 'User'} has triggered SOS (ID: ${emergencyId})`;
      const textBody = `Dear ${contactName || 'Trusted Contact'},\n\n` +
        `This is an automated SURAKSHA AI Emergency Alert regarding ${userName || 'User'}.\n\n` +
        `--- EMERGENCY DETAILS ---\n` +
        `Emergency ID: ${emergencyId}\n` +
        `Status: ${(status || 'active').toUpperCase()}\n` +
        `Timestamp: ${formattedTime}\n` +
        `${locationText}\n\n` +
        `--- AUDIO EVIDENCE ---\n` +
        `${audioInfo}\n\n` +
        `Please attempt to contact them or reach out to emergency services if necessary.\n\n` +
        `Suraksha AI Emergency Response Network`;

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ef4444; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #dc2626; color: white; padding: 16px; text-align: center;">
            <h2 style="margin: 0; font-size: 20px;">SURAKSHA AI EMERGENCY ALERT</h2>
          </div>
          <div style="padding: 20px; background-color: #ffffff; color: #1f2937;">
            <p>Dear <strong>${contactName || 'Trusted Contact'}</strong>,</p>
            <p>This is an urgent automated alert. <strong>${userName || 'User'}</strong> has activated a genuine emergency SOS on Suraksha AI.</p>
            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 16px 0;">
              <p style="margin: 4px 0;"><strong>Emergency ID:</strong> ${emergencyId}</p>
              <p style="margin: 4px 0;"><strong>Status:</strong> ${(status || 'active').toUpperCase()}</p>
              <p style="margin: 4px 0;"><strong>Time:</strong> ${formattedTime}</p>
              ${mapsUrl ? `<p style="margin: 4px 0;"><strong>Live Location:</strong> <a href="${mapsUrl}" target="_blank" style="color: #2563eb; font-weight: bold;">View on Google Maps</a></p>` : `<p style="margin: 4px 0;"><strong>Location:</strong> Unavailable</p>`}
            </div>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin: 16px 0;">
              <h4 style="margin: 0 0 8px 0; color: #0f172a;">Audio Evidence</h4>
              ${secureLink ? `<p style="margin: 4px 0;">Recorded Audio Duration: <strong>${evidence.durationSeconds || 0} seconds</strong></p><p style="margin: 8px 0;"><a href="${secureLink}" target="_blank" style="display: inline-block; padding: 8px 14px; background-color: #1e3a8a; color: white; text-decoration: none; border-radius: 4px; font-size: 13px;">Listen to Secure Audio Recording (24h Expiry)</a></p>` : `<p style="margin: 4px 0; color: #64748b;">Emergency audio recording initiated. Audio evidence segment capture in progress.</p>`}
            </div>
            <p style="font-size: 13px; color: #4b5563;">Please contact ${userName || 'them'} immediately. If unable to establish contact, please alert local emergency services.</p>
          </div>
          <div style="background-color: #f1f5f9; padding: 12px; text-align: center; font-size: 11px; color: #64748b;">
            Suraksha AI Automated Emergency Response &bull; Confidential
          </div>
        </div>
      `;

      const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        text: textBody,
        html: htmlBody,
        attachments
      });

      return {
        success: true,
        messageId: info.messageId,
        status: 'SENT',
        deliveryStatus: 'UNKNOWN',
        providerResponse: {
          messageId: info.messageId,
          response: info.response
        }
      };
    } catch (err) {
      console.error(`[EmailService] Failed to send emergency email to ${to}:`, err.message);
      return {
        success: false,
        status: 'FAILED',
        deliveryStatus: 'FAILED',
        errorCode: 'SMTP_SEND_FAILURE',
        errorMessage: err.message || 'SMTP email delivery failed'
      };
    }
  }
}

module.exports = new EmailService();
