import { describe, expect, it, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { Transactions } from "@/pages/Transactions";
import { db } from "@/db/database";
import { transactionsRepo, cardsRepo, settingsRepo } from "@/db/repositories";
import { useUiStore } from "@/stores/uiStore";
import type { CardInput } from "@/db/schemas/card";
import type { TransactionInput } from "@/db/schemas/transaction";

const originalIntersectionObserver = globalThis.IntersectionObserver;
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();
const mockIntersectionObserver = vi.fn(() => ({
  observe: mockObserve,
  disconnect: mockDisconnect,
  takeRecords: () => [],
  root: null,
  rootMargin: "",
  thresholds: [],
}));

const cardInput: CardInput = {
  bank: "Stori",
  holderName: "Usuario",
  cardType: "credit",
  cutDay: 15,
  daysToPayAfterCut: 5,
  creditLimit: 100_000,
  priority: 0,
};

function expenseInput(index: number, date: string, cardId?: string): TransactionInput {
  return {
    type: "expense",
    amount: 100_00 + index,
    currency: "MXN",
    description: `Gasto ${index}`,
    date,
    category: "Comida",
    paymentMethod: cardId ? "credit" : "cash",
    ...(cardId ? { cardId } : {}),
  } as TransactionInput;
}

function renderPage(): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/transactions" }]}>
      <Transactions />
    </MemoryRouter>,
  );
}

