/**
 * Risk Assessment Service (Phase 6 — Rule-Based AI Risk Engine)
 *
 * Implements rule-based risk scoring per PRD.md §6.5, Architecture.md §8, and Database.md §8.
 * Maps input signals and trigger types to a 0–100 risk score and standard risk level band.
 * Provides 1:1 scoring parity between Node.js local fallback engine and FastAPI service.
 */

const SIGNAL_WEIGHTS = {
  distress_keyword: 30,
  voice_stress: 25,
  high_risk_location: 20,
  route_deviation: 15,
  suspicious_stoppage: 10
};

const SIGNAL_DESCRIPTIONS = {
  distress_keyword: 'Distress keyword detected',
  voice_stress: 'Voice stress integration signal detected',
  high_risk_location: 'High-risk safety zone proximity detected',
  route_deviation: 'Route deviation anomaly detected',
  suspicious_stoppage: 'Suspicious stoppage anomaly detected'
};

const getRiskLevel = (score) => {
  if (score >= 81) return 'critical';
  if (score >= 61) return 'high';
  if (score >= 31) return 'medium';
  return 'low';
};

/**
 * Phase 4 Baseline — Calculate Initial Risk Score & Level for Emergency Activation
 */
const calculateInitialRisk = (triggerType = 'manual', signals = []) => {
  let score = 30; // Base initial risk score for manual SOS activation

  if (triggerType === 'voice') {
    score += 10;
  }

  if (Array.isArray(signals)) {
    signals.forEach(signal => {
      switch (signal.type) {
        case 'distress_keyword':
          score += (signal.points || 30);
          break;
        case 'voice_stress':
          score += (signal.points || 25);
          break;
        case 'high_risk_location':
          score += (signal.points || 20);
          break;
        case 'route_deviation':
          score += (signal.points || 15);
          break;
        case 'suspicious_stoppage':
          score += (signal.points || 10);
          break;
        default:
          if (typeof signal.points === 'number') {
            score += signal.points;
          }
      }
    });
  }

  // Clamp score between 0 and 100
  const finalScore = Math.min(100, Math.max(0, score));
  const level = getRiskLevel(finalScore);

  return {
    score: finalScore,
    level
  };
};

/**
 * Phase 6 — Dynamic AI Risk Assessment & Fallback Scoring Engine
 *
 * Evaluates active signals, deduplicates by signal type, clamps score to [0, 100],
 * and assigns standard risk level band (low, medium, high, critical).
 */
const assessRisk = (signals = [], triggerType = 'manual') => {
  const evaluatedSignals = [];
  const seenTypes = new Set();
  let totalScore = 0;

  if (Array.isArray(signals)) {
    signals.forEach(signal => {
      const isValueTrue = signal.value !== false;
      if (!isValueTrue) return;

      const rawType = typeof signal.type === 'string' ? signal.type.trim().toLowerCase() : '';
      if (!rawType || seenTypes.has(rawType)) {
        // Signal deduplication: each signal type contributes points at most once
        return;
      }

      seenTypes.add(rawType);

      const points = typeof signal.points === 'number'
        ? signal.points
        : (SIGNAL_WEIGHTS[rawType] || 0);

      if (points > 0) {
        totalScore += points;
        evaluatedSignals.push({
          type: rawType,
          points,
          description: SIGNAL_DESCRIPTIONS[rawType] || `Active signal: ${rawType}`
        });
      }
    });
  }

  // Clamp total score between 0 and 100
  const clampedScore = Math.min(100, Math.max(0, totalScore));
  const level = getRiskLevel(clampedScore);

  return {
    score: clampedScore,
    level,
    signals: evaluatedSignals
  };
};

module.exports = {
  calculateInitialRisk,
  assessRisk,
  getRiskLevel,
  SIGNAL_WEIGHTS
};

