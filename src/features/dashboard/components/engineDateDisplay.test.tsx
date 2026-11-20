/**
 * Engine-date display regression (redesign-ui-2026, T3 fix).
 *
 * The engine (`cycle.ts` → `computeActivePaymentDate`) returns UTC-midnight
 * dates. Formatting them with local-timezone helpers shifted the visible
 * day one day early in UTC-6: a payment at `2026-11-22T00:00:00.000Z`
 * rendered as "21 de noviembre", and a transaction dated "2026-11-20"
 * as "19 nov". These tests pin the corrected display through the public
 * dashboard components. Dates are built via UTC instants (noon UTC for
 * "today") so the expectations hold in any runner timezone; the runner
 * here is UTC-6, where the original bug was visible.
 */
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router";
import { describe, expect, it } from "vitest";
import type { Card, Transaction } from "@/db/schemas";
import { computeDashboardSummary } from "../computeDashboardSummary";
import { CardPaymentsSection } from "./CardPaymentsSection";
import { RecentTransactionsSection } from "./RecentTransactionsSection";
import { UrgentNotice } from "./UrgentNotice";

// Noon UTC keeps the engine's UTC calendar day (Nov 20) identical in any
// runner timezone — the convention documented in computeCardAccount tests.
const today = new Date("2026-11-20T12:00:00Z");

const cards: Card[] = [
  {
    id: "card-1",
    bank: "PLATA",
    holderName: "Usuario",
    cardType: "credit",
    cutDay: 17,
    daysToPayAfterCut: 5,
    creditLimit: 1_000_000,
    priority: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "card-2",
    bank: "Mercado Pago",
    holderName: "Usuario",
    cardType: "credit",
    cutDay: 5,
    daysToPayAfterCut: 5,
    creditLimit: 500_000,
    priority: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

const transactions: Transaction[] = [
  {
    id: "tx-1",
    type: "expense",
    amount: 100_000,
    currency: "MXN",
    description: "Sábado de compra",
    date: "2026-11-20",
    category: "Comida",
    paymentMethod: "credit",
    cardId: "card-1",
  },
  {
    id: "tx-2",
    type: "expense",
    amount: 50_000,
    currency: "MXN",
    description: "Gas del mes",
    date: "2026-11-06",
    category: "Hogar",
    paymentMethod: "credit",
    cardId: "card-2",
  },
];

const summary = computeDashboardSummary(
  {
    transactions,
    cards,
    fixedPayments: [],
    settings: { monthlyLimit: 2_500_000, currency: "MXN" },
  },
  "current",
  { today },
);

function renderWithRouter(ui: React.JSX.Element): ReturnType<typeof render> {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe("dashboard display of engine UTC dates", () => {
  it("CardPaymentsSection shows 'Vence el 22 de noviembre' for the 2026-11-22T00:00:00.000Z payment", () => {
    renderWithRouter(<CardPaymentsSection summary={summary} />);

    expect(screen.getByText("Vence el 22 de noviembre")).toBeInTheDocument();
    expect(
      screen.queryByText("Vence el 21 de noviembre"),
    ).not.toBeInTheDocument();
  });

  it("CardPaymentsSection keeps the overdue row on its real calendar day", () => {
    renderWithRouter(<CardPaymentsSection summary={summary} />);

    // Mercado Pago: cut Nov 5 + 5 days → 2026-11-10T00:00:00.000Z (overdue).
    expect(screen.getByText("Venció el 10 de noviembre")).toBeInTheDocument();
    expect(
      screen.queryByText("Venció el 9 de noviembre"),
    ).not.toBeInTheDocument();
  });

  it("UrgentNotice shows the engine payment day '22 de noviembre'", () => {
    const payment = summary.urgentPayment;
    expect(payment).not.toBeNull();

    renderWithRouter(
      <UrgentNotice payment={payment!} currency={summary.currency} />,
    );

    expect(screen.getByText("PLATA vence en 2 días")).toBeInTheDocument();
    // The date text node is followed by a literal ", " inside the same span.
    expect(screen.getByText("22 de noviembre,")).toBeInTheDocument();
    expect(screen.queryByText("21 de noviembre,")).not.toBeInTheDocument();
  });

  it("RecentTransactionsSection shows '20 nov' for a transaction dated 2026-11-20", () => {
    renderWithRouter(<RecentTransactionsSection summary={summary} />);

    expect(screen.getByText("20 nov")).toBeInTheDocument();
    expect(screen.queryByText("19 nov")).not.toBeInTheDocument();
  });
});
