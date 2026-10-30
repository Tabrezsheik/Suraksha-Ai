from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class SignalInput(BaseModel):
    type: str = Field(..., description="Type of risk signal")
    value: bool = Field(True, description="Whether signal is active")
    points: Optional[int] = Field(None, description="Optional override points")

class RiskAssessmentRequest(BaseModel):
    emergencyId: Optional[str] = Field(None, description="Associated emergency ID")
    signals: List[SignalInput] = Field(default_factory=list, description="Active risk signals")
    triggerType: Optional[str] = Field("manual", description="Trigger type")

class SignalResult(BaseModel):
    type: str
    points: int
    description: Optional[str] = None

class RiskAssessmentResponse(BaseModel):
    score: int = Field(..., ge=0, le=100, description="Risk score from 0 to 100")
    level: str = Field(..., description="Risk level: low, medium, high, critical")
    signals: List[SignalResult] = Field(default_factory=list, description="Evaluated signal breakdown")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
