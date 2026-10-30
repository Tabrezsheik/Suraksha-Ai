import os
from fastapi import APIRouter, Header, HTTPException, status
from app.models.risk_schema import RiskAssessmentRequest, RiskAssessmentResponse
from app.services.risk_engine import evaluate_risk

router = APIRouter(prefix="/risk", tags=["Risk Assessment"])

@router.post("/assess", response_model=RiskAssessmentResponse)
def assess_risk(
    payload: RiskAssessmentRequest,
    x_internal_service_key: str = Header(None, alias="X-Internal-Service-Key")
):
    expected_secret = os.getenv("AI_SERVICE_SECRET")
    if expected_secret and x_internal_service_key != expected_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized internal AI service access"
        )

    return evaluate_risk(payload.signals, payload.triggerType or "manual")
