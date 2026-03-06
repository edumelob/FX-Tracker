"""
FX Tracker - Currency Exchange Rate Tracker & Alert System
Main FastAPI application entry point.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import alerts, rates
from app.core.config import settings

app = FastAPI(
    title="FX Tracker API",
    description="Track live currency exchange rates and manage price alerts.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rates.router, prefix="/api/v1/rates", tags=["Exchange Rates"])
app.include_router(alerts.router, prefix="/api/v1/alerts", tags=["Alerts"])


@app.get("/health", tags=["Health"])
async def health_check() -> dict:
    """Return service health status."""
    return {"status": "ok", "service": "fx-tracker-api"}
