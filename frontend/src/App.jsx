/**
 * FX Tracker — Root Application Component
 * Composes all views: rate dashboard, converter, and alert manager.
 */

import { useState } from "react";
import { AlertForm } from "./components/AlertForm";
import { AlertList } from "./components/AlertList";
import { RateCard } from "./components/RateCard";
import { useAlerts } from "./hooks/useAlerts";
import { useExchangeRates } from "./hooks/useExchangeRates";
import { formatRelativeTime } from "./utils/formatters";

const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "BRL", "CAD", "AUD", "CHF", "CNY", "INR"];

export default function App() {
  const [activeTab, setActiveTab] = useState("rates"); // "rates" | "alerts"
  const [alertDefaults, setAlertDefaults] = useState({});

  const {
    rates,
    baseCurrency,
    timestamp,
    isLoading: ratesLoading,
    error: ratesError,
    setBaseCurrency,
    refresh,
  } = useExchangeRates("USD");

  const {
    alerts,
    isLoading: alertsLoading,
    createNewAlert,
    removeAlert,
  } = useAlerts();

  function handleAddAlert(currency, rate) {
    setAlertDefaults({ defaultTarget: currency, defaultRate: rate.toFixed(4) });
    setActiveTab("alerts");
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__brand">
          <span className="app-header__logo" aria-hidden="true">💱</span>
          <h1 className="app-header__title">FX Tracker</h1>
        </div>
        <p className="app-header__subtitle">
          Live exchange rates &amp; smart price alerts
        </p>
      </header>

      <nav className="app-tabs" role="tablist" aria-label="App sections">
        <button
          role="tab"
          aria-selected={activeTab === "rates"}
          className={`app-tabs__tab ${activeTab === "rates" ? "app-tabs__tab--active" : ""}`}
          onClick={() => setActiveTab("rates")}
        >
          📈 Rates
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "alerts"}
          className={`app-tabs__tab ${activeTab === "alerts" ? "app-tabs__tab--active" : ""}`}
          onClick={() => setActiveTab("alerts")}
        >
          🔔 Alerts{" "}
          {alerts.filter((a) => a.status === "active").length > 0 && (
            <span className="app-tabs__badge">
              {alerts.filter((a) => a.status === "active").length}
            </span>
          )}
        </button>
      </nav>

      <main className="app-content">
        {activeTab === "rates" && (
          <section className="rates-section" aria-label="Exchange rates">
            <div className="rates-section__controls">
              <label htmlFor="base-select" className="rates-section__label">
                Base currency:
              </label>
              <select
                id="base-select"
                value={baseCurrency}
                onChange={(e) => setBaseCurrency(e.target.value)}
                className="rates-section__select"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <button
                className="rates-section__refresh"
                onClick={refresh}
                disabled={ratesLoading}
                aria-label="Refresh rates"
              >
                {ratesLoading ? "⟳" : "↻"} Refresh
              </button>

              {timestamp && (
                <span className="rates-section__timestamp">
                  Updated {formatRelativeTime(timestamp)}
                </span>
              )}
            </div>

            {ratesError && (
              <div className="error-banner" role="alert">
                ⚠️ {ratesError}
              </div>
            )}

            {ratesLoading && !rates ? (
              <div className="loading-grid">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="rate-card rate-card--skeleton" aria-hidden="true" />
                ))}
              </div>
            ) : rates ? (
              <div className="rates-grid">
                {Object.entries(rates)
                  .filter(([code]) => code !== baseCurrency)
                  .map(([code, rate]) => (
                    <RateCard
                      key={code}
                      currency={code}
                      rate={rate}
                      baseCurrency={baseCurrency}
                      onAddAlert={handleAddAlert}
                    />
                  ))}
              </div>
            ) : null}
          </section>
        )}

        {activeTab === "alerts" && (
          <section className="alerts-section" aria-label="Price alerts">
            <AlertForm
              onSubmit={createNewAlert}
              defaultBase={alertDefaults.defaultBase || "USD"}
              defaultTarget={alertDefaults.defaultTarget || "EUR"}
              defaultRate={alertDefaults.defaultRate || ""}
            />

            <div className="alerts-section__list">
              <h3 className="alerts-section__list-title">Your Alerts</h3>
              <AlertList
                alerts={alerts}
                onCancel={removeAlert}
                isLoading={alertsLoading}
              />
            </div>
          </section>
        )}
      </main>

      <footer className="app-footer">
        <p>
          FX Tracker — Built with FastAPI + React · Rates via{" "}
          <a href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">
            ExchangeRate-API
          </a>
        </p>
      </footer>
    </div>
  );
}
