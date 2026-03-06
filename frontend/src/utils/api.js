/**
 * FX Tracker API client.
 * All network calls are centralized here so the rest of the app
 * never deals with raw fetch/URL construction.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

/**
 * Generic request helper with consistent error handling.
 * Throws a descriptive Error on non-2xx responses.
 *
 * @param {string} path - API path relative to BASE_URL.
 * @param {RequestInit} [options] - fetch options.
 * @returns {Promise<any>} Parsed JSON response.
 */
async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;

  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody?.detail || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(message);
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// Rates
// ---------------------------------------------------------------------------

/**
 * Fetch exchange rates for all supported currencies.
 * @param {string} baseCurrency - Base currency code (e.g. "USD").
 * @returns {Promise<{base_currency: string, rates: Record<string,number>, timestamp: string}>}
 */
export async function fetchRates(baseCurrency = "USD") {
  return request(`/rates/?base=${encodeURIComponent(baseCurrency)}`);
}

/**
 * Fetch all supported currency codes.
 * @returns {Promise<string[]>}
 */
export async function fetchSupportedCurrencies() {
  return request("/rates/supported");
}

/**
 * Convert an amount between two currencies.
 * @param {string} from - Source currency code.
 * @param {string} to - Target currency code.
 * @param {number} amount - Amount to convert.
 * @returns {Promise<{from_currency:string, to_currency:string, converted_amount:number, rate:number, timestamp:string}>}
 */
export async function convertCurrency(from, to, amount) {
  const params = new URLSearchParams({ from_currency: from, to_currency: to, amount });
  return request(`/rates/convert?${params}`);
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} AlertPayload
 * @property {string} base_currency
 * @property {string} target_currency
 * @property {number} target_rate
 * @property {"above"|"below"} direction
 * @property {string} [label]
 */

/**
 * Create a new price alert.
 * @param {AlertPayload} payload
 */
export async function createAlert(payload) {
  return request("/alerts/", { method: "POST", body: JSON.stringify(payload) });
}

/**
 * Fetch all alerts, optionally filtered by status.
 * @param {string|null} [status] - "active" | "triggered" | "cancelled" | null
 */
export async function fetchAlerts(status = null) {
  const query = status ? `?status=${status}` : "";
  return request(`/alerts/${query}`);
}

/**
 * Cancel an existing alert.
 * @param {string} alertId
 */
export async function cancelAlert(alertId) {
  return request(`/alerts/${alertId}`, { method: "DELETE" });
}
