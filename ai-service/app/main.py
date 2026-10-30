from fastapi import FastAPI
from pydantic import BaseModel
from datetime import datetime
from app.routes.risk import router as risk_router

app = FastAPI(
    title="Suraksha AI - AI Safety Engine",
    description="Rule-based risk assessment and anomaly detection engine",
    version="1.0.0"
)

app.include_router(risk_router)

class HealthResponse(BaseModel):
    status: str
    service: str
    timestamp: datetime

@app.get("/", response_model=HealthResponse)
@app.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(
        status="ok",
        service="Suraksha AI - AI Safety Engine",
        timestamp=datetime.utcnow()
    )

