/**
 * MsiPurchasesScreen — control-ingresos (Tarjetas · Mis finanzas)
 *
 * Pruebas de la pantalla de compras a meses: resumen, filtro, lista,
 * estados vacíos y navegación a la ficha.
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { MsiPurchasesScreen } from "./MsiPurchasesScreen";
import { formatCurrency } from "@/lib/money/format";
import type { WalletMsiPurchase } from "@/engine/wallet";
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

const MP: Card = {
  ...PLATA,
  id: "22222222-2222-4222-8222-222222222222",
  bank: "Mercado Pago",
  cutDay: 27,
  daysToPayAfterCut: 11,
  creditLimit: 5_380_000,
  priority: 1,
  skin: "ocean",
};

const PURCHASES: WalletMsiPurchase[] = [
  {
    id: "p-galaxy",
    cardId: MP.id,
    cardName: MP.bank,
    description: "Galaxy S26 Papá",
    term: 24,
    installmentsLeft: 19,
    remainingCents: 1_410_104,
    monthlyCents: 74_216,
  },
  {
    id: "p-ipad",
    cardId: MP.id,
    cardName: MP.bank,
    description: "iPad Air",
    term: 24,
    installmentsLeft: 20,
    remainingCents: 1_143_520,
    monthlyCents: 57_176,
  },
  {
    id: "p-monitor",
    cardId: PLATA.id,
    cardName: PLATA.bank,
    description: "Monitor Sansung",
    term: 12,
    installmentsLeft: 7,
    remainingCents: 96_243,
    monthlyCents: 13_749,
  },
];

const TERMS = [24, 12];

function renderScreen(
  props: Partial<React.ComponentProps<typeof MsiPurchasesScreen>> = {},
) {
  const defaults: React.ComponentProps<typeof MsiPurchasesScreen> = {
    month: "2026-11",
    purchases: PURCHASES,
    terms: TERMS,
    selectedTerm: null,
    currency: "MXN",
    onSelectTerm: vi.fn(),
    onOpenPurchase: vi.fn(),
  };

  return {
    props: { ...defaults, ...props },
    ...render(
      <MemoryRouter>
        <MsiPurchasesScreen {...defaults} {...props} />
      </MemoryRouter>,
    ),
  };
}

describe("MsiPurchasesScreen", () => {
  it("muestra el encabezado con enlace de regreso", () => {
    renderScreen();

    expect(screen.getByRole("heading", { name: "Compras a meses" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver" })).toHaveAttribute("href", "/cards");
  });

  it("muestra el saldo restante total de las compras visibles", () => {
    renderScreen();

    const total = PURCHASES.reduce((sum, p) => sum + p.remainingCents, 0);
    const hero = screen.getByLabelText("Resumen de compras a meses");

    expect(screen.getByText("Saldo restante estimado")).toBeInTheDocument();
    expect(hero.textContent).toContain(formatCurrency(total, "MXN"));
    expect(screen.getByText("3 compras activas")).toBeInTheDocument();
  });

  it("actualiza el resumen cuando hay un filtro de plazo", () => {
    const filtered = PURCHASES.filter((p) => p.term === 12);
    renderScreen({ purchases: filtered, selectedTerm: 12 });

    const total = filtered.reduce((sum, p) => sum + p.remainingCents, 0);
    const hero = screen.getByLabelText("Resumen de compras a meses");

    expect(hero.textContent).toContain(formatCurrency(total, "MXN"));
    expect(screen.getByText("1 compra activa a 12 meses")).toBeInTheDocument();
  });

  it("renderiza la lista con descripción, tarjeta, cuotas e importe", () => {
    renderScreen();

    const list = screen.getByRole("list");
    const rows = within(list).getAllByRole("listitem");

    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("Galaxy S26 Papá");
    expect(rows[0]).toHaveTextContent("Mercado Pago");
    expect(rows[0]).toHaveTextContent("19 cuotas por cubrir");
    expect(rows[0]).toHaveTextContent(formatCurrency(1_410_104, "MXN"));
  });

  it("navega a la ficha de una compra", async () => {
    const user = userEvent.setup();
    const onOpenPurchase = vi.fn();

    renderScreen({ onOpenPurchase });

    await user.click(screen.getByRole("button", { name: /Galaxy S26 Papá/ }));

    expect(onOpenPurchase).toHaveBeenCalledWith("p-galaxy", "2026-11");
  });

  it("ofrece quitar el filtro cuando hay un plazo activo", async () => {
    const user = userEvent.setup();
    const onSelectTerm = vi.fn();

    renderScreen({
      purchases: PURCHASES.filter((p) => p.term === 12),
      selectedTerm: 12,
      onSelectTerm,
    });

    await user.click(screen.getByRole("button", { name: "Quitar filtro" }));

    expect(onSelectTerm).toHaveBeenCalledWith(null);
  });

  it("muestra el mensaje vacío cuando no hay compras a meses", () => {
    renderScreen({ purchases: [], terms: [] });

    expect(screen.getByText("Sin compras a meses activas.")).toBeInTheDocument();
  });

  it("muestra el mensaje vacío cuando el filtro no arroja resultados", () => {
    renderScreen({ purchases: [], terms: TERMS, selectedTerm: 18 });

    expect(screen.getByText("Sin compras activas a 18 meses.")).toBeInTheDocument();
  });

  it("muestra los plazos disponibles", () => {
    renderScreen();

    const nav = screen.getByRole("navigation", { name: "Filtrar compras por plazo" });

    expect(within(nav).getByRole("button", { name: "24 meses" })).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: "12 meses" })).toBeInTheDocument();
  });
});
