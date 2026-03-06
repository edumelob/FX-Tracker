"""
Domain-specific exceptions for the FX Tracker application.
Using named exceptions makes error handling explicit and readable.
"""


class FXTrackerError(Exception):
    """Base exception for all FX Tracker errors."""


class UnsupportedCurrencyError(FXTrackerError):
    """Raised when a requested currency code is not supported."""

    def __init__(self, currency: str) -> None:
        self.currency = currency
        super().__init__(f"Currency '{currency}' is not supported.")


class RateFetchError(FXTrackerError):
    """Raised when fetching exchange rates from the external API fails."""

    def __init__(self, message: str) -> None:
        super().__init__(f"Failed to fetch exchange rates: {message}")


class AlertNotFoundError(FXTrackerError):
    """Raised when a requested alert does not exist."""

    def __init__(self, alert_id: str) -> None:
        self.alert_id = alert_id
        super().__init__(f"Alert with id '{alert_id}' not found.")


class AlertLimitExceededError(FXTrackerError):
    """Raised when a user exceeds the maximum number of allowed alerts."""

    def __init__(self, limit: int) -> None:
        self.limit = limit
        super().__init__(f"Alert limit of {limit} exceeded.")
