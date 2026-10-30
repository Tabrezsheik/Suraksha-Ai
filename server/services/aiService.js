/**
 * Internal AI Service Client (Phase 6 — AI Risk Detection)
 *
 * Communicates with the FastAPI AI Safety Engine (http://127.0.0.1:8000/risk/assess).
 * Includes 3000ms timeout guard and seamless local fallback to riskService.assessRisk.
 */

const riskService = require('./riskService');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
const AI_SERVICE_SECRET = process.env.AI_SERVICE_SECRET || '';
const TIMEOUT_MS = 3000;

/**
 * Assess dynamic risk by calling internal FastAPI service with local fallback guard
 */
const assessRisk = async (signals = [], triggerType = 'manual', emergencyId = null) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const headers = {
      'Content-Type': 'application/json'
    };

    if (AI_SERVICE_SECRET) {
      headers['X-Internal-Service-Key'] = AI_SERVICE_SECRET;
    }

    const response = await fetch(`${AI_SERVICE_URL}/risk/assess`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        emergencyId,
        signals,
        triggerType
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[aiService] FastAPI returned HTTP ${response.status}. Falling back to local riskService.`);
      return riskService.assessRisk(signals, triggerType);
    }

    const data = await response.json();
    return {
      score: data.score,
      level: data.level,
      signals: data.signals || [],
      source: 'fastapi'
    };

  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn(`[aiService] FastAPI request timed out after ${TIMEOUT_MS}ms. Falling back to local riskService.`);
    } else {
      console.warn(`[aiService] FastAPI request failed (${err.message}). Falling back to local riskService.`);
    }
    const fallbackResult = riskService.assessRisk(signals, triggerType);
    return {
      ...fallbackResult,
      source: 'rule_engine_fallback'
    };
  }
};

module.exports = {
  assessRisk
};
