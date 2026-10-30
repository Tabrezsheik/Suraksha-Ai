/**
 * Automatic Self-Notification Agent — SURAKSHA AI
 *
 * Dedicated backend service that automatically alerts the configured account owner
 * whenever an emergency event is created or an automated emergency update triggers.
 *
 * Dispatches via:
 * 1. Provider-Independent Emergency SMS (via smsService)
 * 2. Provider-Independent Emergency Email (via emailProviderService)
 *
 * Guarantees:
 * - Independent channel execution (SMS failure does not block email, and vice versa)
 * - Atomic workflow limits (max 5 SMS and max 10 emails per EmergencyEvent)
 * - Idempotency & duplicate dispatch prevention
 * - Conservative counting on timeouts
 * - Truthful delivery state machine (accurate NOT_CONFIGURED when no provider is active)
 * - Strict live-test gating
 */

const EmergencyEvent = require('../models/EmergencyEvent');
const Notification = require('../models/Notification');
const smsService = require('./smsService');
const emailProviderService = require('./emailProviderService');
const { normalizePhoneNumber } = require('../config/smsConfig');

class SelfNotificationService {
  /**
   * Check whether automatic self-notifications are globally enabled via feature flag.
   */
  isSelfNotificationEnabled() {
    return process.env.SURAKSHA_SELF_NOTIFICATIONS_ENABLED !== 'false';
  }

  /**
   * Inspect and report any missing configuration variables for self-notifications.
   */
  getMissingConfig() {
    const missing = [];
    if (!process.env.SURAKSHA_ALERT_PHONE) {
      missing.push('SURAKSHA_ALERT_PHONE');
    }
    if (!smsService.isConfigured()) {
      missing.push(`SMS Provider [${smsService.getProviderName()}] configuration`);
    }
    if (!process.env.SURAKSHA_ALERT_EMAIL) {
      missing.push('SURAKSHA_ALERT_EMAIL');
    }
    if (!emailProviderService.isConfigured()) {
      missing.push(`Email Provider [${emailProviderService.getProviderName()}] configuration`);
    }
    return missing;
  }

  /**
   * Format validated location and Google Maps link.
   * Never fabricates coordinates.
   */
  _extractLocation(emergencyEvent, options = {}) {
    let lat = null;
    let lon = null;
    let hasCoords = false;

    if (
      options.location &&
      typeof options.location.latitude === 'number' &&
      typeof options.location.longitude === 'number'
    ) {
      lat = options.location.latitude;
      lon = options.location.longitude;
      hasCoords = true;
    } else if (
      emergencyEvent.currentLocation &&
      typeof emergencyEvent.currentLocation.latitude === 'number' &&
      typeof emergencyEvent.currentLocation.longitude === 'number'
    ) {
      lat = emergencyEvent.currentLocation.latitude;
      lon = emergencyEvent.currentLocation.longitude;
      hasCoords = true;
    }

    if (hasCoords && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return {
        hasCoords: true,
        latitude: lat,
        longitude: lon,
        mapsUrl: `https://maps.google.com/?q=${lat.toFixed(6)},${lon.toFixed(6)}`,
        locText: `Location: https://maps.google.com/?q=${lat.toFixed(6)},${lon.toFixed(6)}`
      };
    }

    return {
      hasCoords: false,
      latitude: null,
      longitude: null,
      mapsUrl: null,
      locText: 'Location: Currently unavailable.'
    };
  }

