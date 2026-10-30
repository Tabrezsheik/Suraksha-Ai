/**
 * SURAKSHA AI — OpenRouter Conversational & Educational AI Service
 * 
 * Server-side integration with the official OpenRouter API:
 * https://openrouter.ai/api/v1/chat/completions
 * 
 * Strictly backend-only. Never exposes API keys to frontend or logs.
 */

class OpenRouterService {
  constructor() {
    this.defaultBaseUrl = 'https://openrouter.ai/api/v1';
    this.defaultModel = 'openrouter/free';
    this.timeoutMs = 15000; // 15 seconds
    this.maxInputLength = 4000;
    this.defaultMaxTokens = 1000;
    this.mockHandler = null; // For automated unit testing without consuming live credits
  }

  /**
   * Sets a mock handler for testing
   * @param {Function|null} handler - (params) => Promise<{ content: string, model: string, usage: object }>
   */
  setMockHandler(handler) {
    this.mockHandler = handler;
  }

  /**
   * Resets mock handler
   */
  resetMockHandler() {
    this.mockHandler = null;
  }

  /**
   * Returns whether OpenRouter is configured in environment
   * @returns {boolean}
   */
  isConfigured() {
    const key = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY;
    return Boolean(key && typeof key === 'string' && key.trim().length > 0 && !key.includes('your_openrouter_api_key'));
  }

  /**
   * Gets current configured model
   * @returns {string}
   */
  getModel() {
    return process.env.OPENROUTER_MODEL || this.defaultModel;
  }

  /**
   * Gets base URL
   * @returns {string}
   */
  getBaseUrl() {
    const url = process.env.OPENROUTER_BASE_URL || this.defaultBaseUrl;
    return url.replace(/\/+$/, '');
  }

  /**
   * Generates chat completion using OpenRouter
   * 
   * @param {Object} options
   * @param {Array<{role: string, content: string}>} options.messages - Dialogue messages
   * @param {string} [options.systemPrompt] - Optional system instructions
   * @param {string} [options.model] - Optional model override
   * @param {number} [options.maxTokens] - Max tokens
   * @param {number} [options.temperature] - Sampling temperature
   * @returns {Promise<{ success: boolean, content?: string, model?: string, usage?: object, error?: string, errorCode?: string }>}
   */
  async generateCompletion({ messages, systemPrompt, model, maxTokens, temperature = 0.7 }) {
    // Check mock handler first (for isolated automated testing)
    if (this.mockHandler) {
      try {
        const mockResult = await this.mockHandler({ messages, systemPrompt, model, maxTokens, temperature });
        return {
          success: true,
          content: mockResult.content,
          model: mockResult.model || this.getModel(),
          usage: mockResult.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          provider: 'openrouter-mock'
        };
      } catch (mockErr) {
        return {
          success: false,
          error: mockErr.message || 'Mock OpenRouter error',
          errorCode: mockErr.code || 'MOCK_ERROR',
          provider: 'openrouter-mock'
        };
      }
    }

    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'OpenRouter API key is not configured in the server environment.',
        errorCode: 'CONFIG_MISSING',
        provider: 'openrouter'
      };
    }

    const apiKey = (process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY || '').trim();
    const targetModel = model || this.getModel();
    const targetMaxTokens = maxTokens || this.defaultMaxTokens;
    const endpoint = `${this.getBaseUrl()}/chat/completions`;

    // Construct request messages
    const formattedMessages = [];
    if (systemPrompt && typeof systemPrompt === 'string' && systemPrompt.trim().length > 0) {
      formattedMessages.push({
        role: 'system',
        content: systemPrompt.trim().slice(0, this.maxInputLength)
      });
    }

    if (Array.isArray(messages)) {
      for (const m of messages) {
        if (!m || !m.content) continue;
        const role = m.role === 'assistant' ? 'assistant' : (m.role === 'system' ? 'system' : 'user');
        const text = String(m.content || '').slice(0, this.maxInputLength);
        if (text.length > 0) {
          formattedMessages.push({ role, content: text });
        }
      }
    }

    if (formattedMessages.length === 0) {
      return {
        success: false,
        error: 'No valid messages provided for completion',
        errorCode: 'INVALID_INPUT',
        provider: 'openrouter'
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://suraksha.ai',
          'X-Title': 'SURAKSHA AI Legal & Safety Assistant'
        },
        body: JSON.stringify({
          model: targetModel,
          messages: formattedMessages,
          max_tokens: targetMaxTokens,
          temperature: temperature
        }),
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!response.ok) {
        const status = response.status;
        let errorDetail = `OpenRouter HTTP error ${status}`;
        let errorCode = 'PROVIDER_ERROR';

        try {
          const errJson = await response.json();
          if (errJson?.error?.message) {
            errorDetail = errJson.error.message;
          }
        } catch (_) {
          // ignore json parse error
        }

        if (status === 401) {
          errorCode = 'AUTHENTICATION_FAILED';
          errorDetail = 'Invalid or expired OpenRouter credentials.';
        } else if (status === 402) {
          errorCode = 'INSUFFICIENT_CREDITS';
          errorDetail = 'OpenRouter account has insufficient credits.';
        } else if (status === 429) {
          errorCode = 'RATE_LIMIT_EXCEEDED';
          errorDetail = 'OpenRouter rate limit reached. Please retry in a few moments.';
        } else if (status === 503 || status === 502 || status === 404 || errorDetail.includes('unavailable')) {
          errorCode = 'MODEL_UNAVAILABLE';
          errorDetail = `Selected model '${targetModel}' is currently unavailable on OpenRouter.`;

          // Graceful fallback to default free router model if specific model failed
          if (targetModel !== 'openrouter/free') {
            console.warn(`[OpenRouterService] Model '${targetModel}' unavailable. Retrying with 'openrouter/free'...`);
            return this.generateCompletion({ messages, systemPrompt, model: 'openrouter/free', maxTokens, temperature });
          }
        }

        return {
          success: false,
          error: errorDetail,
          errorCode: errorCode,
          status: status,
          provider: 'openrouter'
        };
      }

      const data = await response.json();
      const choice = data?.choices?.[0];
      const content = choice?.message?.content;

      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return {
          success: false,
          error: `OpenRouter returned an empty or malformed completion choice: ${JSON.stringify(data).slice(0, 200)}`,
          errorCode: 'MALFORMED_RESPONSE',
          provider: 'openrouter'
        };
      }

      return {
        success: true,
        content: content.trim(),
        model: data?.model || targetModel,
        usage: data?.usage || {},
        finishReason: choice?.finish_reason || 'stop',
        provider: 'openrouter'
      };
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        return {
          success: false,
          error: `OpenRouter request timed out after ${this.timeoutMs / 1000}s.`,
          errorCode: 'TIMEOUT',
          provider: 'openrouter'
        };
      }

      return {
        success: false,
        error: `Network error connecting to OpenRouter: ${err.message}${err.cause ? ` (${err.cause.code || err.cause.message})` : ''}`,
        errorCode: 'NETWORK_ERROR',
        provider: 'openrouter'
      };
    }
  }
}

module.exports = new OpenRouterService();

