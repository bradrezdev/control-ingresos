/**
 * Tests for the redesigned Tarjetas screen (redesign-ui-2026, T5).
 *
 * The screen data hook is mocked (same pattern as the dashboard tests):
 * these tests cover the three states (loading / empty / error), the
 * summary hero with the next due card, and the interaction callbacks.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import type { Card, Transaction } from "@/db/schemas";
import { computeCardAccount } from "./computeCardAccount";
import { computeWalletOverview } from "./computeCardAccount";
import { useCardAccounts } from "./useCardAccounts";
import { CardsScreen, type CardsScreenProps } from "./CardsScreen";
import type { CardAccount, WalletOverview } from "./types";

vi.mock("./useCardAccounts", () => ({
  useCardAccounts: vi.fn(),
}));

const mockUseCardAccounts = vi.mocked(useCardAccounts);

const today = new Date("2026-11-20T12:00:00Z");

const plata: Card = {
  id: "card-1",
  bank: "PLATA",
  holderName: "Bryan Núñez",
  cardType: "credit",
  cutDay: 19,
  daysToPayAfterCut: 3,
  creditLimit: 1_000_000,
  priority: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const bbva: Card = {
  id: "card-2",
  bank: "BBVA",
  holderName: "Bryan Núñez",
  cardType: "credit",
  cutDay: 5,
  daysToPayAfterCut: 10,
  creditLimit: 500_000,
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

function makeAccounts(): CardAccount[] {
  return [
    computeCardAccount(plata, [expense("p", "2026-11-10", 250_000)], today),
    computeCardAccount(
      bbva,
      [expense("b", "2026-11-10", 100_000, "card-2")],
      today,
    ),
  ];
}

function makeOverview(accounts: CardAccount[]): WalletOverview {
  return computeWalletOverview(accounts, "MXN");
}

function mockReady(
  accounts: CardAccount[],
  overview: WalletOverview,
): void {
  mockUseCardAccounts.mockReturnValue({
    accounts,
    overview,
    isLoading: false,
    error: null,
    retry: vi.fn(),
  });
}

function renderScreen(
  handlers: Partial<
    Pick<CardsScreenProps, "onCreate" | "onOpenMenu" | "onOpenDetail">
  > = {},
): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <CardsScreen
        onCreate={handlers.onCreate ?? vi.fn()}
        onOpenMenu={handlers.onOpenMenu ?? vi.fn()}
        onOpenDetail={handlers.onOpenDetail ?? vi.fn()}
      />
    </MemoryRouter>,
  );
}

describe("CardsScreen", () => {
  beforeEach(() => {
    mockUseCardAccounts.mockReset();
  });

  it("shows a skeleton while the data resolves", () => {
    mockUseCardAccounts.mockReturnValue({
      accounts: [],
      overview: null,
      isLoading: true,
      error: null,
      retry: vi.fn(),
    });
    renderScreen();

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("Disponible total")).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("shows an error message with a retry action", async () => {
    const retry = vi.fn();
    mockUseCardAccounts.mockReturnValue({
      accounts: [],
      overview: null,
      isLoading: false,
      error: new Error("boom"),
      retry,
    });
    renderScreen();

    expect(screen.getByText(/No se pudieron cargar/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalled();
  });

  it("shows the empty state with an add action", async () => {
    const onCreate = vi.fn();
    mockReady([], makeOverview([]));
    renderScreen({ onCreate });

    expect(screen.getByText("Agrega tu primera tarjeta")).toBeInTheDocument();
    // The header keeps its icon-only "Nueva tarjeta" button; the empty
    // state's action is the one with the visible label.
    await userEvent.click(screen.getByText("Nueva tarjeta"));
    expect(onCreate).toHaveBeenCalled();
  });

  it("renders the header with the reorder help copy", () => {
    mockReady(makeAccounts(), makeOverview(makeAccounts()));
    renderScreen();

    expect(screen.getByText("Tarjetas")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Mantén presionada el asa y arrastra para ordenar por prioridad.",
      ),
    ).toBeInTheDocument();
  });

  it("renders the hero with the total available and next due card", () => {
    const accounts = makeAccounts();
    mockReady(accounts, makeOverview(accounts));
    renderScreen();

    expect(screen.getByText("Disponible total")).toBeInTheDocument();
    expect(screen.getByText("Usado total")).toBeInTheDocument();
    expect(screen.getByText("$11,500")).toBeInTheDocument();
    expect(screen.getByText("Próximo vencimiento")).toBeInTheDocument();
    expect(screen.getByText("PLATA, en 2 días")).toBeInTheDocument();
  });

  it("omits the next due block when nothing is upcoming", () => {
    const accounts = makeAccounts();
    const overview = makeOverview(accounts);
    mockReady(accounts, { ...overview, nextDue: null });
    renderScreen();

    expect(screen.queryByText("Próximo vencimiento")).not.toBeInTheDocument();
  });

  it("renders every card block with its usage data", () => {
    const accounts = makeAccounts();
    mockReady(accounts, makeOverview(accounts));
    renderScreen();

    expect(screen.getAllByText(/Crédito|Débito/).length).toBeGreaterThan(0);
    expect(screen.getByText("PLATA")).toBeInTheDocument();
    expect(screen.getByText("BBVA")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
    expect(screen.getByText("Día 19")).toBeInTheDocument();
  });

  it("forwards detail, menu and create intents", async () => {
    const onOpenDetail = vi.fn();
    const onOpenMenu = vi.fn();
    const accounts = makeAccounts();
    mockReady(accounts, makeOverview(accounts));
    renderScreen({ onOpenDetail, onOpenMenu });

    await userEvent.click(
      screen.getByRole("button", { name: "Ver detalle de PLATA" }),
    );
    expect(onOpenDetail).toHaveBeenCalledWith(accounts[0]);

    await userEvent.click(
      screen.getByRole("button", { name: "Opciones de PLATA" }),
    );
    expect(onOpenMenu).toHaveBeenCalledWith(accounts[0]);
  });

  it("does not re-apply the shell page padding", () => {
    const accounts = makeAccounts();
    mockReady(accounts, makeOverview(accounts));
    const { container } = renderScreen();

    // The shell already owns the page padding (app-main). A screen that
    // adds it again insets the content twice, so the margins no longer
    // match the home screen.
    expect(container.querySelector(".app-main")).toBeNull();
  });
});
