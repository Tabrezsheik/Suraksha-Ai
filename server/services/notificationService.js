const Notification = require('../models/Notification');
const TrustedContact = require('../models/TrustedContact');
const EvidenceMetadata = require('../models/EvidenceMetadata');
const firebaseConfig = require('../config/firebase');
const smsService = require('./smsService');
const emailService = require('./emailService');
const { getSmsTransport, maskPhoneNumber, normalizePhoneNumber } = require('../config/smsConfig');

class NotificationService {
  /**
   * Helper to format validated location and map URL.
   */
  _extractLocation(emergencyEvent, updateDetails = {}) {
    let lat = null;
    let lon = null;
    let hasCoords = false;

    if (
      updateDetails.location &&
      typeof updateDetails.location.latitude === 'number' &&
      typeof updateDetails.location.longitude === 'number'
    ) {
      lat = updateDetails.location.latitude;
      lon = updateDetails.location.longitude;
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
        locSmsText: `Location: https://maps.google.com/?q=${lat.toFixed(6)},${lon.toFixed(6)}`
      };
    }

    return {
      hasCoords: false,
      latitude: null,
      longitude: null,
      mapsUrl: null,
      locSmsText: 'Location: Currently unavailable.'
    };
  }

  /**
   * Retrieve active Trusted Circle contacts for emergency notifications.
   * Capped at 4 contacts for SMS gateway provider (or 5 for legacy ANDROID_SIM mode).
   */
  async getEligibleContacts(userId, transport = 'PROVIDER') {
    const maxContacts = transport === 'ANDROID_SIM' ? 5 : 4;
    const allActive = await TrustedContact.find({ user: userId, isActive: true }).sort({ createdAt: 1 });
    return allActive.slice(0, maxContacts);
  }

  /**
   * Dispatch initial emergency alert notifications.
   * Sends 1 custom SMS per eligible contact (up to 4 contacts) via configured SMS provider,
   * plus emergency emails with location & audio evidence details.
   */
  async dispatchEmergencyNotifications(user, emergencyEvent, updateDetails = {}) {
    const transport = getSmsTransport();
    const contacts = await this.getEligibleContacts(user._id, transport);
    const notifications = [];

    const locInfo = this._extractLocation(emergencyEvent, updateDetails);
    const userName = user.name || 'User';
    const emergencyIdStr = emergencyEvent._id ? emergencyEvent._id.toString() : emergencyEvent.id;

    const title = 'SURAKSHA AI — EMERGENCY ALERT';
    const message = `SURAKSHA AI EMERGENCY: HELP NEEDED! ${userName} has activated an SOS. Please contact immediately. ${locInfo.locSmsText}`;

    // 1. Process SMS Notifications for eligible contacts (up to 4)
    for (const contact of contacts) {
      const normalizedPhone = normalizePhoneNumber(contact.phone);

      // Deduplication check: user + emergencyEvent + trustedContact + channel=sms + sequence=1
      const existingSms = await Notification.findOne({
        user: user._id,
        emergencyEvent: emergencyEvent._id,
        trustedContact: contact._id,
        channel: 'sms',
        sequence: 1
      });

      if (existingSms) {
        notifications.push(existingSms);
        continue;
      }

      let notifStatus = 'PENDING';
      let notifDelivery = 'PENDING';
      let smsSid = null;
      let providerErr = null;

      if (transport !== 'ANDROID_SIM') {
        if (!normalizedPhone || normalizedPhone.length < 10) {
          notifStatus = 'FAILED';
          notifDelivery = 'FAILED';
          providerErr = 'Invalid destination phone number';
        } else {
          console.log(`[NotificationService] SMS dispatch attempted via ${smsService.getProviderName()} for emergency ${emergencyIdStr.slice(-6)}, sequence #1`);
          const smsResult = await smsService.sendSms({
            to: normalizedPhone,
            message
          });

          notifStatus = smsResult.status;
          notifDelivery = smsResult.deliveryStatus;
          smsSid = smsResult.sid || null;
          providerErr = smsResult.errorCode
            ? `[${smsResult.errorCode}] ${smsResult.errorMessage}`
            : (smsResult.errorMessage || null);

          if (smsResult.success) {
            console.log(`[NotificationService] SMS provider response: status=${smsResult.status}, sid=${smsResult.sid || 'N/A'}`);
          } else {
            console.error(`[NotificationService] SMS provider error: code=${smsResult.errorCode || 'UNKNOWN'}, error=${smsResult.errorMessage || 'N/A'}`);
          }
        }
      } else {
        // ANDROID_SIM transport
        notifStatus = 'PENDING';
        notifDelivery = 'PENDING';
        smsSid = null;
      }

      const notif = await Notification.create({
        user: user._id,
        trustedContact: contact._id,
        emergencyEvent: emergencyEvent._id,
        title,
        message,
        notificationType: 'emergency_alert',
        channel: 'sms',
        provider: transport === 'ANDROID_SIM' ? 'ANDROID_SIM' : (smsService.getProviderName() !== 'NONE' ? smsService.getProviderName() : 'PROVIDER'),
        status: notifStatus,
        deliveryStatus: notifDelivery,
        sequence: 1,
        recipientPhone: normalizedPhone || contact.phone,
        smsMessageId: smsSid,
        providerError: providerErr
      });

      // Secondary push FCM attempt if configured
      if (contact.fcmToken && firebaseConfig.isAvailable) {
        try {
          const response = await firebaseConfig.admin.messaging().send({
            token: contact.fcmToken,
            notification: { title, body: message },
            data: {
              emergencyId: emergencyIdStr,
              type: 'emergency_alert',
              timestamp: new Date().toISOString()
            }
          });
          notif.fcmMessageId = typeof response === 'string' ? response : `fcm_${Date.now()}`;
          await notif.save();
        } catch (err) {
          console.error(`[NotificationService] FCM error for contact ${contact._id}:`, err.message);
        }
      } else if (contact.phone && transport === 'ANDROID_SIM') {
        notif.fcmMessageId = `sim_fcm_${Date.now()}_${contact._id.toString().slice(-4)}`;
        await notif.save();
      }

      notifications.push(notif);
    }

    // 2. Process Email Notifications for contacts with an email address
    let latestEvidence = null;
    try {
      latestEvidence = await EvidenceMetadata.findOne({ emergencyEvent: emergencyEvent._id }).sort({ createdAt: -1 });
    } catch (evErr) {
      console.warn('[NotificationService] Evidence lookup warning:', evErr.message);
    }

    for (const contact of contacts) {
      if (!contact.email) continue;

      // Deduplication check: user + emergencyEvent + trustedContact + channel=email + sequence=1
      const existingEmail = await Notification.findOne({
        user: user._id,
        emergencyEvent: emergencyEvent._id,
        trustedContact: contact._id,
        channel: 'email',
        sequence: 1
      });

      if (existingEmail) {
        notifications.push(existingEmail);
        continue;
      }

      const emailResult = await emailService.sendEmergencyEmail({
        to: contact.email,
        contactName: contact.name,
        userName,
        emergencyId: emergencyIdStr,
        status: emergencyEvent.status || 'active',
        timestamp: emergencyEvent.startedAt || new Date(),
        location: locInfo.hasCoords ? { latitude: locInfo.latitude, longitude: locInfo.longitude } : null,
        evidence: latestEvidence,
        userId: user._id,
        sequenceNumber: 1
      });

      const emailNotif = await Notification.create({
        user: user._id,
        trustedContact: contact._id,
        emergencyEvent: emergencyEvent._id,
        title: `SURAKSHA AI Emergency Alert — ${userName}`,
        message: `Emergency email dispatched to ${contact.email}. ${locInfo.locSmsText}`,
        notificationType: 'emergency_alert',
        channel: 'email',
        provider: 'SMTP',
        status: emailResult.status,
        deliveryStatus: emailResult.deliveryStatus,
        sequence: 1
      });

      notifications.push(emailNotif);
    }

    return notifications;
  }

  /**
   * Dispatch periodic emergency update notifications (Interval: 60s, Cap: Max 4 contacts).
   */
  async dispatchPeriodicEmergencyUpdate(user, emergencyEvent, sequenceNumber = 1, updateDetails = {}) {
    const transport = getSmsTransport();
    const contacts = await this.getEligibleContacts(user._id, transport);
    const notifications = [];

    const emergencyIdStr = emergencyEvent._id ? emergencyEvent._id.toString() : emergencyEvent.id;
    const nowIso = new Date().toISOString();
    const locInfo = this._extractLocation(emergencyEvent, updateDetails);

    const accuracyStr = updateDetails.location && typeof updateDetails.location.accuracy === 'number'
      ? `±${Math.round(updateDetails.location.accuracy)}m`
      : 'N/A';

    const riskStr = typeof updateDetails.riskScore === 'number'
      ? `${updateDetails.riskScore} (${(updateDetails.riskLevel || 'low').toUpperCase()})`
      : 'UNKNOWN';

    const evidenceStr = updateDetails.evidenceStatus
      ? `Segment ${updateDetails.evidenceSegment || sequenceNumber} — ${updateDetails.evidenceStatus}`
      : `Segment ${sequenceNumber} — UNAVAILABLE`;

    const title = `SURAKSHA AI — EMERGENCY UPDATE #${sequenceNumber}`;
    const message = `SURAKSHA AI EMERGENCY ALERT: ${user.name || 'User'} update #${sequenceNumber}. Risk: ${riskStr}. ${locInfo.locSmsText} Acc: ${accuracyStr}. Audio: ${evidenceStr}.`;

    // 1. Process SMS Notifications
    for (const contact of contacts) {
      const normalizedPhone = normalizePhoneNumber(contact.phone);

      // Deduplication check: EmergencyEventId + Sequence + TrustedContactId + channel=sms
      const existing = await Notification.findOne({
        user: user._id,
        emergencyEvent: emergencyEvent._id,
        trustedContact: contact._id,
        channel: 'sms',
        sequence: sequenceNumber
      });

      if (existing) {
        notifications.push(existing);
        continue;
      }

      let notifStatus = 'PENDING';
      let notifDelivery = 'PENDING';
      let smsSid = null;
      let providerErr = null;

      if (transport !== 'ANDROID_SIM') {
        if (!normalizedPhone || normalizedPhone.length < 10) {
          notifStatus = 'FAILED';
          notifDelivery = 'FAILED';
          providerErr = 'Invalid destination phone number';
        } else {
          console.log(`[NotificationService] SMS dispatch attempted via ${smsService.getProviderName()} for emergency ${emergencyIdStr.slice(-6)}, sequence #${sequenceNumber}`);
          const smsResult = await smsService.sendSms({
            to: normalizedPhone,
            message
          });
          notifStatus = smsResult.status;
          notifDelivery = smsResult.deliveryStatus;
          smsSid = smsResult.sid || null;
          providerErr = smsResult.errorCode
            ? `[${smsResult.errorCode}] ${smsResult.errorMessage}`
            : (smsResult.errorMessage || null);

          if (smsResult.success) {
            console.log(`[NotificationService] SMS provider response: status=${smsResult.status}, sid=${smsResult.sid || 'N/A'}`);
          } else {
            console.error(`[NotificationService] SMS provider error: code=${smsResult.errorCode || 'UNKNOWN'}, error=${smsResult.errorMessage || 'N/A'}`);
          }
        }
      } else {
        notifStatus = 'PENDING';
        notifDelivery = 'PENDING';
      }

      const mobileNotif = await Notification.create({
        user: user._id,
        trustedContact: contact._id,
        emergencyEvent: emergencyEvent._id,
        title,
        message,
        notificationType: 'emergency_update',
        channel: 'sms',
        provider: transport === 'ANDROID_SIM' ? 'ANDROID_SIM' : (smsService.getProviderName() !== 'NONE' ? smsService.getProviderName() : 'PROVIDER'),
        status: notifStatus,
        deliveryStatus: notifDelivery,
        sequence: sequenceNumber,
        recipientPhone: normalizedPhone || contact.phone,
        smsMessageId: smsSid,
        providerError: providerErr
      });

      if (contact.fcmToken && firebaseConfig.isAvailable) {
        try {
          const response = await firebaseConfig.admin.messaging().send({
            token: contact.fcmToken,
            notification: { title, body: message },
            data: {
              emergencyId: emergencyIdStr,
              type: 'emergency_update',
              sequence: String(sequenceNumber),
              timestamp: nowIso
            }
          });
          mobileNotif.fcmMessageId = typeof response === 'string' ? response : `fcm_upd_${Date.now()}`;
          await mobileNotif.save();
        } catch (err) {
          console.error(`[NotificationService] FCM error for periodic update to contact ${contact._id}:`, err.message);
        }
      } else if (contact.phone && transport === 'ANDROID_SIM') {
        mobileNotif.fcmMessageId = `sim_fcm_upd_${Date.now()}_${contact._id.toString().slice(-4)}`;
        await mobileNotif.save();
      }

      notifications.push(mobileNotif);
    }

    // 2. Process Email Notifications
    let latestEvidence = null;
    try {
      latestEvidence = await EvidenceMetadata.findOne({ emergencyEvent: emergencyEvent._id }).sort({ createdAt: -1 });
    } catch (evErr) {}

    for (const contact of contacts) {
      if (!contact.email) continue;

      const existingEmail = await Notification.findOne({
        user: user._id,
        emergencyEvent: emergencyEvent._id,
        trustedContact: contact._id,
        channel: 'email',
        sequence: sequenceNumber
      });

      if (existingEmail) {
        notifications.push(existingEmail);
        continue;
      }

      const emailResult = await emailService.sendEmergencyEmail({
        to: contact.email,
        contactName: contact.name,
        userName: user.name || 'User',
        emergencyId: emergencyIdStr,
        status: emergencyEvent.status || 'active',
        timestamp: emergencyEvent.startedAt || new Date(),
        location: locInfo.hasCoords ? { latitude: locInfo.latitude, longitude: locInfo.longitude } : null,
        evidence: latestEvidence,
        userId: user._id,
        sequenceNumber
      });

      const emailNotif = await Notification.create({
        user: user._id,
        trustedContact: contact._id,
        emergencyEvent: emergencyEvent._id,
        title: `SURAKSHA AI Emergency Update #${sequenceNumber} — Emergency Active`,
        message: `Dear ${contact.name},\n\nEmergency update #${sequenceNumber} regarding ${user.name || 'User'}.\n\n` + message,
        notificationType: 'emergency_update',
        channel: 'email',
        provider: 'SMTP',
        status: emailResult.status,
        deliveryStatus: emailResult.deliveryStatus,
        sequence: sequenceNumber
      });

      notifications.push(emailNotif);
    }

    return notifications;
  }

  /**
   * Update status of an SMS notification record from Android Native device callbacks or SMS provider webhooks
   */
  async updateSmsStatus(userId, notificationId, statusData = {}) {
    const notif = await Notification.findOne({ _id: notificationId, user: userId });
    if (!notif) {
      const err = new Error('Notification not found');
      err.statusCode = 404;
      throw err;
    }

    const { status, deliveryStatus, smsMessageId, errorCode, errorMessage } = statusData;

    if (status) {
      notif.status = status;
    }
    if (deliveryStatus) {
      notif.deliveryStatus = deliveryStatus;
    }
    if (smsMessageId) {
      notif.smsMessageId = smsMessageId;
    }

    await notif.save();
    return notif;
  }

  async getUserNotifications(userId) {
    return await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('trustedContact', 'name phone relationship');
  }

  async markAsRead(userId, notificationId) {
    const notif = await Notification.findOne({ _id: notificationId, user: userId });
    if (!notif) {
      const err = new Error('Notification not found');
      err.statusCode = 404;
      throw err;
    }
    notif.status = 'READ';
    notif.readAt = new Date();
    await notif.save();
    return notif;
  }
}

module.exports = new NotificationService();
