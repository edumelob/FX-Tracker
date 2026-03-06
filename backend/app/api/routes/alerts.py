"""
API routes for managing price alerts.
"""

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query

from app.core.exceptions import AlertLimitExceededError, AlertNotFoundError
from app.models.alert import Alert, AlertCreate, AlertStatus, AlertUpdate
from app.services import alert_service

router = APIRouter()


@router.post("/", response_model=Alert, status_code=201)
async def create_alert(payload: AlertCreate) -> Alert:
    """
    Create a new price alert.
    The alert will fire when the exchange rate crosses the specified target
    in the given direction (above/below).
    """
    try:
        return alert_service.create_alert(payload)
    except AlertLimitExceededError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc


@router.get("/", response_model=List[Alert])
async def list_alerts(
    status: Optional[AlertStatus] = Query(
        default=None, description="Filter by alert status."
    ),
) -> List[Alert]:
    """Return all alerts, with an optional status filter."""
    return alert_service.list_alerts(status=status)


@router.get("/{alert_id}", response_model=Alert)
async def get_alert(alert_id: str) -> Alert:
    """Return a single alert by its ID."""
    try:
        return alert_service.get_alert(alert_id)
    except AlertNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.patch("/{alert_id}", response_model=Alert)
async def update_alert(alert_id: str, payload: AlertUpdate) -> Alert:
    """Partially update an alert (rate, direction, label, or status)."""
    try:
        return alert_service.update_alert(alert_id, payload)
    except AlertNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/{alert_id}", response_model=Alert)
async def cancel_alert(alert_id: str) -> Alert:
    """Cancel an active alert."""
    try:
        return alert_service.cancel_alert(alert_id)
    except AlertNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
