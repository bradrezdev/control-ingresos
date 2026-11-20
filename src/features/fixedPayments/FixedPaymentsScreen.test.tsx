/**
 * Tests for the redesigned Pagos fijos screen (redesign-ui-2026, T6).
 *
 * The data hook is mocked (same pattern as the dashboard / cards tests)
 * and the summaries are built with the real `computeFixedPaymentsSummary`
 * so the assertions track the true screen behavior: month total in the
 * hero, "Este mes" / "Próximos" grouping, frequency chips, the empty
 * state with its action, and the loading / error states.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { computeFixedPaymentsSummary } from "./computeFixedPaymentsSummary";
import { useFixedPaymentsSummary } from "./useFixedPaymentsSummary";
import { FixedPaymentsScreen } from "./FixedPaymentsScreen";
import type { FixedPaymentsScreenProps } from "./FixedPaymentsScreen";
import type { FixedPaymentsSummary, SelectedMonth } from "./types";
import type { FixedPayment } from "@/db/schemas/fixedPayment";

vi.mock("./useFixedPaymentsSummary", () => ({
  useFixedPaymentsSummary: vi.fn(),
}));

const mockUseFixedPaymentsSummary = vi.mocked(useFixedPaymentsSummary);

const today = new Date(2026, 10, 20, 15, 0);

const renta: FixedPayment = {
  id: "fp-1",
  amount: 500_000,
  description: "Renta",
  paymentDay: 1,
  period: "monthly",
  paymentMethod: "debit",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const seguro: FixedPayment = {
  id: "fp-2",
  amount: 200_000,
  description: "Seguro de auto",
  paymentDay: 15,
  period: "bimonthly",
  paymentMethod: "cash",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

function makeSummary(
  fixedPayments: FixedPayment[],
  selectedMonth: SelectedMonth = "current",
): FixedPaymentsSummary {
  return computeFixedPaymentsSummary(fixedPayments, "MXN", selectedMonth, {
    today,
  });
}

function mockReady(summary: FixedPaymentsSummary): void {
  mockUseFixedPaymentsSummary.mockReturnValue({
    summary,
    isLoading: false,
    error: null,
    retry: vi.fn(),
  });
}

function renderScreen(
  handlers: Partial<Pick<FixedPaymentsScreenProps, "onCreate" | "onSelect">> = {},
): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <FixedPaymentsScreen
        onCreate={handlers.onCreate ?? vi.fn()}
        onSelect={handlers.onSelect ?? vi.fn()}
      />
    </MemoryRouter>,
  );
}

describe("FixedPaymentsScreen", () => {
  beforeEach(() => {
    mockUseFixedPaymentsSummary.mockReset();
  });

  it("shows a skeleton while the data resolves", () => {
    mockUseFixedPaymentsSummary.mockReturnValue({
      summary: undefined,
      isLoading: true,
      error: null,
      retry: vi.fn(),
    });
    renderScreen();

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText(/Pagos fijos de/)).not.toBeInTheDocument();
    expect(screen.queryByText("Este mes")).not.toBeInTheDocument();
  });

  it("shows an error message with a retry action", async () => {
    const retry = vi.fn();
    mockUseFixedPaymentsSummary.mockReturnValue({
      summary: undefined,
      isLoading: false,
      error: new Error("boom"),
      retry,
    });
    renderScreen();

    expect(
      screen.getByText("No se pudieron cargar tus pagos fijos"),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalled();
  });

  it("shows the empty state with a message and an add action", async () => {
    const onCreate = vi.fn();
    mockReady(makeSummary([]));
    renderScreen({ onCreate });

    expect(screen.getByText("Sin pagos fijos todavía")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Agrega rentas, servicios o suscripciones para ver cuánto debes cada mes.",
      ),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Agrega tu primer pago fijo" }),
    );
    expect(onCreate).toHaveBeenCalled();
  });

  it("renders the month total in the hero card", () => {
    mockReady(makeSummary([renta, seguro]));
    renderScreen();

    expect(screen.getByText("Pagos fijos de noviembre")).toBeInTheDocument();
    expect(screen.getByText("$5,000")).toBeInTheDocument();
    expect(screen.getByText(".00")).toBeInTheDocument();
    expect(screen.getByText("1 pago programado")).toBeInTheDocument();
  });

  it("groups a monthly payment under 'Este mes' and a bimonthly under 'Próximos'", () => {
    mockReady(makeSummary([renta, seguro]));
    renderScreen();

    const thisMonthCard = screen.getByText("Este mes").closest("section");
    const upcomingCard = screen.getByText("Próximos").closest("section");
    expect(thisMonthCard).not.toBeNull();
    expect(upcomingCard).not.toBeNull();

    const due = within(thisMonthCard as HTMLElement);
    const upcoming = within(upcomingCard as HTMLElement);

    expect(due.getByText("Renta")).toBeInTheDocument();
    expect(due.getByText("Día 1")).toBeInTheDocument();
    expect(due.getByText("$5,000.00")).toBeInTheDocument();

    expect(upcoming.getByText("Seguro de auto")).toBeInTheDocument();
    expect(upcoming.getByText("Día 15")).toBeInTheDocument();
    expect(upcoming.getByText("$2,000.00")).toBeInTheDocument();
  });

  it("labels each row with its frequency chip", () => {
    mockReady(makeSummary([renta, seguro]));
    renderScreen();

    const thisMonthCard = screen.getByText("Este mes").closest("section");
    const upcomingCard = screen.getByText("Próximos").closest("section");
    const due = within(thisMonthCard as HTMLElement);
    const upcoming = within(upcomingCard as HTMLElement);

    expect(due.getByText("Mensual")).toBeInTheDocument();
    expect(upcoming.getByText("Bimestral")).toBeInTheDocument();
  });

  it("does not invent an exact due date for upcoming payments", () => {
    mockReady(makeSummary([renta, seguro]));
    renderScreen();

    const upcomingCard = screen.getByText("Próximos").closest("section");
    const upcoming = within(upcomingCard as HTMLElement);

    // The engine exposes no next-occurrence date: the row must only show
    // the payment day and the frequency chip.
    expect(
      upcoming.queryByText(/de noviembre|de diciembre|15 de/),
    ).not.toBeInTheDocument();
  });

  it("forwards a row tap as a select intent", async () => {
    const onSelect = vi.fn();
    mockReady(makeSummary([renta, seguro]));
    renderScreen({ onSelect });

    await userEvent.click(screen.getByRole("button", { name: /Renta/ }));
    expect(onSelect).toHaveBeenCalledWith(renta);
  });

  it("queries the next month when the segmented control changes", async () => {
    mockReady(makeSummary([renta, seguro], "current"));
    renderScreen();

    expect(mockUseFixedPaymentsSummary).toHaveBeenCalledWith("current");

    await userEvent.click(screen.getByRole("button", { name: "Diciembre" }));
    expect(mockUseFixedPaymentsSummary).toHaveBeenLastCalledWith("next");
  });
});
