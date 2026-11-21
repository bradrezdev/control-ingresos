import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router";
import { DashboardScreen } from "./DashboardScreen";
import { useDashboardSummary } from "./useDashboardSummary";
import { computeDashboardSummary } from "./computeDashboardSummary";
import type { DashboardSummary } from "./types";
import type { Card, FixedPayment, Transaction } from "@/db/schemas";

vi.mock("./useDashboardSummary", () => ({
  useDashboardSummary: vi.fn(),
}));

const today = new Date(2026, 10, 20);

const baseSettings = { monthlyLimit: 2_500_000, currency: "MXN" };

const baseCards: Card[] = [
  {
    id: "card-1",
    bank: "PLATA",
    holderName: "Usuario",
    cardType: "credit",
    cutDay: 17,
    daysToPayAfterCut: 5,
    creditLimit: 1_000_000,
    priority: 0,
    createdAt: today.toISOString(),
    updatedAt: today.toISOString(),
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
    createdAt: today.toISOString(),
    updatedAt: today.toISOString(),
  },
];

const baseTransactions: Transaction[] = [
  {
    id: "tx-1",
    type: "expense",
    amount: 100_000,
    currency: "MXN",
    description: "Cena Adobe Pizza",
    date: "2026-11-05",
    category: "Comida",
    paymentMethod: "credit",
    cardId: "card-1",
  },
  {
    id: "tx-2",
    type: "expense_msi",
    amount: 240_000,
    currency: "MXN",
    description: "Televisión",
    date: "2026-09-01",
    category: "Hogar",
    paymentMethod: "credit",
    cardId: "card-2",
    msiMonths: 12,
    msiStartDate: "2026-09-01",
  },
  {
    id: "tx-3",
    type: "income",
    amount: 50_000,
    currency: "MXN",
    description: "Reembolso",
    date: "2026-11-10",
    category: "Otros",
    paymentMethod: "transfer",
  },
];

const baseFixed: FixedPayment[] = [
  {
    id: "fp-1",
    amount: 770_000,
    description: "Renta",
    paymentDay: 1,
    period: "monthly",
    paymentMethod: "debit",
    createdAt: today.toISOString(),
    updatedAt: today.toISOString(),
  },
  {
    id: "fp-2",
    amount: 300_000,
    description: "Gasolina",
    paymentDay: 5,
    period: "monthly",
    paymentMethod: "cash",
    createdAt: today.toISOString(),
    updatedAt: today.toISOString(),
  },
];

function makeSummary(
  overrides: Partial<DashboardSummary> = {},
): DashboardSummary {
  const summary = computeDashboardSummary(
    {
      transactions: baseTransactions,
      cards: baseCards,
      fixedPayments: baseFixed,
      settings: baseSettings,
    },
    "current",
    { today },
  );
  return { ...summary, ...overrides };
}

const mockUseDashboardSummary = vi.mocked(useDashboardSummary);

function renderScreen(): ReturnType<typeof render> {
  return render(
    <BrowserRouter>
      <DashboardScreen />
    </BrowserRouter>,
  );
}

