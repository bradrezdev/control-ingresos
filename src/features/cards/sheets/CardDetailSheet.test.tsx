import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Card, DirectExpense } from "@/db/schemas";
import type { WalletMsiPlan, WalletPayment } from "@/engine/wallet";
import {
  CardDetailSheet,
  type CardDetailSheetProps,
} from "./CardDetailSheet";

function createCard(overrides?: Partial<Card>): Card {
  return {
    id: "card-1",
    bank: "PLATA",
    holderName: "Bryan Nuñez",
    cardType: "credit",
    cutDay: 22,
    daysToPayAfterCut: 31,
    creditLimit: 2_550_000,
    priority: 0,
    skin: "silver",
    archived: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function createTransaction(overrides?: Partial<DirectExpense>): DirectExpense {
  return {
    id: "tx-1",
    amount: 10_000,
    currency: "MXN",
    description: "Despensa",
    date: "2026-11-15",
    category: "Supermercado",
    type: "expense",
    paymentMethod: "credit",
    cardId: "card-1",
    ...overrides,
  };
}

function createMsiPlan(overrides?: Partial<WalletMsiPlan>): WalletMsiPlan {
  return {
    id: "plan-1",
    cardId: "card-1",
    description: "Monitor",
    monthsTotal: 12,
    installments: [],
    pending: [],
    remainingCents: 96_243,
    installmentsLeft: 7,
    currentInstallment: 6,
    monthlyCents: 13_749,
    ...overrides,
  };
}

function createPayment(overrides?: Partial<WalletPayment>): WalletPayment {
  return {
    card: createCard(),
    cut: new Date("2026-11-22T00:00:00.000Z"),
    due: new Date("2026-12-23T00:00:00.000Z"),
    daysLeft: 33,
    installments: [],
    purchases: [],
    fixed: [],
    totalCents: 0,
    ...overrides,
  };
}

function renderSheet(props: Partial<CardDetailSheetProps> = {}) {
  const onTabChange = vi.fn();
  const onClose = vi.fn();
  const onEdit = vi.fn();
  const onViewHistory = vi.fn();

  const card = createCard();
  const defaultProps: CardDetailSheetProps = {
    card,
    tab: "resumen",
    onTabChange,
    transactions: [],
    plans: [],
    payment: null,
    currency: "MXN",
    onClose,
    onEdit,
    onViewHistory,
  };

  render(<CardDetailSheet {...defaultProps} {...props} />);

  return {
    onTabChange,
    onClose,
    onEdit,
    onViewHistory,
    card: props.card ?? card,
  };
}

describe("CardDetailSheet", () => {
  it("renderiza el título con el nombre de la tarjeta", () => {
    const { card } = renderSheet();
    expect(screen.getByRole("heading", { name: card.bank })).toBeInTheDocument();
  });

  it("renderiza las tres pestañas con el texto correcto", () => {
    renderSheet();
    expect(screen.getByRole("tab", { name: "Resumen" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Movimientos" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "MSI" })).toBeInTheDocument();
  });

  it("la pestaña activa tiene aria-pressed=true y las demás false", () => {
    renderSheet({ tab: "actividad" });
    const resumen = screen.getByRole("tab", { name: "Resumen" });
    const movimientos = screen.getByRole("tab", { name: "Movimientos" });
    const msi = screen.getByRole("tab", { name: "MSI" });

    expect(resumen).toHaveAttribute("aria-pressed", "false");
    expect(movimientos).toHaveAttribute("aria-pressed", "true");
    expect(msi).toHaveAttribute("aria-pressed", "false");
  });

  it("cambiar de pestaña invoca onTabChange", async () => {
    const { onTabChange } = renderSheet({ tab: "resumen" });
    await userEvent.click(screen.getByRole("tab", { name: "MSI" }));
    expect(onTabChange).toHaveBeenCalledWith("msi");
  });

  it("la pestaña Resumen muestra el plástico y la sección Ciclo en curso", () => {
    renderSheet({ tab: "resumen" });
    expect(screen.getByText("Titular")).toBeInTheDocument();
    expect(screen.getByText("Ciclo en curso")).toBeInTheDocument();
  });

  it("la pestaña Resumen muestra Disponible estimado y Pago previsto", () => {
    const payment = createPayment({ totalCents: 45_826 });
    renderSheet({
      tab: "resumen",
      payment,
      transactions: [createTransaction()],
      plans: [createMsiPlan()],
    });

    expect(screen.getByText("Disponible estimado")).toBeInTheDocument();
    expect(screen.getByText("Pago previsto")).toBeInTheDocument();
    expect(screen.getByText("$458.26")).toBeInTheDocument();
  });

  it("la pestaña Resumen muestra 'Ver historial completo (N)'", async () => {
    const tx1 = createTransaction();
    const tx2 = createTransaction({ id: "tx-2", description: "Gasolina" });
    const { onViewHistory } = renderSheet({
      tab: "resumen",
      transactions: [tx1, tx2],
    });

    const link = screen.getByRole("button", { name: "Ver historial completo (2)" });
    expect(link).toBeInTheDocument();
    await userEvent.click(link);
    expect(onViewHistory).toHaveBeenCalled();
  });

  it("la pestaña Movimientos lista los movimientos con signo negativo", () => {
    renderSheet({
      tab: "actividad",
      transactions: [createTransaction({ amount: 12_500 })],
    });

    expect(screen.getByText("Despensa")).toBeInTheDocument();
    expect(screen.getByText("−$125.00")).toBeInTheDocument();
  });

  it("la pestaña Movimientos muestra estado vacío cuando no hay movimientos", () => {
    renderSheet({ tab: "actividad", transactions: [] });
    expect(screen.getByText("Sin movimientos.")).toBeInTheDocument();
  });

  it("la pestaña MSI lista los planes con cuotas y saldo pendiente", () => {
    const plan = createMsiPlan();
    renderSheet({ tab: "msi", plans: [plan] });

    expect(screen.getByText("Monitor")).toBeInTheDocument();
    expect(document.body.textContent).toContain("6 de 12");
    expect(screen.getByText("$962.43")).toBeInTheDocument();
  });

  it("la pestaña MSI muestra estado vacío cuando no hay planes", () => {
    renderSheet({ tab: "msi", plans: [] });
    expect(screen.getByText("Sin compras a meses activas.")).toBeInTheDocument();
  });

  it("el botón Editar tarjeta invoca onEdit", async () => {
    const { onEdit } = renderSheet();
    const button = screen.getByRole("button", { name: "Editar tarjeta" });
    await userEvent.click(button);
    expect(onEdit).toHaveBeenCalled();
  });

  it("el botón de cierre invoca onClose", async () => {
    const { onClose } = renderSheet();
    const close = screen.getByRole("button", { name: "Cerrar" });
    await userEvent.click(close);
    expect(onClose).toHaveBeenCalled();
  });
});
