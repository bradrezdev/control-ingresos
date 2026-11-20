/**
 * Tests for the card detail sheet content (redesign-ui-2026, T5).
 *
 * The detail shows the current statement cycle (cut date + payment due
 * date), the cycle movements, the active MSI plans with their remaining
 * debt, and next month's estimated payment. Debit cards get only what
 * applies to them.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { format, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import type { Card, Transaction } from "@/db/schemas";
import { computeCardAccount } from "./computeCardAccount";
import { useLiveMsiForCard } from "./useLiveMsiForCard";
import { CardDetail } from "./CardDetail";

vi.mock("./useLiveMsiForCard", () => ({
  useLiveMsiForCard: vi.fn(),
}));

const mockUseLiveMsiForCard = vi.mocked(useLiveMsiForCard);

const today = new Date("2026-11-20T12:00:00Z");

const creditCard: Card = {
  id: "card-1",
  bank: "PLATA",
  holderName: "Bryan Núñez",
  cardType: "credit",
  cutDay: 17,
  daysToPayAfterCut: 20,
  creditLimit: 1_000_000,
  priority: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const debitCard: Card = {
  id: "card-debit",
  bank: "Débito diario",
  holderName: "Bryan Núñez",
  cardType: "debit",
  priority: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function expense(
  id: string,
  date: string,
  amount: number,
  cardId = "card-1",
): Transaction {
  return {
    id,
    type: "expense",
    amount,
    currency: "MXN",
    description: `Gasto ${id}`,
    date,
    category: "Comida",
    paymentMethod: "credit",
    cardId,
  };
}

const msiTx: Transaction = {
  id: "msi-1",
  type: "expense_msi",
  amount: 240_000,
  currency: "MXN",
  description: "Televisión",
  date: "2026-09-01",
  category: "Hogar",
  paymentMethod: "credit",
  cardId: "card-1",
  msiMonths: 12,
  msiStartDate: "2026-09-01",
};

beforeEach(() => {
  mockUseLiveMsiForCard.mockReset();
  mockUseLiveMsiForCard.mockReturnValue([]);
});

const nextMonthLabel = format(addMonths(today, 1), "MMMM", { locale: es });

function renderDetail(card: Card, transactions: Transaction[]): void {
  const account = computeCardAccount(card, transactions, today);
  render(<CardDetail account={account} currency="MXN" today={today} />);
}

describe("CardDetail — credit card", () => {
  it("shows the current statement cycle with cut and payment dates", () => {
    renderDetail(creditCard, [expense("tx", "2026-11-01", 50_000)]);

    expect(screen.getByText("Ciclo actual")).toBeInTheDocument();
    expect(screen.getByText("Corte")).toBeInTheDocument();
    expect(screen.getByText("17 de noviembre de 2026")).toBeInTheDocument();
    expect(screen.getByText("Fecha límite de pago")).toBeInTheDocument();
    expect(screen.getByText("7 de diciembre de 2026")).toBeInTheDocument();
  });

  it("labels the payment with its status chip", () => {
    renderDetail(creditCard, [expense("tx", "2026-11-01", 50_000)]);
    expect(screen.getByText("En 17 días")).toBeInTheDocument();
  });

  it("lists the movements of the cycle", () => {
    renderDetail(creditCard, [
      expense("in-1", "2026-11-01", 20_000),
      expense("in-2", "2026-11-10", 30_000),
      expense("out-1", "2026-11-18", 40_000),
    ]);

    expect(screen.getByText("Movimientos del ciclo")).toBeInTheDocument();
    expect(screen.getByText("Gasto in-1")).toBeInTheDocument();
    expect(screen.getByText("Gasto in-2")).toBeInTheDocument();
    expect(screen.queryByText("Gasto out-1")).not.toBeInTheDocument();
  });

  it("reports when the cycle has no movements", () => {
    renderDetail(creditCard, []);
    expect(screen.getByText("Sin movimientos en este ciclo.")).toBeInTheDocument();
  });

  it("shows active MSI plans with their remaining debt and installment", () => {
    mockUseLiveMsiForCard.mockReturnValue([msiTx]);
    renderDetail(creditCard, []);

    expect(screen.getByText("Compras a meses")).toBeInTheDocument();
    expect(screen.getByText("Televisión")).toBeInTheDocument();
    expect(screen.getByText("Cuota 3 de 12 · 10 cuotas restantes")).toBeInTheDocument();
    // The remaining debt appears both in the section total and in the
    // plan row (single plan → same figure).
    expect(screen.getAllByText("$2,000.00")).toHaveLength(2);
    expect(screen.getByText(/Saldo restante/)).toBeInTheDocument();
  });

  it("reports when there are no active MSI plans", () => {
    renderDetail(creditCard, []);
    expect(screen.getByText("Sin compras a meses activas.")).toBeInTheDocument();
  });

  it("estimates next month's payment", () => {
    renderDetail(creditCard, [
      expense("dec", "2026-12-05", 100_000),
    ]);

    expect(
      screen.getByText(`Pago estimado de ${nextMonthLabel}`),
    ).toBeInTheDocument();
    expect(screen.getByText("$1,000.00")).toBeInTheDocument();
  });
});

describe("CardDetail — debit card", () => {
  it("shows only what applies to a debit card", () => {
    mockUseLiveMsiForCard.mockReturnValue([]);
    renderDetail(debitCard, [
      expense("d-nov", "2026-11-10", 20_000, "card-debit"),
    ]);

    expect(screen.getByText(/sin ciclo de corte ni límite/)).toBeInTheDocument();
    expect(screen.getByText("Movimientos del mes")).toBeInTheDocument();
    expect(screen.getByText("Gasto d-nov")).toBeInTheDocument();
    expect(screen.queryByText("Ciclo actual")).not.toBeInTheDocument();
    expect(screen.queryByText("Compras a meses")).not.toBeInTheDocument();
    expect(screen.queryByText(/Pago estimado/)).not.toBeInTheDocument();
  });

  it("reports when the debit month has no movements", () => {
    renderDetail(debitCard, []);
    expect(screen.getByText("Sin movimientos este mes.")).toBeInTheDocument();
  });
});
