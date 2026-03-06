/**
 * Currency and number formatting utilities.
 * Centralizing formatting logic avoids duplication and makes
 * locale changes easy to apply globally.
 */

/**
 * Format a number as a currency string using the browser's Intl API.
 *
 * @param {number} amount - The numeric value to format.
 * @param {string} currencyCode - ISO 4217 currency code (e.g. "USD").
 * @param {string} [locale="en-US"] - BCP 47 locale tag.
 * @returns {string} Formatted currency string (e.g. "$1,234.56").
 */
export function formatCurrency(amount, currencyCode, locale = "en-US") {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(amount);
  } catch {
    // Fallback for unsupported currency codes in older environments
    return `${currencyCode} ${amount.toFixed(4)}`;
  }
}

/**
 * Format an exchange rate with up to 6 decimal places,
 * trimming trailing zeros while keeping at least 4 significant digits.
 *
 * @param {number} rate - Exchange rate value.
 * @returns {string} Formatted rate string.
 */
export function formatRate(rate) {
  if (rate === 0) return "0.0000";
  // Use more decimal places for very small rates (e.g. BTC-style)
  const decimals = rate < 0.01 ? 6 : 4;
  return rate.toFixed(decimals);
}

/**
 * Format an ISO timestamp string into a human-readable relative time label.
 *
 * @param {string} isoTimestamp - ISO 8601 date string.
 * @returns {string} Human-readable label (e.g. "2 minutes ago").
 */
export function formatRelativeTime(isoTimestamp) {
  const diffMs = Date.now() - new Date(isoTimestamp).getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 60) return "just now";
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  return `${Math.floor(diffSeconds / 86400)}d ago`;
}

/**
 * Returns the CSS class modifier for a rate change direction.
 *
 * @param {number} change - Numeric change value (positive, negative, or zero).
 * @returns {"positive"|"negative"|"neutral"}
 */
export function getRateChangeClass(change) {
  if (change > 0) return "positive";
  if (change < 0) return "negative";
  return "neutral";
}
