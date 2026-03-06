"""
Exchange rate service.
Fetches live rates from an external API with a deterministic mock fallback
so the app works without a real API key during development and testing.
"""

import logging
from datetime import datetime
from typing import Dict, Optional

import httpx

from app.core.config import settings
from app.core.exceptions import RateFetchError, UnsupportedCurrencyError
from app.models.rate import ConversionResult, RatesResponse

logger = logging.getLogger(__name__)

# Realistic mock rates relative to USD for offline/demo use
_MOCK_RATES_VS_USD: Dict[str, float] = {
    "USD": 1.0,
    "EUR": 0.9201,
    "GBP": 0.7843,
    "JPY": 149.72,
    "BRL": 5.0312,
    "CAD": 1.3641,
    "AUD": 1.5287,
    "CHF": 0.8812,
    "CNY": 7.2341,
    "INR": 83.12,
}

BASE_API_URL = "https://v6.exchangerate-api.com/v6"


def _is_demo_key() -> bool:
    """Return True when the configured API key is the placeholder value."""
    return settings.EXCHANGE_RATE_API_KEY in ("demo", "your_api_key_here", "")


def _validate_currency(currency: str) -> None:
    """Raise UnsupportedCurrencyError if the currency code is not allowed."""
    if currency not in settings.SUPPORTED_CURRENCIES:
        raise UnsupportedCurrencyError(currency)


def _get_mock_rates(base_currency: str) -> Dict[str, float]:
    """
    Calculate mock rates for all supported currencies relative to base_currency.
    Cross-rate formula: target/base = (target/USD) / (base/USD).
    """
    base_vs_usd = _MOCK_RATES_VS_USD[base_currency]
    return {
        currency: round(rate_vs_usd / base_vs_usd, 6)
        for currency, rate_vs_usd in _MOCK_RATES_VS_USD.items()
        if currency in settings.SUPPORTED_CURRENCIES
    }


async def get_rates(base_currency: str) -> RatesResponse:
    """
    Return exchange rates for all supported currencies relative to base_currency.
    Falls back to deterministic mock data when using the demo API key.
    """
    _validate_currency(base_currency)

    if _is_demo_key():
        logger.info("Demo mode: returning mock rates for %s", base_currency)
        return RatesResponse(
            base_currency=base_currency,
            rates=_get_mock_rates(base_currency),
            timestamp=datetime.utcnow(),
        )

    url = f"{BASE_API_URL}/{settings.EXCHANGE_RATE_API_KEY}/latest/{base_currency}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as exc:
        raise RateFetchError(str(exc)) from exc

    if data.get("result") != "success":
        raise RateFetchError(data.get("error-type", "unknown error"))

    filtered_rates = {
        currency: rate
        for currency, rate in data["conversion_rates"].items()
        if currency in settings.SUPPORTED_CURRENCIES
    }

    return RatesResponse(
        base_currency=base_currency,
        rates=filtered_rates,
        timestamp=datetime.utcnow(),
    )


async def convert_currency(
    from_currency: str,
    to_currency: str,
    amount: float,
) -> ConversionResult:
    """
    Convert an amount from one currency to another.
    Reuses get_rates to avoid duplicating API call logic.
    """
    _validate_currency(from_currency)
    _validate_currency(to_currency)

    rates_response = await get_rates(from_currency)

    rate = rates_response.rates.get(to_currency)
    if rate is None:
        raise RateFetchError(f"Rate for {to_currency} not found in response.")

    return ConversionResult(
        from_currency=from_currency,
        to_currency=to_currency,
        original_amount=amount,
        converted_amount=round(amount * rate, 6),
        rate=rate,
        timestamp=rates_response.timestamp,
    )


def get_rate_for_pair(
    base: str,
    target: str,
    rates_map: Optional[Dict[str, float]] = None,
) -> float:
    """
    Synchronous helper to look up a specific rate from a pre-fetched rates map.
    Useful for alert evaluation without triggering a new API call.
    """
    if rates_map is None:
        rates_map = _get_mock_rates(base)
    rate = rates_map.get(target)
    if rate is None:
        raise RateFetchError(f"No rate found for {base}/{target}.")
    return rate
