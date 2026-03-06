"""
Alert management service.
Uses an in-memory store for simplicity; swap with a database adapter
(e.g. SQLAlchemy + PostgreSQL) without changing the service interface.
"""

import logging
from datetime import datetime
from typing import Dict, List, Optional

from app.core.config import settings
from app.core.exceptions import AlertLimitExceededError, AlertNotFoundError
from app.models.alert import Alert, AlertCreate, AlertDirection, AlertStatus, AlertUpdate

logger = logging.getLogger(__name__)

# In-memory store: maps alert_id -> Alert
_store: Dict[str, Alert] = {}


def _get_active_count() -> int:
    """Return the number of currently active alerts."""
    return sum(1 for a in _store.values() if a.status == AlertStatus.ACTIVE)


def create_alert(payload: AlertCreate) -> Alert:
    """
    Persist a new alert after validating the active alert limit.
    Raises AlertLimitExceededError if the limit is reached.
    """
    if _get_active_count() >= settings.MAX_ALERTS_PER_USER:
        raise AlertLimitExceededError(settings.MAX_ALERTS_PER_USER)

    alert = Alert(**payload.model_dump())
    _store[alert.id] = alert
    logger.info("Created alert %s (%s/%s @ %s)", alert.id, alert.base_currency, alert.target_currency, alert.target_rate)
    return alert


def list_alerts(status: Optional[AlertStatus] = None) -> List[Alert]:
    """
    Return all alerts, optionally filtered by status.
    Results are sorted by creation date (newest first).
    """
    alerts = list(_store.values())
    if status is not None:
        alerts = [a for a in alerts if a.status == status]
    return sorted(alerts, key=lambda a: a.created_at, reverse=True)


def get_alert(alert_id: str) -> Alert:
    """Return a single alert by ID, raising AlertNotFoundError if absent."""
    alert = _store.get(alert_id)
    if alert is None:
        raise AlertNotFoundError(alert_id)
    return alert


def update_alert(alert_id: str, payload: AlertUpdate) -> Alert:
    """Apply a partial update to an existing alert."""
    alert = get_alert(alert_id)
    update_data = payload.model_dump(exclude_unset=True)
    updated = alert.model_copy(update=update_data)
    _store[alert_id] = updated
    logger.info("Updated alert %s: %s", alert_id, update_data)
    return updated


def cancel_alert(alert_id: str) -> Alert:
    """Set an alert status to CANCELLED."""
    return update_alert(alert_id, AlertUpdate(status=AlertStatus.CANCELLED))


def evaluate_alerts(base_currency: str, current_rates: Dict[str, float]) -> List[Alert]:
    """
    Check all active alerts for the given base currency against current rates.
    Marks triggered alerts and returns the list of newly-triggered ones.

    Args:
        base_currency: The base currency for which rates are provided.
        current_rates: Map of target_currency -> current rate.

    Returns:
        List of alerts that were triggered in this evaluation pass.
    """
    triggered: List[Alert] = []

    for alert in list(_store.values()):
        if alert.status != AlertStatus.ACTIVE:
            continue
        if alert.base_currency != base_currency:
            continue

        current_rate = current_rates.get(alert.target_currency)
        if current_rate is None:
            continue

        should_trigger = (
            alert.direction == AlertDirection.ABOVE and current_rate >= alert.target_rate
        ) or (
            alert.direction == AlertDirection.BELOW and current_rate <= alert.target_rate
        )

        if should_trigger:
            updated = alert.model_copy(
                update={
                    "status": AlertStatus.TRIGGERED,
                    "triggered_at": datetime.utcnow(),
                }
            )
            _store[alert.id] = updated
            triggered.append(updated)
            logger.info(
                "Alert %s triggered: %s/%s rate %.4f %s %.4f",
                alert.id,
                alert.base_currency,
                alert.target_currency,
                current_rate,
                alert.direction.value,
                alert.target_rate,
            )

    return triggered


def clear_all_alerts() -> None:
    """Remove all alerts. Useful for test isolation."""
    _store.clear()
