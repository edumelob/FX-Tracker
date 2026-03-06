"""
Test suite for FX Tracker backend.
Covers: rate service logic, alert service CRUD + evaluation, and API endpoints.
Run with: pytest
"""

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient

from app.core.exceptions import (
    AlertLimitExceededError,
    AlertNotFoundError,
    UnsupportedCurrencyError,
)
from app.main import app
from app.models.alert import AlertCreate, AlertDirection, AlertStatus, AlertUpdate
from app.services import alert_service, rate_service

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def clear_alerts():
    """Ensure alert store is empty before each test."""
    alert_service.clear_all_alerts()
    yield
    alert_service.clear_all_alerts()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def sample_alert_payload() -> AlertCreate:
    return AlertCreate(
        base_currency="USD",
        target_currency="EUR",
        target_rate=0.95,
        direction=AlertDirection.ABOVE,
        label="EUR spike alert",
    )


# ---------------------------------------------------------------------------
# Rate Service Tests
# ---------------------------------------------------------------------------

class TestRateServiceMock:
    """Tests for the rate service mock fallback (no API key needed)."""

    @pytest.mark.asyncio
    async def test_get_rates_returns_all_supported_currencies(self):
        response = await rate_service.get_rates("USD")
        assert response.base_currency == "USD"
        assert "EUR" in response.rates
        assert "JPY" in response.rates
        assert len(response.rates) > 0

    @pytest.mark.asyncio
    async def test_usd_to_usd_rate_is_one(self):
        response = await rate_service.get_rates("USD")
        assert response.rates["USD"] == pytest.approx(1.0)

    @pytest.mark.asyncio
    async def test_rates_are_positive(self):
        response = await rate_service.get_rates("EUR")
        for currency, rate in response.rates.items():
            assert rate > 0, f"Rate for {currency} should be positive"

    @pytest.mark.asyncio
    async def test_unsupported_currency_raises_error(self):
        with pytest.raises(UnsupportedCurrencyError) as exc_info:
            await rate_service.get_rates("XYZ")
        assert "XYZ" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_convert_currency_produces_correct_amount(self):
        result = await rate_service.convert_currency("USD", "EUR", 100.0)
        assert result.from_currency == "USD"
        assert result.to_currency == "EUR"
        assert result.original_amount == 100.0
        assert result.converted_amount == pytest.approx(100.0 * result.rate, rel=1e-4)

    @pytest.mark.asyncio
    async def test_convert_unsupported_currency_raises(self):
        with pytest.raises(UnsupportedCurrencyError):
            await rate_service.convert_currency("USD", "FAKE", 50.0)

    def test_get_rate_for_pair_returns_float(self):
        rate = rate_service.get_rate_for_pair("USD", "EUR")
        assert isinstance(rate, float)
        assert rate > 0

    def test_cross_rates_are_consistent(self):
        """USD→EUR then EUR→USD should approximately equal 1."""
        usd_to_eur = rate_service.get_rate_for_pair("USD", "EUR")
        eur_to_usd = rate_service.get_rate_for_pair("EUR", "USD")
        assert usd_to_eur * eur_to_usd == pytest.approx(1.0, rel=1e-3)


# ---------------------------------------------------------------------------
# Alert Service Tests
# ---------------------------------------------------------------------------

class TestAlertServiceCRUD:

    def test_create_alert_returns_alert_with_id(self, sample_alert_payload):
        alert = alert_service.create_alert(sample_alert_payload)
        assert alert.id is not None
        assert alert.status == AlertStatus.ACTIVE
        assert alert.base_currency == "USD"
        assert alert.target_currency == "EUR"

    def test_list_alerts_returns_created_alerts(self, sample_alert_payload):
        alert_service.create_alert(sample_alert_payload)
        alerts = alert_service.list_alerts()
        assert len(alerts) == 1

    def test_get_alert_by_id(self, sample_alert_payload):
        created = alert_service.create_alert(sample_alert_payload)
        fetched = alert_service.get_alert(created.id)
        assert fetched.id == created.id

    def test_get_nonexistent_alert_raises(self):
        with pytest.raises(AlertNotFoundError):
            alert_service.get_alert("nonexistent-id-000")

    def test_update_alert_target_rate(self, sample_alert_payload):
        created = alert_service.create_alert(sample_alert_payload)
        updated = alert_service.update_alert(created.id, AlertUpdate(target_rate=1.05))
        assert updated.target_rate == 1.05

    def test_cancel_alert_sets_status(self, sample_alert_payload):
        created = alert_service.create_alert(sample_alert_payload)
        cancelled = alert_service.cancel_alert(created.id)
        assert cancelled.status == AlertStatus.CANCELLED

    def test_filter_alerts_by_status(self, sample_alert_payload):
        created = alert_service.create_alert(sample_alert_payload)
        alert_service.cancel_alert(created.id)

        active = alert_service.list_alerts(status=AlertStatus.ACTIVE)
        cancelled = alert_service.list_alerts(status=AlertStatus.CANCELLED)

        assert len(active) == 0
        assert len(cancelled) == 1


