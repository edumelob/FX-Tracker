/**
 * RateCard component
 * Displays a single currency exchange rate in a compact card format.
 */

import { formatRate } from "../utils/formatters";

/**
 * @param {Object} props
 * @param {string} props.currency - Target currency code (e.g. "EUR").
 * @param {number} props.rate - Current exchange rate.
 * @param {string} props.baseCurrency - Base currency code (e.g. "USD").
 * @param {function} [props.onAddAlert] - Called when "Add Alert" is clicked.
 */
export function RateCard({ currency, rate, baseCurrency, onAddAlert }) {
  const flagEmoji = getCurrencyFlag(currency);

  return (
    <div className="rate-card" data-testid={`rate-card-${currency}`}>
      <div className="rate-card__header">
        <span className="rate-card__flag" aria-hidden="true">
          {flagEmoji}
        </span>
        <span className="rate-card__code">{currency}</span>
      </div>

      <div className="rate-card__rate" title={`${baseCurrency}/${currency} exchange rate`}>
        {formatRate(rate)}
      </div>

      <div className="rate-card__label">
        1 {baseCurrency} = {formatRate(rate)} {currency}
      </div>

      {onAddAlert && (
        <button
          className="rate-card__alert-btn"
          onClick={() => onAddAlert(currency, rate)}
          aria-label={`Set alert for ${baseCurrency}/${currency}`}
        >
          + Alert
        </button>
      )}
    </div>
  );
}

/**
 * Map currency codes to regional flag emojis.
 * Returns a generic symbol for unmapped codes.
 *
 * @param {string} code - ISO 4217 currency code.
 * @returns {string} Flag emoji or default symbol.
 */
function getCurrencyFlag(code) {
  const flags = {
    USD: "🇺🇸",
    EUR: "🇪🇺",
    GBP: "🇬🇧",
    JPY: "🇯🇵",
    BRL: "🇧🇷",
    CAD: "🇨🇦",
    AUD: "🇦🇺",
    CHF: "🇨🇭",
    CNY: "🇨🇳",
    INR: "🇮🇳",
  };
  return flags[code] ?? "💱";
}
