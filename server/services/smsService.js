/**
 * Provider-Independent Emergency SMS Service — SURAKSHA AI
 *
 * Provides a unified, provider-agnostic interface for emergency SMS dispatch.
 * Decouples the SURAKSHA AI emergency engine from third-party SMS SDKs/gateways.
 *
 * Guarantees:
 * - Provider adapter registration and pluggability
 * - Honest state reporting: Returns 'NOT_CONFIGURED' when no provider is active (never claims false delivery)
 * - Recipient phone normalization (E.164) and masking for privacy
 * - Test mock injection for automated testing without network access or charges
 * - Forward-compatible webhook signature validation interface
 */

const { normalizePhoneNumber, maskPhoneNumber } = require('../config/smsConfig');

class SmsService {
  constructor() {
    this._providers = new Map();
    this._activeProviderName = process.env.SMS_PROVIDER_NAME || 'NONE';
    this._mockProvider = null;
    this._mockSignatureValidator = null;
  }

  /**
   * Register a new SMS provider adapter.
   * @param {string} name - Unique provider identifier (e.g., 'MSG91', 'GUPSHUP', 'CUSTOM')
   * @param {Object} adapter - Provider adapter implementing isConfigured() and sendSms(options)
   */
  registerProvider(name, adapter) {
    if (!name || !adapter) {
      throw new Error('[SmsService] Provider name and adapter object are required');
    }
    this._providers.set(name.toUpperCase(), adapter);
  }

  /**
   * Set the active SMS provider name.
   * @param {string} name - Provider identifier
   */
  setActiveProvider(name) {
    this._activeProviderName = (name || 'NONE').toUpperCase();
  }

  /**
   * Returns the current active provider name.
   * @returns {string} Provider name or 'NONE'
   */
  getProviderName() {
    if (this._mockProvider) {
      return this._mockProvider.name || 'MOCK_SMS';
    }
    return this._activeProviderName;
  }

  /**
   * Check whether an active SMS provider is configured and ready to transmit.
   * @returns {boolean}
   */
  isConfigured() {
    if (this._mockProvider) {
      return typeof this._mockProvider.isConfigured === 'function'
        ? this._mockProvider.isConfigured()
        : true;
    }

    if (this._activeProviderName === 'NONE' || !this._providers.has(this._activeProviderName)) {
      return false;
    }

    const adapter = this._providers.get(this._activeProviderName);
    return typeof adapter.isConfigured === 'function' ? adapter.isConfigured() : false;
  }

  /**
   * Injects a mock provider for automated tests (prevents network calls and charges).
   * @param {Object} mock - Mock provider implementing sendSms and optional isConfigured
   */
  setMockProvider(mock) {
    this._mockProvider = mock;
  }

  /**
   * Resets mock provider to restore standard initialization.
   */
  resetMockProvider() {
    this._mockProvider = null;
  }

  /**
   * Injects a mock signature validator for testing webhook callbacks.
   */
  setMockSignatureValidator(validator) {
    this._mockSignatureValidator = validator;
  }

  /**
   * Resets mock signature validator.
   */
  resetMockSignatureValidator() {
    this._mockSignatureValidator = null;
  }

  /**
   * Send an emergency SMS via the active provider interface.
   *
   * @param {Object} options
   * @param {string} options.to - Recipient phone number
   * @param {string} options.message - Emergency SMS message body
   * @param {string} [options.statusCallback] - Optional webhook callback URL
   * @param {Object} [options.metadata] - Optional additional metadata
   * @returns {Promise<Object>} Standardized outcome object
   */
  async sendSms({ to, message, statusCallback, metadata = {} }) {
    const normalizedTo = normalizePhoneNumber(to);
    if (!normalizedTo) {
      return {
        success: false,
        status: 'FAILED',
        deliveryStatus: 'FAILED',
        errorCode: 'INVALID_PHONE_NUMBER',
        errorMessage: 'Recipient phone number is invalid or could not be normalized.'
      };
    }

    // If mock provider is injected for tests, route to it directly
    if (this._mockProvider) {
      if (typeof this._mockProvider.sendSms === 'function') {
        try {
          return await this._mockProvider.sendSms({
            to: normalizedTo,
            message,
            statusCallback,
            metadata
          });
        } catch (mockErr) {
          console.error(`[SmsService] Mock dispatch failure to ${maskPhoneNumber(normalizedTo)}: [${mockErr.code || 'ERROR'}] ${mockErr.message}`);
          return {
            success: false,
            status: 'FAILED',
            deliveryStatus: 'FAILED',
            errorCode: mockErr.code ? String(mockErr.code) : 'PROVIDER_DISPATCH_ERROR',
            errorMessage: mockErr.message || 'SMS provider dispatch failed'
          };
        }
      }
    }

    // If no provider is configured, return truthful NOT_CONFIGURED status
    if (!this.isConfigured()) {
      console.warn(`[SmsService] SMS to ${maskPhoneNumber(normalizedTo)} skipped: No active SMS provider configured.`);
      return {
        success: false,
        status: 'NOT_CONFIGURED',
        deliveryStatus: 'FAILED',
        errorCode: 'SMS_PROVIDER_NOT_CONFIGURED',
        errorMessage: `SMS provider '${this.getProviderName()}' is not configured in the active environment.`
      };
    }

    const adapter = this._providers.get(this._activeProviderName);
    try {
      return await adapter.sendSms({
        to: normalizedTo,
        message,
        statusCallback,
        metadata
      });
    } catch (err) {
      console.error(`[SmsService] Dispatch exception to ${maskPhoneNumber(normalizedTo)}:`, err.message);
      return {
        success: false,
        status: 'FAILED',
        deliveryStatus: 'FAILED',
        errorCode: err.code || 'PROVIDER_DISPATCH_ERROR',
        errorMessage: err.message || 'SMS provider dispatch failed'
      };
    }
  }

  /**
   * Validate incoming webhook signature across provider adapters.
   *
   * @param {string} signature - Webhook signature header
   * @param {string} url - Target callback URL
   * @param {Object} params - Webhook payload parameters
   * @returns {boolean}
   */
  validateSignature(signature, url, params = {}) {
    if (this._mockSignatureValidator) {
      return this._mockSignatureValidator(signature, url, params);
    }

    if (this._mockProvider && typeof this._mockProvider.validateSignature === 'function') {
      return this._mockProvider.validateSignature(signature, url, params);
    }

    const adapter = this._providers.get(this._activeProviderName);
    if (adapter && typeof adapter.validateSignature === 'function') {
      return adapter.validateSignature(signature, url, params);
    }

    // Default to false when no signature validator is configured
    return false;
  }
}

module.exports = new SmsService();