class TestAlertEvaluation:

    def test_alert_triggered_above_threshold(self, sample_alert_payload):
        """Alert with direction=ABOVE triggers when current rate >= target."""
        alert = alert_service.create_alert(sample_alert_payload)  # target: 0.95, direction: ABOVE
        triggered = alert_service.evaluate_alerts("USD", {"EUR": 0.96})
        assert len(triggered) == 1
        assert triggered[0].id == alert.id
        assert triggered[0].status == AlertStatus.TRIGGERED
        assert triggered[0].triggered_at is not None

    def test_alert_not_triggered_below_threshold_for_above_direction(self, sample_alert_payload):
        alert_service.create_alert(sample_alert_payload)  # target: 0.95, direction: ABOVE
        triggered = alert_service.evaluate_alerts("USD", {"EUR": 0.90})
        assert len(triggered) == 0

    def test_alert_triggered_below_threshold(self):
        payload = AlertCreate(
            base_currency="USD",
            target_currency="JPY",
            target_rate=145.0,
            direction=AlertDirection.BELOW,
        )
        alert_service.create_alert(payload)
        triggered = alert_service.evaluate_alerts("USD", {"JPY": 144.5})
        assert len(triggered) == 1

    def test_already_triggered_alert_not_re_triggered(self, sample_alert_payload):
        alert = alert_service.create_alert(sample_alert_payload)
        # First evaluation triggers it
        alert_service.evaluate_alerts("USD", {"EUR": 0.96})
        # Second evaluation should NOT trigger again
        triggered_again = alert_service.evaluate_alerts("USD", {"EUR": 0.97})
        assert len(triggered_again) == 0

    def test_evaluation_ignores_different_base_currency(self, sample_alert_payload):
        """Alerts for USD/EUR should not evaluate when base is EUR."""
        alert_service.create_alert(sample_alert_payload)
        triggered = alert_service.evaluate_alerts("EUR", {"USD": 99.0})
        assert len(triggered) == 0


class TestAlertLimit:

    def test_exceeds_alert_limit_raises_error(self, sample_alert_payload, monkeypatch):
        monkeypatch.setattr("app.services.alert_service.settings.MAX_ALERTS_PER_USER", 2)
        alert_service.create_alert(sample_alert_payload)
        alert_service.create_alert(sample_alert_payload)
        with pytest.raises(AlertLimitExceededError):
            alert_service.create_alert(sample_alert_payload)


# ---------------------------------------------------------------------------
# API Integration Tests
# ---------------------------------------------------------------------------

class TestRatesAPI:

    def test_get_rates_endpoint(self, client):
        response = client.get("/api/v1/rates/?base=USD")
        assert response.status_code == 200
        data = response.json()
        assert data["base_currency"] == "USD"
        assert "EUR" in data["rates"]

    def test_get_rates_invalid_currency(self, client):
        response = client.get("/api/v1/rates/?base=INVALID")
        assert response.status_code == 400

    def test_supported_currencies_endpoint(self, client):
        response = client.get("/api/v1/rates/supported")
        assert response.status_code == 200
        currencies = response.json()
        assert "USD" in currencies
        assert "EUR" in currencies

    def test_convert_endpoint(self, client):
        response = client.get("/api/v1/rates/convert?from_currency=USD&to_currency=EUR&amount=100")
        assert response.status_code == 200
        data = response.json()
        assert data["from_currency"] == "USD"
        assert data["to_currency"] == "EUR"
        assert data["original_amount"] == 100.0
        assert data["converted_amount"] > 0

    def test_convert_negative_amount_rejected(self, client):
        response = client.get("/api/v1/rates/convert?from_currency=USD&to_currency=EUR&amount=-10")
        assert response.status_code == 422

    def test_health_check(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


class TestAlertsAPI:

    def test_create_alert(self, client):
        payload = {
            "base_currency": "USD",
            "target_currency": "EUR",
            "target_rate": 0.95,
            "direction": "above",
            "label": "Test alert",
        }
        response = client.post("/api/v1/alerts/", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["id"] is not None
        assert data["status"] == "active"

    def test_list_alerts(self, client):
        payload = {
            "base_currency": "USD",
            "target_currency": "GBP",
            "target_rate": 0.80,
            "direction": "below",
        }
        client.post("/api/v1/alerts/", json=payload)
        response = client.get("/api/v1/alerts/")
        assert response.status_code == 200
        assert len(response.json()) == 1

    def test_get_alert_not_found(self, client):
        response = client.get("/api/v1/alerts/nonexistent-999")
        assert response.status_code == 404

    def test_cancel_alert(self, client):
        payload = {
            "base_currency": "USD",
            "target_currency": "JPY",
            "target_rate": 150.0,
            "direction": "above",
        }
        created = client.post("/api/v1/alerts/", json=payload).json()
        response = client.delete(f"/api/v1/alerts/{created['id']}")
        assert response.status_code == 200
        assert response.json()["status"] == "cancelled"