describe("Transactions page (redesign)", () => {
  beforeAll(() => {
    globalThis.IntersectionObserver = mockIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  afterAll(() => {
    globalThis.IntersectionObserver = originalIntersectionObserver;
  });

  beforeEach(async () => {
    await db.cards.clear();
    await db.transactions.clear();
    await db.settings.clear();
    useUiStore.getState().setCurrentMonth("2026-11");
  });

  it("groups transactions by day and shows the daily total", async () => {
    const card = await cardsRepo.create(cardInput);
    await transactionsRepo.create({
      ...expenseInput(1, "2026-11-05", card.id),
      description: "Cena",
    });
    await transactionsRepo.create({
      ...expenseInput(2, "2026-11-05", card.id),
      description: "Taxi",
      category: "Transporte",
    });
    await settingsRepo.update({ monthlyLimit: 100_000, currency: "MXN" });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("5 de noviembre")).toBeInTheDocument();
    });
    expect(screen.getByText("Cena")).toBeInTheDocument();
    expect(screen.getByText("Taxi")).toBeInTheDocument();
  });

  it("filters the list when the Gastos quick filter is selected", async () => {
    const user = userEvent.setup();
    const card = await cardsRepo.create(cardInput);
    await transactionsRepo.create({
      ...expenseInput(1, "2026-11-05", card.id),
      description: "Cena",
    });
    await transactionsRepo.create({
      type: "income",
      amount: 50_00,
      currency: "MXN",
      description: "Reembolso",
      date: "2026-11-05",
      category: "Otros",
      paymentMethod: "transfer",
    } satisfies TransactionInput);
    await settingsRepo.update({ monthlyLimit: 100_000, currency: "MXN" });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Cena")).toBeInTheDocument();
    });
    expect(screen.getByText("Reembolso")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Gastos" }));
    await waitFor(() => {
      expect(screen.queryByText("Reembolso")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Cena")).toBeInTheDocument();
  });

  it("shows the MSI installment badge for purchases a meses", async () => {
    const card = await cardsRepo.create(cardInput);
    await transactionsRepo.create({
      type: "expense_msi",
      amount: 240_00,
      currency: "MXN",
      description: "Televisión",
      date: "2026-11-01",
      category: "Hogar",
      paymentMethod: "credit",
      cardId: card.id,
      msiMonths: 12,
      msiStartDate: "2026-11-01",
    } as TransactionInput);
    await settingsRepo.update({ monthlyLimit: 100_000, currency: "MXN" });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Televisión")).toBeInTheDocument();
    });
    expect(screen.getByText("1/12 meses")).toBeInTheDocument();
  });

  it("switches MSI rows between installment date and purchase date", async () => {
    const user = userEvent.setup();
    const card = await cardsRepo.create(cardInput);
    await transactionsRepo.create({
      type: "expense_msi",
      amount: 240_00,
      currency: "MXN",
      description: "Consola",
      date: "2026-09-15",
      category: "Tecnología",
      paymentMethod: "credit",
      cardId: card.id,
      msiMonths: 12,
      msiStartDate: "2026-09-15",
    } as TransactionInput);
    await settingsRepo.update({ monthlyLimit: 100_000, currency: "MXN" });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Sin movimientos en noviembre")).toBeInTheDocument();
    });

    // Vista MSI por fecha de cuota (por defecto): la cuota 3 cae en noviembre.
    await user.click(screen.getByRole("button", { name: "MSI" }));
    await waitFor(() => {
      expect(screen.getByText("Consola")).toBeInTheDocument();
    });
    expect(screen.getByText("3/12 meses")).toBeInTheDocument();

    // Vista por fecha de compra: la compra es de septiembre, no aparece en noviembre.
    await user.click(screen.getByRole("button", { name: "Por fecha de compra" }));
    await waitFor(() => {
      expect(screen.queryByText("Consola")).not.toBeInTheDocument();
    });
  });

  it("loads 20 rows initially and shows a load-more button", async () => {
    const user = userEvent.setup();
    const card = await cardsRepo.create(cardInput);
    const promises: Promise<unknown>[] = [];
    for (let i = 0; i < 25; i += 1) {
      promises.push(transactionsRepo.create(expenseInput(i, "2026-11-05", card.id)));
    }
    await Promise.all(promises);
    await settingsRepo.update({ monthlyLimit: 100_000, currency: "MXN" });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Cargar más movimientos" })).toBeInTheDocument();
    });
    expect(screen.queryAllByText(/^Gasto \d+$/)).toHaveLength(20);

    await user.click(screen.getByRole("button", { name: "Cargar más movimientos" }));
    await waitFor(() => {
      expect(screen.queryAllByText(/^Gasto \d+$/)).toHaveLength(25);
    });
    expect(screen.queryByRole("button", { name: "Cargar más movimientos" })).not.toBeInTheDocument();
  });

  it("shows an empty state with the month and an add action", async () => {
    const user = userEvent.setup();
    await cardsRepo.create(cardInput);
    await settingsRepo.update({ monthlyLimit: 100_000, currency: "MXN" });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Sin movimientos en noviembre")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Agregar movimiento" }));
    expect(screen.getByText("Nueva transacción")).toBeInTheDocument();
  });

  it("removes an applied advanced filter through its chip", async () => {
    const user = userEvent.setup();
    await transactionsRepo.create(expenseInput(1, "2026-11-05"));
    await transactionsRepo.create({
      type: "income",
      amount: 50_00,
      currency: "MXN",
      description: "Reembolso",
      date: "2026-11-05",
      category: "Otros",
      paymentMethod: "transfer",
    } as TransactionInput);
    await settingsRepo.update({ monthlyLimit: 100_000, currency: "MXN" });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Reembolso")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Abrir filtros" }));
    await user.type(screen.getByLabelText("Categoría"), "Comida");
    await user.click(screen.getByRole("button", { name: "Aplicar" }));

    await waitFor(() => {
      expect(screen.queryByText("Reembolso")).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Quitar filtro Comida" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Quitar filtro Comida" }));
    await waitFor(() => {
      expect(screen.getByText("Reembolso")).toBeInTheDocument();
    });
  });

  it("opens the detail sheet with the installment progress bar", async () => {
    const user = userEvent.setup();
    const card = await cardsRepo.create(cardInput);
    await transactionsRepo.create({
      type: "expense_msi",
      amount: 240_00,
      currency: "MXN",
      description: "Televisión",
      date: "2026-11-01",
      category: "Hogar",
      paymentMethod: "credit",
      cardId: card.id,
      msiMonths: 12,
      msiStartDate: "2026-11-01",
    } as TransactionInput);
    await settingsRepo.update({ monthlyLimit: 100_000, currency: "MXN" });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Televisión")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Televisión"));
    await waitFor(() => {
      expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });
    expect(screen.getByText("Cuota 1 de 12")).toBeInTheDocument();
  });
});
