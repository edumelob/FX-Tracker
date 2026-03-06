"""
Pydantic models for price alert data.
Alerts notify users when a currency pair crosses a target rate.
"""

import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class AlertDirection(str, Enum):
    """Direction that triggers an alert."""

    ABOVE = "above"   # Trigger when rate goes above target
    BELOW = "below"   # Trigger when rate goes below target


class AlertStatus(str, Enum):
    """Lifecycle status of an alert."""

    ACTIVE = "active"
    TRIGGERED = "triggered"
    CANCELLED = "cancelled"


class AlertCreate(BaseModel):
    """Payload required to create a new price alert."""

    base_currency: str = Field(..., min_length=3, max_length=3)
    target_currency: str = Field(..., min_length=3, max_length=3)
    target_rate: float = Field(..., gt=0, description="Rate that triggers the alert.")
    direction: AlertDirection = Field(
        ..., description="Trigger when rate goes ABOVE or BELOW target."
    )
    label: Optional[str] = Field(None, max_length=100, description="Optional user note.")

    @field_validator("base_currency", "target_currency", mode="before")
    @classmethod
    def normalize(cls, value: str) -> str:
        return value.strip().upper()


class Alert(AlertCreate):
    """Full alert object stored in the system."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: AlertStatus = AlertStatus.ACTIVE
    created_at: datetime = Field(default_factory=datetime.utcnow)
    triggered_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AlertUpdate(BaseModel):
    """Fields that can be updated on an existing alert."""

    target_rate: Optional[float] = Field(None, gt=0)
    direction: Optional[AlertDirection] = None
    label: Optional[str] = Field(None, max_length=100)
    status: Optional[AlertStatus] = None
