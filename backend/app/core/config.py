"""
Application configuration loaded from environment variables.
Uses Pydantic BaseSettings for type-safe config management.
"""

from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Central configuration for the FX Tracker API."""

    # API Keys
    EXCHANGE_RATE_API_KEY: str = "demo"

    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Alert thresholds
    MAX_ALERTS_PER_USER: int = 10
    ALERT_CHECK_INTERVAL_SECONDS: int = 300

    # Supported currencies
    SUPPORTED_CURRENCIES: List[str] = [
        "USD", "EUR", "GBP", "JPY", "BRL", "CAD", "AUD", "CHF", "CNY", "INR",
    ]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_origins(cls, value: str | List[str]) -> List[str]:
        """Allow ALLOWED_ORIGINS to be a comma-separated string in .env."""
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",")]
        return value

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    """Return cached settings instance (singleton pattern)."""
    return Settings()


settings = get_settings()
