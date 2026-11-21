/**
 * CardsScreen — control-ingresos (Tarjetas · Mis finanzas)
 *
 * Pruebas de la pantalla con el modelo de vista ya construido: la
 * aritmética vive en `src/engine/wallet.ts` y aquí se comprueba el
 * orden de las secciones, el texto visible y las acciones.
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { CardsScreen } from "./CardsScreen";
import type { WalletView } from "./wallet";
import type { WalletPayment } from "@/engine/wallet";
import type { Card } from "@/db/schemas";

const PLATA: Card = {
  id: "11111111-1111-4111-8111-111111111111",
  bank: "PLATA",
  holderName: "Bryan Nuñez",
  cardType: "credit",
  cutDay: 22,
  daysToPayAfterCut: 31,
  creditLimit: 2_550_000,
  priority: 0,
  skin: "silver",
  archived: false,
  createdAt: "2026-01-01T12:00:00.000Z",
  updatedAt: "2026-01-01T12:00:00.000Z",
};

const STORI: Card = {
  ...PLATA,
  id: "33333333-3333-4333-8333-333333333333",
  bank: "Stori",
  cutDay: 13,
  daysToPayAfterCut: 22,
  creditLimit: 1_200_000,
  priority: 1,
  skin: "forest",
};

const REF = new Date("2026-11-20T00:00:00.000Z");

function usage(card: Card, limit: number, used: number) {
  return {
    card,
    limitCents: limit,
    usedCents: used,
    availableCents: limit - used,
    percent: Math.round((used / limit) * 100),
    plans: [],
    singlePurchases: [],
  };
}

function buildView(overrides: Partial<WalletView> = {}): WalletView {
  const usages = [usage(PLATA, 2_550_000, 320_782), usage(STORI, 1_200_000, 0)];

  return {
    currency: "MXN",
    referenceDate: REF,
    cards: [PLATA, STORI],
    usages,
    portfolio: {
      limitCents: 3_750_000,
      usedCents: 320_782,
      availableCents: 3_429_218,
      percent: 9,
      cardCount: 2,
    },
    payments: [
      {
        card: PLATA,
        cut: new Date("2026-10-22T00:00:00.000Z"),
        due: new Date("2026-11-22T00:00:00.000Z"),
        daysLeft: 2,
        installments: [],
        purchases: [],
        fixed: [],
        totalCents: 45_826,
      },
    ],
    purchases: [
      {
        id: "p1",
        cardId: PLATA.id,
        cardName: "PLATA",
        description: "Galaxy S26 Papá",
        term: 24,
        installmentsLeft: 19,
        remainingCents: 1_410_104,
        monthlyCents: 74_200,
      },
    ],
    terms: [24],
    archived: [],
    selectedCardId: PLATA.id,
    selectedUsage: usages[0] ?? null,
    selectedDeadline: {
      cut: new Date("2026-10-22T00:00:00.000Z"),
      due: new Date("2026-11-22T00:00:00.000Z"),
      daysLeft: 2,
    },
    selectedCycle: {
      start: new Date("2026-09-23T00:00:00.000Z"),
      cut: new Date("2026-10-22T00:00:00.000Z"),
      due: new Date("2026-11-22T00:00:00.000Z"),
    },
    ...overrides,
  };
}

type ScreenHandlers = Partial<{
  onCreate: () => void;
  onSelectCard: (cardId: string) => void;
  onOpenInfo: () => void;
  onOpenPayment: (payment: WalletPayment) => void;
  onOpenCard: (cardId: string) => void;
  onOpenMenu: (cardId: string) => void;
  onOpenReorder: () => void;
  onOpenArchived: () => void;
  onOpenAllPurchases: () => void;
}>;

function renderScreen(view: WalletView, handlers: ScreenHandlers = {}) {
  const props = {
    view,
    onCreate: vi.fn(),
    onSelectCard: vi.fn(),
    onOpenInfo: vi.fn(),
    onOpenPayment: vi.fn(),
    onOpenCard: vi.fn(),
    onOpenMenu: vi.fn(),
    onOpenReorder: vi.fn(),
    onOpenArchived: vi.fn(),
    onOpenAllPurchases: vi.fn(),
    ...handlers,
  };

  return {
    props,
    ...render(
      <MemoryRouter>
        <CardsScreen {...props} />
      </MemoryRouter>,
    ),
  };
}

describe("CardsScreen", () => {
  it("muestra las secciones en el orden de la referencia", () => {
    renderScreen(buildView());

    const headings = screen
      .getAllByRole("heading")
      .map((heading) => heading.textContent);
    expect(headings).toEqual([
      "Tarjetas",
      "Mi cartera",
      "Próximos pagos",
      "Compras a meses",
    ]);
  });

  it("abre la ficha de la tarjeta desde el plástico", async () => {
    const user = userEvent.setup();
    const { props } = renderScreen(buildView());

    await user.click(screen.getByRole("button", { name: /Ver detalle de PLATA/ }));

    expect(props.onOpenCard).toHaveBeenCalledWith(PLATA.id);
  });

  it("marca la tarjeta elegida en el selector", async () => {
    const user = userEvent.setup();
    const { props } = renderScreen(buildView());

    const selector = screen.getByRole("group", { name: "Seleccionar tarjeta" });
    expect(within(selector).getByRole("button", { name: "PLATA" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(selector).getByRole("button", { name: "Stori" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    await user.click(within(selector).getByRole("button", { name: "Stori" }));

    expect(props.onSelectCard).toHaveBeenCalledWith(STORI.id);
  });

  it("ofrecee reordenar sólo con dos o más tarjetas", () => {
    const { unmount } = renderScreen(buildView());
    expect(screen.getByRole("button", { name: "Reordenar" })).toBeInTheDocument();
    unmount();

    renderScreen(
      buildView({ cards: [PLATA], usages: [usage(PLATA, 2_550_000, 320_782)] }),
    );
    expect(screen.queryByRole("button", { name: "Reordenar" })).toBeNull();
  });

  it("muestra el estado vacío de la cartera", () => {
    renderScreen(
      buildView({
        cards: [],
        usages: [],
        payments: [],
        purchases: [],
        selectedCardId: null,
        selectedUsage: null,
        selectedDeadline: null,
        selectedCycle: null,
        portfolio: {
          limitCents: 0,
          usedCents: 0,
          availableCents: 0,
          percent: 0,
          cardCount: 0,
        },
      }),
    );

    expect(
      screen.getByText("Aún no tienes tarjetas registradas."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agregar tarjeta" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Próximos pagos" })).toBeNull();
  });

  it("abre el desglose del próximo pago desde la cápsula ámbar", async () => {
    const user = userEvent.setup();
    const { props } = renderScreen(buildView());

    await user.click(screen.getByRole("button", { name: /PLATA · En 2 días/ }));

    expect(props.onOpenPayment).toHaveBeenCalled();
  });

  it("ofrecece ver todas las compras sólo cuando hay más de tres", () => {
    const purchases = Array.from({ length: 4 }, (_, index) => ({
      id: `p${index}`,
      cardId: PLATA.id,
      cardName: "PLATA",
      description: `Compra ${index + 1}`,
      term: 12,
      installmentsLeft: 6,
      remainingCents: 100_000,
      monthlyCents: 10_000,
    }));

    renderScreen(buildView({ purchases }));
    expect(screen.getByRole("button", { name: "Ver las 4" })).toBeInTheDocument();
  });

  it("no muestra el enlace de compras cuando hay tres o menos", () => {
    renderScreen(buildView());
    expect(screen.queryByRole("button", { name: /^Ver las/ })).toBeNull();
  });

  it("muestra los mensajes vacíos de pagos y compras a meses", () => {
    renderScreen(buildView({ payments: [], purchases: [] }));

    expect(screen.getByText("Sin pagos previstos.")).toBeInTheDocument();
    expect(screen.getByText("Sin compras a meses activas.")).toBeInTheDocument();
  });
});
