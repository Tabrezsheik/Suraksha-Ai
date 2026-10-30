/**
 * SURAKSHA AI — OpenAI Casual & General Knowledge Conversation Service
 * Server-side direct integration for non-retrieval / casual dialogue.
 * Strictly backend-only. Never exposes API keys.
 */

class OpenAIConversationService {
  constructor() {
    this.defaultModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.timeoutMs = 10000; // 10s timeout limit
  }

  /**
   * Generates a casual or general knowledge response using OpenAI's Chat Completions API.
   * Sends ONLY dialogue text — NO GPS, NO phone numbers, NO user credentials.
   *
   * @param {string} message - User message text
   * @param {Array} history - Previous conversation turn pairs [{ role: 'user'|'assistant', text: string }]
   * @returns {Promise<string>} Model response text
   */
  async getCasualResponse(message, history = []) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.warn('[OpenAIConversationService] OPENAI_API_KEY is not configured in local environment.');
      return "I am here to help! For general conversation, an OpenAI API key needs to be configured in the local server environment. How can I assist you with SURAKSHA AI safety features today?";
    }

    const systemPrompt = "You are SURAKSHA AI, a friendly, helpful, and concise AI assistant embedded in the SURAKSHA AI personal safety application. Provide clear, direct, polite, and helpful answers for casual conversation and general knowledge. Keep answers clear and concise.";

    // Transform history turns into standard OpenAI role messages
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    if (Array.isArray(history)) {
      const recentHistory = history.slice(-6); // Keep max last 6 messages
      for (const item of recentHistory) {
        if (item.sender === 'user' || item.role === 'user') {
          messages.push({ role: 'user', content: String(item.text || item.content || '') });
        } else if (item.sender === 'bot' || item.sender === 'assistant' || item.role === 'assistant') {
          messages.push({ role: 'assistant', content: String(item.text || item.content || '') });
        }
      }
    }

    messages.push({ role: 'user', content: String(message || '') });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || this.defaultModel,
          messages: messages,
          temperature: 0.7,
          max_tokens: 300
        }),
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[OpenAIConversationService] OpenAI API returned HTTP status ${response.status}`);
        return "I'm having trouble with general conversation right now. Please try again in a moment.";
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (content && typeof content === 'string' && content.trim().length > 0) {
        return content.trim();
      }

      return "I'm having trouble with general conversation right now. Please try again in a moment.";
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        console.error('[OpenAIConversationService] Request timed out after 10s.');
      } else {
        console.error('[OpenAIConversationService] API call failed:', err.message);
      }
      return "I'm having trouble with general conversation right now. Please try again in a moment.";
    }
  }
}

module.exports = new OpenAIConversationService();
