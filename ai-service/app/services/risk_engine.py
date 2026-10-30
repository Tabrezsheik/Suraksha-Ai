"""
Transparent Rule-Based AI Risk Engine (Phase 6 — AI Risk Detection)

Calculates explainable risk scores (0–100) and maps them to standard risk level bands:
- 0–30: low
- 31–60: medium
- 61–80: high
- 81–100: critical

Enforces point deduplication per signal type.
"""

from typing import List, Dict, Any
from app.models.risk_schema import SignalInput, SignalResult, RiskAssessmentResponse

SIGNAL_WEIGHTS: Dict[str, int] = {
    "distress_keyword": 30,
    "voice_stress": 25,
    "high_risk_location": 20,
    "route_deviation": 15,
    "suspicious_stoppage": 10
}

SIGNAL_DESCRIPTIONS: Dict[str, str] = {
    "distress_keyword": "Distress keyword detected",
    "voice_stress": "Voice stress integration signal detected",
    "high_risk_location": "High-risk safety zone proximity detected",
    "route_deviation": "Route deviation anomaly detected",
    "suspicious_stoppage": "Suspicious stoppage anomaly detected"
}

def calculate_risk_level(score: int) -> str:
    if score >= 81:
        return "critical"
    elif score >= 61:
        return "high"
    elif score >= 31:
        return "medium"
    return "low"

def evaluate_risk(signals: List[SignalInput], trigger_type: str = "manual") -> RiskAssessmentResponse:
    evaluated_signals: List[SignalResult] = []
    seen_types = set()
    total_score = 0

    for signal in signals:
        if not signal.value:
            continue

        sig_type = signal.type.strip().lower()
        if sig_type in seen_types:
            # Signal deduplication: each signal type contributes points at most once
            continue

        seen_types.add(sig_type)

        points = signal.points if signal.points is not None else SIGNAL_WEIGHTS.get(sig_type, 0)
        if points > 0:
            total_score += points
            description = SIGNAL_DESCRIPTIONS.get(sig_type, f"Active signal: {sig_type}")
            evaluated_signals.append(SignalResult(
                type=sig_type,
                points=points,
                description=description
            ))

    # Clamp total score between 0 and 100
    clamped_score = max(0, min(100, total_score))
    level = calculate_risk_level(clamped_score)

    return RiskAssessmentResponse(
        score=clamped_score,
        level=level,
        signals=evaluated_signals
    )
