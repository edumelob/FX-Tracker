/**
 * Frontend test suite for FX Tracker.
 * Covers: utility functions, RateCard rendering, AlertForm validation,
 * and AlertList behavior.
 * Run with: npm test
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AlertForm } from "../components/AlertForm";
import { AlertList } from "../components/AlertList";
import { RateCard } from "../components/RateCard";
import {
  formatCurrency,
  formatRate,
  formatRelativeTime,
  getRateChangeClass,
} from "../utils/formatters";

// ============================================================
// Formatter Utilities
// ============================================================

describe("formatRate", () => {
  it("formats standard rates to 4 decimal places", () => {
    expect(formatRate(0.9201)).toBe("0.9201");
  });

  it("formats large rates correctly", () => {
    expect(formatRate(149.72)).toBe("149.7200");
  });

  it("formats very small rates to 6 decimal places", () => {
    expect(formatRate(0.005)).toBe("0.005000");
  });

  it("handles zero gracefully", () => {
    expect(formatRate(0)).toBe("0.0000");
  });
});

describe("formatCurrency", () => {
  it("formats USD amounts with $ sign", () => {
    const result = formatCurrency(1234.56, "USD");
    expect(result).toContain("1,234.56");
  });

  it("returns fallback string for unknown currency", () => {
    const result = formatCurrency(100, "XYZ");
    expect(result).toContain("XYZ");
    expect(result).toContain("100");
  });
});

describe("formatRelativeTime", () => {
  it('returns "just now" for timestamps under 60 seconds ago', () => {
    const recent = new Date(Date.now() - 10_000).toISOString();
    expect(formatRelativeTime(recent)).toBe("just now");
  });

  it("returns minutes for timestamps 1-59 minutes ago", () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(fiveMinutesAgo)).toBe("5m ago");
  });

  it("returns hours for timestamps over 60 minutes ago", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    expect(formatRelativeTime(twoHoursAgo)).toBe("2h ago");
  });

  it("returns days for timestamps over 24 hours ago", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400 * 1000).toISOString();
    expect(formatRelativeTime(threeDaysAgo)).toBe("3d ago");
  });
});

describe("getRateChangeClass", () => {
  it('returns "positive" for positive values', () => {
    expect(getRateChangeClass(0.5)).toBe("positive");
  });
  it('returns "negative" for negative values', () => {
    expect(getRateChangeClass(-0.1)).toBe("negative");
  });
  it('returns "neutral" for zero', () => {
    expect(getRateChangeClass(0)).toBe("neutral");
  });
});

// ============================================================
// RateCard Component
// ============================================================

describe("RateCard", () => {
  it("renders currency code and rate", () => {
    render(
      <RateCard currency="EUR" rate={0.9201} baseCurrency="USD" />
    );
    expect(screen.getByText("EUR")).toBeInTheDocument();
    expect(screen.getByText("0.9201")).toBeInTheDocument();
  });

  it("renders the correct base/target label", () => {
    render(<RateCard currency="JPY" rate={149.72} baseCurrency="USD" />);
    expect(screen.getByText(/1 USD = 149.7200 JPY/i)).toBeInTheDocument();
  });

  it("renders Add Alert button when onAddAlert is provided", () => {
    const handler = vi.fn();
    render(
      <RateCard currency="EUR" rate={0.92} baseCurrency="USD" onAddAlert={handler} />
    );
    expect(screen.getByRole("button", { name: /set alert for USD\/EUR/i })).toBeInTheDocument();
  });

  it("does NOT render Add Alert button when onAddAlert is not provided", () => {
    render(<RateCard currency="EUR" rate={0.92} baseCurrency="USD" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("calls onAddAlert with currency and rate when clicked", async () => {
    const handler = vi.fn();
    render(
      <RateCard currency="GBP" rate={0.78} baseCurrency="USD" onAddAlert={handler} />
    );
    await userEvent.click(screen.getByRole("button", { name: /alert/i }));
    expect(handler).toHaveBeenCalledWith("GBP", 0.78);
  });

  it("renders test id attribute for targeted queries", () => {
    render(<RateCard currency="BRL" rate={5.03} baseCurrency="USD" />);
    expect(screen.getByTestId("rate-card-BRL")).toBeInTheDocument();
  });
});

// ============================================================
// AlertForm Component
// ============================================================

describe("AlertForm", () => {
  it("renders all form fields", () => {
    render(<AlertForm onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/base currency/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/target currency/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/target rate/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/direction/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/label/i)).toBeInTheDocument();
  });

  it("shows validation error for empty target rate", async () => {
    render(<AlertForm onSubmit={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /create alert/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/positive number/i);
  });

  it("shows validation error when base and target currencies are the same", async () => {
    render(<AlertForm onSubmit={vi.fn()} defaultBase="USD" defaultTarget="USD" />);
    const rateInput = screen.getByLabelText(/target rate/i);
    await userEvent.type(rateInput, "1.0");
    await userEvent.click(screen.getByRole("button", { name: /create alert/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/different/i);
  });

  it("calls onSubmit with correct payload when form is valid", async () => {
    const mockSubmit = vi.fn().mockResolvedValue({});
    render(<AlertForm onSubmit={mockSubmit} defaultBase="USD" defaultTarget="EUR" />);

    await userEvent.type(screen.getByLabelText(/target rate/i), "0.95");
    await userEvent.type(screen.getByLabelText(/label/i), "My alert");
    await userEvent.click(screen.getByRole("button", { name: /create alert/i }));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          base_currency: "USD",
          target_currency: "EUR",
          target_rate: 0.95,
          label: "My alert",
        })
      );
    });
  });

  it("clears rate input after successful submission", async () => {
    const mockSubmit = vi.fn().mockResolvedValue({});
    render(<AlertForm onSubmit={mockSubmit} />);

    const rateInput = screen.getByLabelText(/target rate/i);
    await userEvent.type(rateInput, "0.95");
    await userEvent.click(screen.getByRole("button", { name: /create alert/i }));

    await waitFor(() => expect(rateInput).toHaveValue(null));
  });

  it("shows error message from rejected onSubmit promise", async () => {
    const mockSubmit = vi.fn().mockRejectedValue(new Error("Alert limit exceeded."));
    render(<AlertForm onSubmit={mockSubmit} defaultBase="USD" defaultTarget="EUR" />);

    await userEvent.type(screen.getByLabelText(/target rate/i), "0.95");
    await userEvent.click(screen.getByRole("button", { name: /create alert/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/alert limit exceeded/i);
  });
});

// ============================================================
// AlertList Component
// ============================================================

describe("AlertList", () => {
  const mockAlerts = [
    {
      id: "alert-1",
      base_currency: "USD",
      target_currency: "EUR",
      target_rate: 0.95,
      direction: "above",
      status: "active",
      label: "My watch",
      created_at: new Date(Date.now() - 120_000).toISOString(),
      triggered_at: null,
    },
    {
      id: "alert-2",
      base_currency: "USD",
      target_currency: "JPY",
      target_rate: 150.0,
      direction: "below",
      status: "triggered",
      label: null,
      created_at: new Date(Date.now() - 3_600_000).toISOString(),
      triggered_at: new Date(Date.now() - 1_800_000).toISOString(),
    },
  ];

  it('renders empty state when no alerts exist', () => {
    render(<AlertList alerts={[]} onCancel={vi.fn()} />);
    expect(screen.getByText(/no alerts yet/i)).toBeInTheDocument();
  });

  it("renders loading state", () => {
    render(<AlertList alerts={[]} onCancel={vi.fn()} isLoading />);
    expect(screen.getByText(/loading alerts/i)).toBeInTheDocument();
  });

  it("renders all provided alerts", () => {
    render(<AlertList alerts={mockAlerts} onCancel={vi.fn()} />);
    expect(screen.getByTestId("alert-item-alert-1")).toBeInTheDocument();
    expect(screen.getByTestId("alert-item-alert-2")).toBeInTheDocument();
  });

  it("renders currency pair labels", () => {
    render(<AlertList alerts={mockAlerts} onCancel={vi.fn()} />);
    expect(screen.getByText("USD/EUR")).toBeInTheDocument();
    expect(screen.getByText("USD/JPY")).toBeInTheDocument();
  });

  it("renders Cancel button only for active alerts", () => {
    render(<AlertList alerts={mockAlerts} onCancel={vi.fn()} />);
    const cancelButtons = screen.getAllByRole("button", { name: /cancel/i });
    expect(cancelButtons).toHaveLength(1); // only the active one
  });

  it("calls onCancel with correct alert id", async () => {
    const onCancel = vi.fn();
    render(<AlertList alerts={mockAlerts} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole("button", { name: /cancel alert for USD\/EUR/i }));
    expect(onCancel).toHaveBeenCalledWith("alert-1");
  });

  it("renders the label for alerts that have one", () => {
    render(<AlertList alerts={mockAlerts} onCancel={vi.fn()} />);
    expect(screen.getByText(/"My watch"/i)).toBeInTheDocument();
  });
});
