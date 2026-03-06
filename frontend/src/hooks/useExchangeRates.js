/**
 * Custom hook: useExchangeRates
 * Encapsulates all data-fetching logic for exchange rates, keeping
 * components clean and free of async/error-handling boilerplate.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchRates } from "../utils/api";

const DEFAULT_REFRESH_INTERVAL_MS = 30_000; // 30 seconds

/**
 * @typedef {Object} UseExchangeRatesResult
 * @property {Record<string,number>|null} rates - Map of currency → rate.
 * @property {string|null} baseCurrency - Currently selected base currency.
 * @property {string|null} timestamp - ISO timestamp of the last successful fetch.
 * @property {boolean} isLoading - True while a fetch is in progress.
 * @property {string|null} error - Error message, or null if last fetch succeeded.
 * @property {function(string):void} setBaseCurrency - Change the base currency.
 * @property {function():void} refresh - Manually trigger a refresh.
 */

/**
 * Fetch and auto-refresh exchange rates for a given base currency.
 *
 * @param {string} [initialBase="USD"] - Starting base currency code.
 * @param {number} [refreshIntervalMs] - Auto-refresh interval in ms.
 * @returns {UseExchangeRatesResult}
 */
export function useExchangeRates(
  initialBase = "USD",
  refreshIntervalMs = DEFAULT_REFRESH_INTERVAL_MS
) {
  const [baseCurrency, setBaseCurrency] = useState(initialBase);
  const [rates, setRates] = useState(null);
  const [timestamp, setTimestamp] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Use a ref for the interval so it doesn't re-create on every render
  const intervalRef = useRef(null);

  const loadRates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchRates(baseCurrency);
      setRates(data.rates);
      setTimestamp(data.timestamp);
    } catch (err) {
      setError(err.message || "Failed to load exchange rates.");
    } finally {
      setIsLoading(false);
    }
  }, [baseCurrency]);

  useEffect(() => {
    loadRates();

    intervalRef.current = setInterval(loadRates, refreshIntervalMs);

    return () => {
      clearInterval(intervalRef.current);
    };
  }, [loadRates, refreshIntervalMs]);

  return {
    rates,
    baseCurrency,
    timestamp,
    isLoading,
    error,
    setBaseCurrency,
    refresh: loadRates,
  };
}
