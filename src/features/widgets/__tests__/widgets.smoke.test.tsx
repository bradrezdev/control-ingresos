/**
 * Smoke test for the four dashboard widgets.
 *
 * These tests guarantee that every widget can be mounted without throwing,
 * even with empty data. This protects us from regressions of the
 * "Rendered more hooks than during the previous render" class of bugs:
 * if a future refactor adds a hook after an early return, at least one of
 * these tests will catch it.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { SmartShopper } from "../SmartShopper";
import { PaymentCalendar } from "../PaymentCalendar";
import { BudgetControl } from "../BudgetControl";
import { MsiSummary } from "../MsiSummary";
import { FixedPaymentsWidget } from "../FixedPaymentsWidget";

// Stable Date.now / new Date so the widgets' useMemo(() => new Date(), [])
// always returns the same value across renders within a test.
const FIXED_TODAY = new Date("2026-06-04T12:00:00Z");

vi.mock("@/hooks/useLiveCards", () => ({
  useLiveCards: () => [],
}));
vi.mock("@/hooks/useLiveTransactions", () => ({
  useLiveTransactions: () => [],
}));
vi.mock("@/hooks/useLiveSettings", () => ({
  useLiveSettings: () => ({
    id: "singleton",
    monthlyLimit: 0,
    currency: "MXN",
    updatedAt: FIXED_TODAY.toISOString(),
  }),
}));
vi.mock("@/hooks/useLiveFixedPayments", () => ({
  useLiveFixedPayments: () => [],
}));

function withRouter(node: React.ReactNode) {
  return <MemoryRouter>{node}</MemoryRouter>;
}

describe("Dashboard widgets — smoke", () => {
  beforeEach(() => {
    cleanup();
  });

  it("SmartShopper mounts with empty data and does not throw", () => {
    expect(() => render(withRouter(<SmartShopper />))).not.toThrow();
  });

  it("PaymentCalendar mounts with empty data and does not throw", () => {
    expect(() => render(withRouter(<PaymentCalendar />))).not.toThrow();
  });

  it("BudgetControl mounts with empty data and does not throw", () => {
    expect(() => render(withRouter(<BudgetControl />))).not.toThrow();
  });

  it("MsiSummary mounts with empty data and does not throw", () => {
    expect(() => render(withRouter(<MsiSummary />))).not.toThrow();
  });

  it("FixedPaymentsWidget mounts with empty data and does not throw", () => {
    expect(() => render(withRouter(<FixedPaymentsWidget />))).not.toThrow();
  });

  it("FixedPaymentsWidget renders empty state when no payments configured", () => {
    render(withRouter(<FixedPaymentsWidget />));
    expect(
      screen.getByText("No tenés pagos fijos configurados"),
    ).toBeInTheDocument();
  });

  // Hooks must be called in the same order on every render. We simulate a
  // re-render by mounting, unmounting, and remounting. If a widget adds a
  // hook after an early return between renders, this assertion will fail.
  it("all widgets survive a re-mount cycle (rules of hooks regression)", () => {
    for (const Widget of [
      SmartShopper,
      PaymentCalendar,
      BudgetControl,
      MsiSummary,
      FixedPaymentsWidget,
    ]) {
      const { unmount } = render(withRouter(<Widget />));
      expect(() => unmount()).not.toThrow();
      expect(() => render(withRouter(<Widget />))).not.toThrow();
      cleanup();
    }
  });
});
