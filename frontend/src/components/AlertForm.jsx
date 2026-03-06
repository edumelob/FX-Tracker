/**
 * AlertForm component
 * Controlled form for creating a new price alert.
 * Handles its own local validation before delegating to the parent handler.
 */

import { useState } from "react";

const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "BRL", "CAD", "AUD", "CHF", "CNY", "INR"];

/**
 * @param {Object} props
 * @param {function(Object): Promise<void>} props.onSubmit - Called with alert payload on submit.
 * @param {string} [props.defaultBase] - Pre-filled base currency.
 * @param {string} [props.defaultTarget] - Pre-filled target currency.
 * @param {number} [props.defaultRate] - Pre-filled target rate.
 */
export function AlertForm({ onSubmit, defaultBase = "USD", defaultTarget = "EUR", defaultRate = "" }) {
  const [baseCurrency, setBaseCurrency] = useState(defaultBase);
  const [targetCurrency, setTargetCurrency] = useState(defaultTarget);
  const [targetRate, setTargetRate] = useState(defaultRate);
  const [direction, setDirection] = useState("above");
  const [label, setLabel] = useState("");
  const [validationError, setValidationError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate() {
    if (!targetRate || isNaN(Number(targetRate)) || Number(targetRate) <= 0) {
      return "Target rate must be a positive number.";
    }
    if (baseCurrency === targetCurrency) {
      return "Base and target currencies must be different.";
    }
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const error = validate();
    if (error) {
      setValidationError(error);
      return;
    }

    setValidationError(null);
    setIsSubmitting(true);

    try {
      await onSubmit({
        base_currency: baseCurrency,
        target_currency: targetCurrency,
        target_rate: Number(targetRate),
        direction,
        label: label.trim() || null,
      });
      // Reset form on success
      setTargetRate("");
      setLabel("");
    } catch (err) {
      setValidationError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="alert-form" onSubmit={handleSubmit} noValidate>
      <h3 className="alert-form__title">Create Price Alert</h3>

      <div className="alert-form__row">
        <div className="alert-form__field">
          <label htmlFor="base-currency">Base Currency</label>
          <select
            id="base-currency"
            value={baseCurrency}
            onChange={(e) => setBaseCurrency(e.target.value)}
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="alert-form__field">
          <label htmlFor="target-currency">Target Currency</label>
          <select
            id="target-currency"
            value={targetCurrency}
            onChange={(e) => setTargetCurrency(e.target.value)}
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="alert-form__row">
        <div className="alert-form__field">
          <label htmlFor="target-rate">Target Rate</label>
          <input
            id="target-rate"
            type="number"
            min="0.000001"
            step="any"
            placeholder="e.g. 0.9500"
            value={targetRate}
            onChange={(e) => setTargetRate(e.target.value)}
            required
          />
        </div>

        <div className="alert-form__field">
          <label htmlFor="direction">Direction</label>
          <select
            id="direction"
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
          >
            <option value="above">Goes Above ↑</option>
            <option value="below">Goes Below ↓</option>
          </select>
        </div>
      </div>

      <div className="alert-form__field">
        <label htmlFor="label">Label (optional)</label>
        <input
          id="label"
          type="text"
          maxLength={100}
          placeholder="e.g. USD/EUR peak watch"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>

      {validationError && (
        <p className="alert-form__error" role="alert">
          {validationError}
        </p>
      )}

      <button
        type="submit"
        className="alert-form__submit"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? "Creating…" : "Create Alert"}
      </button>
    </form>
  );
}