describe("DashboardScreen", () => {
  beforeEach(() => {
    mockUseDashboardSummary.mockReset();
  });

  it("shows a loading skeleton while data resolves", () => {
    mockUseDashboardSummary.mockReturnValue({
      summary: undefined,
      isLoading: true,
      error: null,
      retry: vi.fn(),
    });
    renderScreen();
    expect(screen.queryByText("Hola")).not.toBeInTheDocument();
    expect(document.querySelectorAll("[class*='animate-pulse']").length).toBeGreaterThan(0);
  });

  it("shows an error message with a retry button", async () => {
    const retry = vi.fn();
    mockUseDashboardSummary.mockReturnValue({
      summary: undefined,
      isLoading: false,
      error: new Error("boom"),
      retry,
    });
    renderScreen();
    expect(screen.getByText("No se pudo cargar el inicio")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalled();
  });

  it("renders the greeting header with the current date", () => {
    mockUseDashboardSummary.mockReturnValue({
      summary: makeSummary(),
      isLoading: false,
      error: null,
      retry: vi.fn(),
    });
    renderScreen();
    expect(screen.getByText("Hola")).toBeInTheDocument();
    expect(screen.getByText("Viernes 20 de noviembre")).toBeInTheDocument();
  });

  it("renders the pace chip 'Vas al ritmo' when spending is within progress", () => {
    const summary = makeSummary({ paceOk: true, isCurrentMonth: true });
    mockUseDashboardSummary.mockReturnValue({
      summary,
      isLoading: false,
      error: null,
      retry: vi.fn(),
    });
    renderScreen();
    expect(screen.getByText("Vas al ritmo")).toBeInTheDocument();
    expect(screen.queryByText("Vas rápido")).not.toBeInTheDocument();
  });

  it("renders the pace chip 'Vas rápido' when spending outpaces progress", () => {
    const summary = makeSummary({ paceOk: false, isCurrentMonth: true });
    mockUseDashboardSummary.mockReturnValue({
      summary,
      isLoading: false,
      error: null,
      retry: vi.fn(),
    });
    renderScreen();
    expect(screen.getByText("Vas rápido")).toBeInTheDocument();
  });

  it("shows the urgent notice when a payment is due within 5 days", () => {
    const summary = makeSummary();
    mockUseDashboardSummary.mockReturnValue({
      summary,
      isLoading: false,
      error: null,
      retry: vi.fn(),
    });
    renderScreen();
    expect(screen.getByText(/PLATA vence en/)).toBeInTheDocument();
  });

  it("hides the urgent notice when there is no upcoming payment", () => {
    const summary = makeSummary({ urgentPayment: null });
    mockUseDashboardSummary.mockReturnValue({
      summary,
      isLoading: false,
      error: null,
      retry: vi.fn(),
    });
    renderScreen();
    expect(screen.queryByText(/vence en/)).not.toBeInTheDocument();
  });

  it("marks overdue card payments with the 'Pasado' chip", () => {
    const summary = makeSummary();
    mockUseDashboardSummary.mockReturnValue({
      summary,
      isLoading: false,
      error: null,
      retry: vi.fn(),
    });
    renderScreen();
    expect(screen.getByText("Pasado")).toBeInTheDocument();
  });

  it("shows an empty state for card payments with a call to action", () => {
    const summary = makeSummary({ cardPayments: [], urgentPayment: null });
    mockUseDashboardSummary.mockReturnValue({
      summary,
      isLoading: false,
      error: null,
      retry: vi.fn(),
    });
    renderScreen();
    expect(screen.getByText("Sin pagos de tarjetas para este mes.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Agregar movimiento" })).toBeInTheDocument();
  });

  it("renders fixed payments with a stacked bar and the top three items", () => {
    const summary = makeSummary();
    mockUseDashboardSummary.mockReturnValue({
      summary,
      isLoading: false,
      error: null,
      retry: vi.fn(),
    });
    renderScreen();
    expect(screen.getByRole("heading", { name: "Pagos fijos" })).toBeInTheDocument();
    expect(screen.getByText("Renta")).toBeInTheDocument();
    expect(screen.getByText("Gasolina")).toBeInTheDocument();
  });

  it("renders the MSI debt section with the total and term rows", () => {
    const summary = makeSummary();
    mockUseDashboardSummary.mockReturnValue({
      summary,
      isLoading: false,
      error: null,
      retry: vi.fn(),
    });
    renderScreen();
    expect(screen.getByText("Deuda a meses")).toBeInTheDocument();
    expect(screen.getByText("12 meses")).toBeInTheDocument();
  });

  it("renders recent transactions with the category pattern", () => {
    const summary = makeSummary();
    mockUseDashboardSummary.mockReturnValue({
      summary,
      isLoading: false,
      error: null,
      retry: vi.fn(),
    });
    renderScreen();
    expect(screen.getByText("Últimos movimientos")).toBeInTheDocument();
    expect(screen.getByText("Cena Adobe Pizza")).toBeInTheDocument();
    expect(screen.getByText("−$1,000.00")).toBeInTheDocument();
  });

  it("renders income with a plus sign and positive color", () => {
    const summary = makeSummary();
    mockUseDashboardSummary.mockReturnValue({
      summary,
      isLoading: false,
      error: null,
      retry: vi.fn(),
    });
    renderScreen();
    expect(screen.getByText("Reembolso")).toBeInTheDocument();
    const incomeAmount = screen.getByText(/\+\$500\.00/);
    expect(incomeAmount).toBeInTheDocument();
    expect(incomeAmount).toHaveClass("text-positive");
  });

  it("renders expenses with a typographic minus and without danger color", () => {
    const summary = makeSummary();
    mockUseDashboardSummary.mockReturnValue({
      summary,
      isLoading: false,
      error: null,
      retry: vi.fn(),
    });
    renderScreen();
    const expenseAmount = screen.getByText("−$1,000.00");
    expect(expenseAmount).toBeInTheDocument();
    expect(expenseAmount).not.toHaveClass("text-danger");
  });
});