  /**
   * Automatically notify the configured account owner for an emergency workflow.
   *
   * @param {Object} emergencyEvent - EmergencyEvent document or object
   * @param {Object} options - Update options (sequenceNumber, location, riskScore, riskLevel, triggerType)
   * @returns {Promise<Object>} Outcome for both SMS and Email channels
   */
  async notifyAccountOwner(emergencyEvent, options = {}) {
    if (!emergencyEvent) {
      return { skipped: true, reason: 'NO_EMERGENCY_EVENT' };
    }

    const emergencyId = emergencyEvent._id ? emergencyEvent._id : emergencyEvent.id;
    const userId = emergencyEvent.user && emergencyEvent.user._id ? emergencyEvent.user._id : (emergencyEvent.user || null);

    if (!this.isSelfNotificationEnabled()) {
      return {
        skipped: true,
        emergencyId,
        reason: 'SURAKSHA_SELF_NOTIFICATIONS_DISABLED'
      };
    }

    const sequenceNumber = typeof options.sequenceNumber === 'number' ? options.sequenceNumber : 1;
    const locInfo = this._extractLocation(emergencyEvent, options);
    const riskScore = options.riskScore !== undefined
      ? options.riskScore
      : (emergencyEvent.currentRiskScore !== undefined ? emergencyEvent.currentRiskScore : 30);
    const riskLevel = (options.riskLevel || emergencyEvent.riskLevel || 'low').toUpperCase();
    const eventStatus = (emergencyEvent.status || 'active').toUpperCase();
    const eventTime = emergencyEvent.startedAt ? new Date(emergencyEvent.startedAt) : new Date();

    const shortId = emergencyId ? emergencyId.toString().slice(-6) : 'ACTIVE';
    console.log(`[SelfNotification] Trigger received for emergency ${shortId}, sequence #${sequenceNumber}, status=${eventStatus}`);

    // Concise alert text — strictly no passwords, auth tokens, or unrestricted evidence URLs
    const smsMessage = sequenceNumber === 1
      ? `[SURAKSHA AI] EMERGENCY SELF-ALERT: SOS Active! Event ID: ${shortId}. Status: ${eventStatus}. Risk: ${riskScore} (${riskLevel}). ${locInfo.locText}`
      : `[SURAKSHA AI] EMERGENCY SELF-ALERT: Update #${sequenceNumber}! Event ID: ${shortId}. Status: ${eventStatus}. Risk: ${riskScore} (${riskLevel}). ${locInfo.locText}`;

    const emailSubject = `[SURAKSHA AI ALERT] Emergency Event #${shortId} — Status: ${eventStatus} (${riskLevel})`;
    const emailText = [
      '==================================================',
      'SURAKSHA AI AUTOMATIC EMERGENCY SELF-NOTIFICATION',
      '==================================================',
      '',
      `An emergency workflow has been activated on your account.`,
      '',
      `Event ID:    ${emergencyId}`,
      `Sequence:    #${sequenceNumber}`,
      `Status:      ${eventStatus}`,
      `Risk Level:  ${riskLevel} (Score: ${riskScore})`,
      `Timestamp:   ${eventTime.toISOString()}`,
      `${locInfo.locText}`,
      '',
      'This alert was dispatched automatically by the SURAKSHA AI Automatic Self-Notification Agent.',
      'Log in to your verified SURAKSHA AI dashboard to manage or resolve this emergency event.'
    ].join('\n');

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; background-color: #ffffff;">
        <div style="background-color: #d32f2f; color: #ffffff; padding: 12px 16px; border-radius: 6px; text-align: center;">
          <h2 style="margin: 0; font-size: 18px; letter-spacing: 0.5px;">SURAKSHA AI EMERGENCY SELF-NOTIFICATION</h2>
        </div>
        <div style="padding: 20px 0;">
          <p style="font-size: 15px; color: #333333;">An emergency workflow is currently active on your SURAKSHA AI account.</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #eeeeee; font-weight: bold; width: 140px;">Event ID:</td><td style="padding: 8px; border-bottom: 1px solid #eeeeee;">${emergencyId}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eeeeee; font-weight: bold;">Sequence:</td><td style="padding: 8px; border-bottom: 1px solid #eeeeee;">#${sequenceNumber}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eeeeee; font-weight: bold;">Status:</td><td style="padding: 8px; border-bottom: 1px solid #eeeeee;"><span style="color: #d32f2f; font-weight: bold;">${eventStatus}</span></td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eeeeee; font-weight: bold;">Risk Level:</td><td style="padding: 8px; border-bottom: 1px solid #eeeeee;">${riskLevel} (Score: ${riskScore})</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eeeeee; font-weight: bold;">Timestamp:</td><td style="padding: 8px; border-bottom: 1px solid #eeeeee;">${eventTime.toISOString()}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eeeeee; font-weight: bold;">Location:</td><td style="padding: 8px; border-bottom: 1px solid #eeeeee;">${locInfo.mapsUrl ? `<a href="${locInfo.mapsUrl}" target="_blank" style="color: #1976d2; font-weight: bold;">View Live Location on Google Maps</a>` : 'Currently unavailable'}</td></tr>
          </table>
        </div>
        <div style="font-size: 12px; color: #777777; border-top: 1px solid #eeeeee; padding-top: 15px;">
          This is an automated security transmission dispatched solely to the configured account owner.
        </div>
      </div>
    `;

    const channelResults = {
      emergencyId,
      sequence: sequenceNumber,
      sms: null,
      email: null
    };

    // =========================================================================
    // CHANNEL 1: SMS (Provider-Independent Interface) — Fully Isolated
    // =========================================================================
    try {
      const alertPhone = process.env.SURAKSHA_ALERT_PHONE;
      const normalizedPhone = alertPhone ? normalizePhoneNumber(alertPhone) : null;

      if (!alertPhone) {
        console.warn(`[SelfNotification] SMS skipped: destination phone not configured in SURAKSHA_ALERT_PHONE`);
        channelResults.sms = {
          success: false,
          configured: false,
          disabled: true,
          status: 'NOT_CONFIGURED',
          deliveryStatus: 'FAILED',
          reason: 'SURAKSHA_ALERT_PHONE_MISSING'
        };
      } else if (!smsService.isConfigured()) {
        console.warn(`[SelfNotification] SMS skipped: SMS provider is not configured`);
        const notif = await Notification.create({
          user: userId,
          trustedContact: null,
          emergencyEvent: emergencyId,
          title: `SURAKSHA AI Self-Alert (SMS) #${sequenceNumber}`,
          message: smsMessage,
          notificationType: 'self_alert',
          channel: 'sms',
          provider: smsService.getProviderName() !== 'NONE' ? smsService.getProviderName() : 'NONE',
          status: 'NOT_CONFIGURED',
          deliveryStatus: 'FAILED',
          sequence: sequenceNumber,
          recipientPhone: normalizedPhone || alertPhone,
          providerError: `SMS provider '${smsService.getProviderName()}' not configured in environment`
        });

        channelResults.sms = {
          success: false,
          configured: false,
          status: 'NOT_CONFIGURED',
          deliveryStatus: 'FAILED',
          notificationId: notif._id,
          reason: 'SMS_PROVIDER_NOT_CONFIGURED'
        };
      } else {
        // Idempotency check: (emergencyEvent, channel=sms, notificationType=self_alert, sequence)
        const existingSms = await Notification.findOne({
          emergencyEvent: emergencyId,
          channel: 'sms',
          notificationType: 'self_alert',
          sequence: sequenceNumber
        });

        if (existingSms) {
          console.log(`[SelfNotification] SMS skipped: sequence #${sequenceNumber} already dispatched (idempotent)`);
          channelResults.sms = {
            success: existingSms.status === 'SENT' || existingSms.status === 'ACCEPTED' || existingSms.status === 'DELIVERED',
            duplicate: true,
            status: existingSms.status,
            deliveryStatus: existingSms.deliveryStatus,
            notificationId: existingSms._id
          };
        } else {
          // Concurrency-safe limit reservation: maximum 5 SMS per emergency workflow
          const reservedEmergency = await EmergencyEvent.findOneAndUpdate(
            {
              _id: emergencyId,
              smsAttemptsCount: { $lt: 5 }
            },
            {
              $inc: { smsAttemptsCount: 1 }
            },
            { new: true }
          );

          if (!reservedEmergency) {
            console.warn(`[SelfNotification] SMS limit reached (max 5) for emergency ${shortId}`);
            const cappedNotif = await Notification.create({
              user: userId,
              trustedContact: null,
              emergencyEvent: emergencyId,
              title: `SURAKSHA AI Self-Alert (SMS) #${sequenceNumber}`,
              message: smsMessage,
              notificationType: 'self_alert',
              channel: 'sms',
              provider: smsService.getProviderName() !== 'NONE' ? smsService.getProviderName() : 'PROVIDER',
              status: 'FAILED',
              deliveryStatus: 'FAILED',
              sequence: sequenceNumber,
              recipientPhone: normalizedPhone || alertPhone,
              providerError: 'Maximum 5 SMS attempts reached for this emergency workflow'
            });

            channelResults.sms = {
              success: false,
              status: 'FAILED',
              deliveryStatus: 'FAILED',
              notificationId: cappedNotif._id,
              reason: 'SMS_WORKFLOW_LIMIT_REACHED'
            };
          } else {
            // Dispatch via provider-independent SMS Service
            console.log(`[SelfNotification] SMS dispatch attempted via ${smsService.getProviderName()} for emergency ${shortId}, sequence #${sequenceNumber}`);
            const smsResult = await smsService.sendSms({
              to: normalizedPhone || alertPhone,
              message: smsMessage
            });

            if (smsResult.success) {
              console.log(`[SelfNotification] SMS provider response: status=${smsResult.status}, sid=${smsResult.sid || smsResult.messageId || 'N/A'}`);
            } else {
              console.error(`[SelfNotification] SMS provider error: code=${smsResult.errorCode || 'UNKNOWN'}, error=${smsResult.errorMessage || 'N/A'}`);
            }

            const notif = await Notification.create({
              user: userId,
              trustedContact: null,
              emergencyEvent: emergencyId,
              title: `SURAKSHA AI Self-Alert (SMS) #${sequenceNumber}`,
              message: smsMessage,
              notificationType: 'self_alert',
              channel: 'sms',
              provider: smsService.getProviderName() !== 'NONE' ? smsService.getProviderName() : 'PROVIDER',
              status: smsResult.status || 'SENT',
              deliveryStatus: smsResult.deliveryStatus || 'PENDING',
              sequence: sequenceNumber,
              recipientPhone: normalizedPhone || alertPhone,
              smsMessageId: smsResult.sid || smsResult.messageId || null,
              providerError: smsResult.errorCode
                ? `[${smsResult.errorCode}] ${smsResult.errorMessage}`
                : (smsResult.errorMessage || null)
            });

            channelResults.sms = {
              success: smsResult.success,
              status: notif.status,
              deliveryStatus: notif.deliveryStatus,
              sid: smsResult.sid || smsResult.messageId || null,
              notificationId: notif._id,
              error: smsResult.errorMessage || null
            };
          }
        }
      }
    } catch (smsErr) {
      console.error('[SelfNotification] SMS channel exception (failure isolated):', smsErr.message);
      channelResults.sms = {
        success: false,
        status: 'FAILED',
        deliveryStatus: 'FAILED',
        error: smsErr.message
      };
    }

    // =========================================================================
    // CHANNEL 2: EMAIL (Provider-Independent Interface) — Fully Isolated
    // =========================================================================
    try {
      const alertEmail = process.env.SURAKSHA_ALERT_EMAIL;

      if (!alertEmail) {
        console.warn(`[SelfNotification] Email skipped: destination email not configured in SURAKSHA_ALERT_EMAIL`);
        channelResults.email = {
          success: false,
          configured: false,
          disabled: true,
          status: 'NOT_CONFIGURED',
          deliveryStatus: 'FAILED',
          reason: 'SURAKSHA_ALERT_EMAIL_MISSING'
        };
      } else if (!emailProviderService.isConfigured()) {
        console.warn(`[SelfNotification] Email skipped: Email provider is not configured`);
        const notif = await Notification.create({
          user: userId,
          trustedContact: null,
          emergencyEvent: emergencyId,
          title: `SURAKSHA AI Self-Alert (Email) #${sequenceNumber}`,
          message: emailSubject,
          notificationType: 'self_alert',
          channel: 'email',
          provider: emailProviderService.getProviderName() !== 'NONE' ? emailProviderService.getProviderName() : 'NONE',
          status: 'NOT_CONFIGURED',
          deliveryStatus: 'FAILED',
          sequence: sequenceNumber,
          recipientEmail: alertEmail,
          providerError: `Email provider '${emailProviderService.getProviderName()}' not configured in environment`
        });

        channelResults.email = {
          success: false,
          configured: false,
          status: 'NOT_CONFIGURED',
          deliveryStatus: 'FAILED',
          notificationId: notif._id,
          reason: 'EMAIL_PROVIDER_NOT_CONFIGURED'
        };
      } else {
        // Idempotency check: (emergencyEvent, channel=email, notificationType=self_alert, sequence)
        const existingEmail = await Notification.findOne({
          emergencyEvent: emergencyId,
          channel: 'email',
          notificationType: 'self_alert',
          sequence: sequenceNumber
        });

        if (existingEmail) {
          console.log(`[SelfNotification] Email skipped: sequence #${sequenceNumber} already dispatched (idempotent)`);
          channelResults.email = {
            success: existingEmail.status === 'ACCEPTED' || existingEmail.status === 'SENT' || existingEmail.status === 'DELIVERED',
            duplicate: true,
            status: existingEmail.status,
            deliveryStatus: existingEmail.deliveryStatus,
            notificationId: existingEmail._id
          };
        } else {
          // Concurrency-safe limit reservation: maximum 10 emails per emergency workflow
          const reservedEmergency = await EmergencyEvent.findOneAndUpdate(
            {
              _id: emergencyId,
              emailAttemptsCount: { $lt: 10 }
            },
            {
              $inc: { emailAttemptsCount: 1 }
            },
            { new: true }
          );

          if (!reservedEmergency) {
            console.warn(`[SelfNotification] Email limit reached (max 10) for emergency ${shortId}`);
            const cappedNotif = await Notification.create({
              user: userId,
              trustedContact: null,
              emergencyEvent: emergencyId,
              title: `SURAKSHA AI Self-Alert (Email) #${sequenceNumber}`,
              message: emailSubject,
              notificationType: 'self_alert',
              channel: 'email',
              provider: emailProviderService.getProviderName() !== 'NONE' ? emailProviderService.getProviderName() : 'PROVIDER',
              status: 'FAILED',
              deliveryStatus: 'FAILED',
              sequence: sequenceNumber,
              recipientEmail: alertEmail,
              providerError: 'Maximum 10 email attempts reached for this emergency workflow'
            });

            channelResults.email = {
              success: false,
              status: 'FAILED',
              deliveryStatus: 'FAILED',
              notificationId: cappedNotif._id,
              reason: 'EMAIL_WORKFLOW_LIMIT_REACHED'
            };
          } else {
            // Dispatch via provider-independent Email Service
            console.log(`[SelfNotification] Email dispatch attempted via ${emailProviderService.getProviderName()} for emergency ${shortId}, sequence #${sequenceNumber}`);
            const emailResult = await emailProviderService.sendEmail({
              to: alertEmail,
              subject: emailSubject,
              text: emailText,
              html: emailHtml
            });

            if (emailResult.success) {
              console.log(`[SelfNotification] Email API response: status=${emailResult.status}, operationId=${emailResult.operationId || 'N/A'}`);
            } else {
              console.error(`[SelfNotification] Email API error: code=${emailResult.errorCode || 'UNKNOWN'}, error=${emailResult.errorMessage || 'N/A'}`);
            }

            const notif = await Notification.create({
              user: userId,
              trustedContact: null,
              emergencyEvent: emergencyId,
              title: `SURAKSHA AI Self-Alert (Email) #${sequenceNumber}`,
              message: emailSubject,
              notificationType: 'self_alert',
              channel: 'email',
              provider: emailProviderService.getProviderName() !== 'NONE' ? emailProviderService.getProviderName() : 'PROVIDER',
              status: emailResult.status || (emailResult.success ? 'ACCEPTED' : 'FAILED'),
              deliveryStatus: emailResult.deliveryStatus || (emailResult.success ? 'PENDING' : 'FAILED'),
              sequence: sequenceNumber,
              recipientEmail: alertEmail,
              emailOperationId: emailResult.operationId || null,
              emailOperationLocation: emailResult.operationLocation || null,
              operationLocation: emailResult.operationLocation || null,
              providerError: emailResult.errorCode
                ? `[${emailResult.errorCode}] ${emailResult.errorMessage}`
                : (emailResult.errorMessage || null)
            });

            channelResults.email = {
              success: emailResult.success,
              status: notif.status,
              deliveryStatus: notif.deliveryStatus,
              operationId: emailResult.operationId || null,
              operationLocation: emailResult.operationLocation || null,
              notificationId: notif._id,
              error: emailResult.errorMessage || null
            };
          }
        }
      }
    } catch (emailErr) {
      console.error('[SelfNotification] Email channel exception (failure isolated):', emailErr.message);
      channelResults.email = {
        success: false,
        status: 'FAILED',
        deliveryStatus: 'FAILED',
        error: emailErr.message
      };
    }

    return channelResults;
  }

  /**
   * Protected Live Test Dispatch.
   *
   * Gated strictly by:
   * 1. Payload confirmation `confirmLiveSend === true`
   * 2. Environment confirmation `process.env.SURAKSHA_LIVE_TEST_CONFIRM === 'true'`
   *
   * Sends ONLY to configured account owner destinations (SURAKSHA_ALERT_PHONE, SURAKSHA_ALERT_EMAIL).
   * Strictly never alerts Trusted Contacts.
   *
   * @param {Object} options
   * @param {string} [options.channel='all'] - 'sms', 'email', or 'all'
   * @param {boolean} options.confirmLiveSend - Explicit confirmation
   * @param {Object} options.user - Authenticated user initiating the test
   * @returns {Promise<Object>} Outcome of the gated live test
   */
  async sendGatedLiveTest({ channel = 'all', confirmLiveSend, user }) {
    if (confirmLiveSend !== true) {
      return {
        success: false,
        rejected: true,
        statusCode: 400,
        reason: 'Live test rejected: Missing payload confirmLiveSend: true.'
      };
    }

    if (process.env.SURAKSHA_LIVE_TEST_CONFIRM !== 'true') {
      return {
        success: false,
        rejected: true,
        statusCode: 403,
        reason: 'Live test rejected: SURAKSHA_LIVE_TEST_CONFIRM environment variable is not set to "true".'
      };
    }

    const testTime = new Date().toISOString();
    const alertPhone = process.env.SURAKSHA_ALERT_PHONE;
    const alertEmail = process.env.SURAKSHA_ALERT_EMAIL;

    const outcome = {
      success: true,
      liveTest: true,
      timestamp: testTime,
      sms: null,
      email: null
    };

    if (channel === 'sms' || channel === 'all') {
      if (!alertPhone || !smsService.isConfigured()) {
        outcome.sms = {
          success: false,
          status: 'NOT_CONFIGURED',
          deliveryStatus: 'FAILED',
          reason: !alertPhone ? 'SURAKSHA_ALERT_PHONE missing' : 'SMS provider not configured'
        };
      } else {
        const normalized = normalizePhoneNumber(alertPhone);
        const sendRes = await smsService.sendSms({
          to: normalized,
          message: `[SURAKSHA AI LIVE TEST] Account Owner Emergency Alert Channel Verified. Time: ${testTime}. (Zero Trusted Contacts Alerted).`
        });
        outcome.sms = {
          success: sendRes.success,
          status: sendRes.status,
          deliveryStatus: sendRes.deliveryStatus,
          sid: sendRes.sid || sendRes.messageId || null,
          targetPhone: normalized,
          error: sendRes.errorMessage || null
        };
      }
    }

    if (channel === 'email' || channel === 'all') {
      if (!alertEmail || !emailProviderService.isConfigured()) {
        outcome.email = {
          success: false,
          status: 'NOT_CONFIGURED',
          deliveryStatus: 'FAILED',
          reason: !alertEmail ? 'SURAKSHA_ALERT_EMAIL missing' : 'Email provider not configured'
        };
      } else {
        const emailRes = await emailProviderService.sendEmail({
          to: alertEmail,
          subject: `[SURAKSHA AI LIVE TEST] Self-Alert Email Channel Verified`,
          text: `This is a verified live test transmission for SURAKSHA AI Automatic Self-Notification Agent.\n\nTimestamp: ${testTime}\nTarget: ${alertEmail}\n\nNo Trusted Contacts were notified.`,
          html: `<p>This is a verified live test transmission for <strong>SURAKSHA AI Automatic Self-Notification Agent</strong>.</p><p>Timestamp: ${testTime}</p><p>Target: ${alertEmail}</p><p><em>No Trusted Contacts were notified.</em></p>`
        });
        outcome.email = {
          success: emailRes.success,
          status: emailRes.status,
          deliveryStatus: emailRes.deliveryStatus,
          operationId: emailRes.operationId || null,
          operationLocation: emailRes.operationLocation || null,
          targetEmail: alertEmail,
          error: emailRes.errorMessage || null
        };
      }
    }

    return outcome;
  }
}

module.exports = new SelfNotificationService();
