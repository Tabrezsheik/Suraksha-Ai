/**
 * Centralized Emergency SMS Transport & Development Configuration
 * Supports Provider-Independent Gateway and Direct Android SIM Transports
 */

function getSmsTransport() {
  return process.env.SURAKSHA_SMS_TRANSPORT || 'PROVIDER';
}

const SMS_TRANSPORT = process.env.SURAKSHA_SMS_TRANSPORT || 'PROVIDER';
const TEST_SIM_NUMBER = process.env.SURAKSHA_TEST_SIM_NUMBER || '+919392075827';

/**
 * Utility to mask phone numbers in logs and UI for security/privacy.
 * e.g., '+919392075827' -> '+91******5827'
 */
function maskPhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return 'N/A';
  const clean = phone.trim();
  if (clean.length <= 6) return '******';
  const prefix = clean.startsWith('+') ? clean.slice(0, 3) : clean.slice(0, 2);
  const suffix = clean.slice(-4);
  return `${prefix}${'*'.repeat(Math.max(3, clean.length - prefix.length - suffix.length))}${suffix}`;
}

/**
 * Normalizes phone numbers to standard E.164 format.
 */
function normalizePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return '';
  let cleaned = phone.trim().replace(/[^\d+]/g, '');
  if (!cleaned || cleaned === '+') return '';
  if (!cleaned.startsWith('+')) {
    // Default to +91 if 10 digit Indian mobile number
    if (cleaned.length === 10) {
      cleaned = '+91' + cleaned;
    } else {
      cleaned = '+' + cleaned;
    }
  }
  return cleaned;
}

module.exports = {
  getSmsTransport,
  SMS_TRANSPORT,
  TEST_SIM_NUMBER,
  maskPhoneNumber,
  normalizePhoneNumber
};
