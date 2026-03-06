"""
API routes for exchange rate queries and currency conversion.
"""

from fastapi import APIRouter, HTTPException, Query

from app.core.config import settings
from app.core.exceptions import RateFetchError, UnsupportedCurrencyError
from app.models.rate import ConversionResult, RatesResponse
from app.services import rate_service

router = APIRouter()


@router.get("/", response_model=RatesResponse)
async def get_exchange_rates(
    base: str = Query(default="USD", description="Base currency code (e.g. USD, EUR)."),
) -> RatesResponse:
    """
    Return live exchange rates for all supported currencies
    relative to the specified base currency.
    """
    try:
        return await rate_service.get_rates(base.upper())
    except UnsupportedCurrencyError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RateFetchError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/supported", response_model=list[str])
async def list_supported_currencies() -> list[str]:
    """Return the list of currency codes supported by this API."""
    return settings.SUPPORTED_CURRENCIES


@router.get("/convert", response_model=ConversionResult)
async def convert(
    from_currency: str = Query(..., min_length=3, max_length=3),
    to_currency: str = Query(..., min_length=3, max_length=3),
    amount: float = Query(..., gt=0, description="Amount to convert."),
) -> ConversionResult:
    """Convert an amount from one currency to another."""
    try:
        return await rate_service.convert_currency(
            from_currency.upper(), to_currency.upper(), amount
        )
    except UnsupportedCurrencyError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RateFetchError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
