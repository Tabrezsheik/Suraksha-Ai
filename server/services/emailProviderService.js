/**
 * Provider-Independent External Email Service — SURAKSHA AI
 *
 * Provides a unified, provider-agnostic interface for external/API-based email dispatches.
 * Decouples SURAKSHA AI self-alerts and emergency emails from third-party vendor APIs.
 *
 * Guarantees:
 * - Provider adapter pluggability
 * - Honest state reporting: Returns 'NOT_CONFIGURED' when no provider is active
 * - Recipient address validation
 * - Asynchronous operation status checking interface
 * - Test mock injection for automated tests
 */

class EmailProviderService {
  constructor() {
    this._providers = new Map();
    this._activeProviderName = process.env.EMAIL_PROVIDER_NAME || 'NONE';
    this._mockProvider = null;
  }

  /**
   * Register a new email provider adapter.
   * @param {string} name - Provider identifier (e.g., 'RESEND', 'SENDGRID', 'POSTMARK', 'CUSTOM')
   * @param {Object} adapter - Adapter object with isConfigured(), sendEmail(options), and optional getEmailStatus()
   */
  registerProvider(name, adapter) {
    if (!name || !adapter) {
      throw new Error('[EmailProviderService] Provider name and adapter object are required');
    }
    this._providers.set(name.toUpperCase(), adapter);
  }

  /**
   * Set the active email provider.
   * @param {string} name - Provider identifier
   */
  setActiveProvider(name) {
    this._activeProviderName = (name || 'NONE').toUpperCase();
  }

  /**
   * Returns the current active email provider name.
   * @returns {string} Provider name or 'NONE'
   */
  getProviderName() {
    if (this._mockProvider) {
      return this._mockProvider.name || 'MOCK_EMAIL';
    }
    return this._activeProviderName;
  }

  /**
   * Check whether an active email provider is configured and ready.
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
   * Injects a mock provider for automated tests.
   * @param {Object} mock - Mock provider object
   */
  setMockProvider(mock) {
    this._mockProvider = mock;
  }

  /**
   * Resets mock provider.
   */
  resetMockProvider() {
    this._mockProvider = null;
  }

  /**
   * Send an emergency email via the active provider interface.
   *
   * @param {Object} options
   * @param {string} options.to - Recipient email address
   * @param {string} [options.toName] - Recipient name
   * @param {string} options.subject - Email subject
   * @param {string} options.text - Plain text body
   * @param {string} [options.html] - HTML body
   * @returns {Promise<Object>} Standardized outcome object
   */
  async sendEmail({ to, toName, subject, text, html }) {
    if (!to || typeof to !== 'string' || !to.includes('@')) {
      return {
        success: false,
        status: 'FAILED',
        deliveryStatus: 'FAILED',
        errorCode: 'INVALID_RECIPIENT_EMAIL',
        errorMessage: 'Recipient email address is invalid.'
      };
    }

    // Direct routing to mock provider if present
    if (this._mockProvider) {
      if (typeof this._mockProvider.sendEmail === 'function') {
        return await this._mockProvider.sendEmail({ to, toName, subject, text, html });
      }
    }

    // Honest NOT_CONFIGURED reporting when no provider is active
    if (!this.isConfigured()) {
      console.warn(`[EmailProviderService] Email to ${to} skipped: No active email provider configured.`);
      return {
        success: false,
        status: 'NOT_CONFIGURED',
        deliveryStatus: 'FAILED',
        errorCode: 'EMAIL_PROVIDER_NOT_CONFIGURED',
        errorMessage: `Email provider '${this.getProviderName()}' is not configured in the active environment.`
      };
    }

    const adapter = this._providers.get(this._activeProviderName);
    try {
      return await adapter.sendEmail({ to, toName, subject, text, html });
    } catch (err) {
      console.error(`[EmailProviderService] Dispatch exception to ${to}:`, err.message);
      return {
        success: false,
        status: 'FAILED',
        deliveryStatus: 'FAILED',
        errorCode: err.code || 'PROVIDER_DISPATCH_ERROR',
        errorMessage: err.message || 'Email provider dispatch failed'
      };
    }
  }

  /**
   * Retrieve asynchronous delivery status from provider if supported.
   *
   * @param {string} operationId - Provider operation or message ID
   * @param {string} [operationLocation] - Optional provider status resource URL
   * @returns {Promise<Object>}
   */
  async getEmailStatus(operationId, operationLocation = null) {
    if (this._mockProvider && typeof this._mockProvider.getEmailStatus === 'function') {
      return await this._mockProvider.getEmailStatus(operationId, operationLocation);
    }

    if (!this.isConfigured()) {
      return {
        success: false,
        errorCode: 'EMAIL_PROVIDER_NOT_CONFIGURED',
        errorMessage: 'Email provider is not configured.'
      };
    }

    const adapter = this._providers.get(this._activeProviderName);
    if (adapter && typeof adapter.getEmailStatus === 'function') {
      return await adapter.getEmailStatus(operationId, operationLocation);
    }

    return {
      success: false,
      errorCode: 'STATUS_POLLING_NOT_SUPPORTED',
      errorMessage: `Active email provider '${this.getProviderName()}' does not support operation polling.`
    };
  }
}

module.exports = new EmailProviderService();

