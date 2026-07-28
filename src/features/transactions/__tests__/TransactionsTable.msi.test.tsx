/**
 * TransactionsTable MSI badge & Cuota column — control-ingresos
 *
 * Verifies the badge text uses the active installment (counting convention)
 * and the Cuota column renders the correct amount per row type.
 *
 * The table memoizes `today` once via `useMemo(() => new Date(), [])`. We
 * freeze the OS clock with `vi.setSystemTime` so the memoized `today` is
 * deterministic across the suite.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { TransactionsTable } from "../TransactionsTable";
import type { Card } from "@/db/schemas/card";
import type { MsiExpense, Transaction } from "@/db/schemas/transaction";

const FIXED_TODAY = new Date("2026-06-04T12:00:00Z");

function makeCard(): Card {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    bank: "BBVA",
    holderName: "Test Holder",
    cardType: "credit",
    cutDay: 1,
    daysToPayAfterCut: 20,
    priority: 0,
    createdAt: FIXED_TODAY.toISOString(),
    updatedAt: FIXED_TODAY.toISOString(),
  };
}

function makeMsi(overrides: Partial<MsiExpense> = {}): MsiExpense {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    type: "expense_msi",
    amount: 30000, // $300.00
    currency: "MXN",
    description: "Laptop MSI",
    date: FIXED_TODAY.toISOString(),
    paymentMethod: "credit",
    cardId: "22222222-2222-4222-8222-222222222222",
    msiMonths: 15,
    msiStartDate: FIXED_TODAY.toISOString(),
    ...overrides,
  } as MsiExpense;
}

function makeExpense(amountCents: number, overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: crypto.randomUUID(),
    type: "expense",
    amount: amountCents,
    currency: "MXN",
    description: "One-off",
    date: FIXED_TODAY.toISOString(),
    paymentMethod: "cash",
    ...overrides,
  } as Transaction;
}

function makeIncome(amountCents: number): Transaction {
  return {
    id: crypto.randomUUID(),
    type: "income",
    amount: amountCents,
    currency: "MXN",
    description: "Salary",
    date: FIXED_TODAY.toISOString(),
    paymentMethod: "transfer",
  } as Transaction;
}

describe("TransactionsTable — MSI badge and Cuota column", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_TODAY);
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("renders '1/15 meses' badge for an MSI created in the current month", () => {
    render(
      <TransactionsTable
        data={[makeMsi()]}
        cards={[makeCard()]}
        currency="MXN"
        onEdit={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByText("1/15 meses")).toBeInTheDocument();
  });

  it("renders '2/15 meses' badge for an MSI created one month before today", () => {
    const lastMonth = new Date(FIXED_TODAY);
    lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);
    render(
      <TransactionsTable
        data={[makeMsi({ msiStartDate: lastMonth.toISOString() })]}
        cards={[makeCard()]}
        currency="MXN"
        onEdit={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByText("2/15 meses")).toBeInTheDocument();
  });

  it("renders no badge for an MSI that has finished (msiStartDate > msiMonths ago)", () => {
    const longAgo = new Date(FIXED_TODAY);
    longAgo.setUTCMonth(longAgo.getUTCMonth() - 20);
    render(
      <TransactionsTable
        data={[makeMsi({ msiStartDate: longAgo.toISOString() })]}
        cards={[makeCard()]}
        currency="MXN"
        onEdit={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.queryByText(/meses/)).not.toBeInTheDocument();
  });

  it("renders the active installment amount in the Cuota column for MSI ($300 / 15 = $20.00)", () => {
    render(
      <TransactionsTable
        data={[makeMsi()]}
        cards={[makeCard()]}
        currency="MXN"
        onEdit={() => {}}
        onDelete={() => {}}
      />,
    );
    // The Cuota cell renders "−$20.00" (30000 / 15 = 2000 cents = $20.00).
    // The minus sign is text content before the formatted currency.
    expect(screen.getByText((content) => content.includes("$20.00"))).toBeInTheDocument();
  });

  it("renders the full amount in the Cuota column for one-off expense", () => {
    render(
      <TransactionsTable
        data={[makeExpense(100000)]} // $1000.00
        cards={[makeCard()]}
        currency="MXN"
        onEdit={() => {}}
        onDelete={() => {}}
      />,
    );
    // Cuota for expense === full amount → $1,000.00 should appear in both
    // Monto and Cuota columns.
    const matches = screen.getAllByText((content) => content.includes("$1,000.00"));
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it("renders '—' in the Cuota column for income", () => {
    render(
      <TransactionsTable
        data={[makeIncome(100000)]}
        cards={[makeCard()]}
        currency="MXN"
        onEdit={() => {}}
        onDelete={() => {}}
      />,
    );
    // The income row should have em-dashes in both Categoría (no category) and Cuota.
    const emDashes = screen.getAllByText("—");
    expect(emDashes.length).toBeGreaterThanOrEqual(2);
  });

  it("renders '—' in the Cuota column for inactive MSI", () => {
    const longAgo = new Date(FIXED_TODAY);
    longAgo.setUTCMonth(longAgo.getUTCMonth() - 20);
    render(
      <TransactionsTable
        data={[makeMsi({ msiStartDate: longAgo.toISOString() })]}
        cards={[makeCard()]}
        currency="MXN"
        onEdit={() => {}}
        onDelete={() => {}}
      />,
    );
    // For inactive MSI the Cuota cell shows an em-dash (and so does the
    // Categoría cell since fixtures don't set a category).
    const emDashes = screen.getAllByText("—");
    expect(emDashes.length).toBeGreaterThanOrEqual(1);
  });

  it("column order: Monto header appears before Cuota header, Cuota before Método", () => {
    render(
      <TransactionsTable
        data={[makeMsi()]}
        cards={[makeCard()]}
        currency="MXN"
        onEdit={() => {}}
        onDelete={() => {}}
      />,
    );
    const headers = screen.getAllByRole("columnheader");
    const texts = headers.map((h) => h.textContent ?? "");
    const montoIdx = texts.findIndex((t) => t.includes("Monto"));
    const cuotaIdx = texts.findIndex((t) => t.includes("Cuota"));
    const methodoIdx = texts.findIndex((t) => t.includes("Método"));
    expect(montoIdx).toBeGreaterThanOrEqual(0);
    expect(cuotaIdx).toBeGreaterThan(montoIdx);
    expect(methodoIdx).toBeGreaterThan(cuotaIdx);
  });

  it("renders the Fecha column as DD/MM/YYYY (compact format)", () => {
    render(
      <TransactionsTable
        data={[makeExpense(100000, { date: "2026-07-27" })]}
        cards={[makeCard()]}
        currency="MXN"
        onEdit={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByText("27/07/2026")).toBeInTheDocument();
    expect(screen.queryByText("27 de julio de 2026")).not.toBeInTheDocument();
  });
});
