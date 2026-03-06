"""
Pydantic models for exchange rate data.
These models serve as both validation schemas and API response shapes.
"""

from datetime import datetime
from typing import Dict

from pydantic import BaseModel, Field, field_validator


class ExchangeRate(BaseModel):
    """Represents a single currency exchange rate pair."""

    base_currency: str = Field(..., description="The base currency code (e.g. USD).")
    target_currency: str = Field(..., description="The target currency code (e.g. EUR).")
    rate: float = Field(..., gt=0, description="Exchange rate (base → target).")
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("base_currency", "target_currency", mode="before")
    @classmethod
    def normalize_currency_code(cls, value: str) -> str:
        """Ensure currency codes are always uppercase."""
        return value.strip().upper()


class RatesResponse(BaseModel):
    """Response payload containing all rates for a given base currency."""

    base_currency: str
    rates: Dict[str, float] = Field(
        ..., description="Map of target currency code to exchange rate."
    )
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("base_currency", mode="before")
    @classmethod
    def normalize_base(cls, value: str) -> str:
        return value.strip().upper()


class ConversionRequest(BaseModel):
    """Request payload for a currency conversion calculation."""

    from_currency: str = Field(..., min_length=3, max_length=3)
    to_currency: str = Field(..., min_length=3, max_length=3)
    amount: float = Field(..., gt=0, description="Amount to convert (must be > 0).")

    @field_validator("from_currency", "to_currency", mode="before")
    @classmethod
    def normalize(cls, value: str) -> str:
        return value.strip().upper()


class ConversionResult(BaseModel):
    """Result of a currency conversion."""

    from_currency: str
    to_currency: str
    original_amount: float
    converted_amount: float
    rate: float
    timestamp: datetime
