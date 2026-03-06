/**
 * AlertList component
 * Renders all alerts with status badges and cancel controls.
 */

import { formatRelativeTime, formatRate } from "../utils/formatters";

const STATUS_LABELS = {
  active: { label: "Active", className: "badge--active" },
  triggered: { label: "Triggered", className: "badge--triggered" },
  cancelled: { label: "Cancelled", className: "badge--cancelled" },
};

/**
 * @param {Object} props
 * @param {Array} props.alerts - List of alert objects.
 * @param {function(string): void} props.onCancel - Called with alert id to cancel.
 * @param {boolean} [props.isLoading]
 */
export function AlertList({ alerts, onCancel, isLoading = false }) {
  if (isLoading) {
    return <p className="alerts-list__empty">Loading alerts…</p>;
  }

  if (alerts.length === 0) {
    return (
      <p className="alerts-list__empty">
        No alerts yet. Create one to get notified when a rate crosses your target.
      </p>
    );
  }

  return (
    <ul className="alerts-list" aria-label="Price alerts">
      {alerts.map((alert) => (
        <AlertItem key={alert.id} alert={alert} onCancel={onCancel} />
      ))}
    </ul>
  );
}

/**
 * @param {Object} props
 * @param {Object} props.alert - Single alert object.
 * @param {function(string): void} props.onCancel
 */
function AlertItem({ alert, onCancel }) {
  const { label, className } = STATUS_LABELS[alert.status] ?? {
    label: alert.status,
    className: "",
  };

  const directionArrow = alert.direction === "above" ? "↑" : "↓";
  const isActionable = alert.status === "active";

  return (
    <li className={`alert-item alert-item--${alert.status}`} data-testid={`alert-item-${alert.id}`}>
      <div className="alert-item__header">
        <span className="alert-item__pair">
          {alert.base_currency}/{alert.target_currency}
        </span>
        <span className={`badge ${className}`}>{label}</span>
      </div>

      <div className="alert-item__details">
        <span className="alert-item__rate">
          {directionArrow} {formatRate(alert.target_rate)}
        </span>
        {alert.label && (
          <span className="alert-item__label">"{alert.label}"</span>
        )}
      </div>

      <div className="alert-item__footer">
        <span className="alert-item__time">
          Created {formatRelativeTime(alert.created_at)}
        </span>
        {alert.triggered_at && (
          <span className="alert-item__triggered">
            Triggered {formatRelativeTime(alert.triggered_at)}
          </span>
        )}
        {isActionable && (
          <button
            className="alert-item__cancel"
            onClick={() => onCancel(alert.id)}
            aria-label={`Cancel alert for ${alert.base_currency}/${alert.target_currency}`}
          >
            Cancel
          </button>
        )}
      </div>
    </li>
  );
}
