import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Card } from "@/db/schemas";
import type { WalletPayment, WalletPaymentCharge } from "@/engine/wallet";
import {
  PaymentDetailSheet,
  type PaymentDetailSheetProps,
} from "./PaymentDetailSheet";

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

function createCharge(overrides?: Partial<WalletPaymentCharge>): WalletPaymentCharge {
  return {
    id: "charge-1",
    description: "Cargo",
    date: new Date("2026-11-22T00:00:00.000Z"),
    cents: 10_000,
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

function renderSheet(props: Partial<PaymentDetailSheetProps> = {}) {
  const onClose = vi.fn();
  const onOpenCard = vi.fn();
  const payment = createPayment();
  const defaultProps: PaymentDetailSheetProps = {
    payment,
    currency: "MXN",
    onClose,
    onOpenCard,
  };

  render(<PaymentDetailSheet {...defaultProps} {...props} />);

  return { onClose, onOpenCard, payment: props.payment ?? payment };
}

describe("PaymentDetailSheet", () => {
  it("renderiza el título con el nombre de la tarjeta", () => {
    const { payment } = renderSheet();
    expect(
      screen.getByRole("heading", { name: `Pago previsto de ${payment.card.bank}` }),
    ).toBeInTheDocument();
  });

  it("muestra el importe destacado, la fecha de vencimiento y la fecha de corte", () => {
    const payment = createPayment({ totalCents: 45_826 });
    renderSheet({ payment });

    expect(screen.getByText("$458.26")).toBeInTheDocument();
    expect(screen.getByText(/Vence el/)).toBeInTheDocument();
    expect(screen.getByText("Fecha de corte")).toBeInTheDocument();
  });

  it("muestra el desglose en el orden correcto cuando los tres grupos tienen cargos", () => {
    const payment = createPayment({
      installments: [
        createCharge({
          id: "inst-1",
          description: "Monitor",
          cents: 13_749,
          installment: { n: 6, of: 12 },
        }),
      ],
      purchases: [createCharge({ id: "pur-1", description: "Despensa", cents: 5_000 })],
      fixed: [createCharge({ id: "fix-1", description: "Gasolina", cents: 3_000 })],
      totalCents: 21_749,
    });
    renderSheet({ payment });

    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings[0]).toHaveTextContent("Compras a meses");
    expect(headings[1]).toHaveTextContent("Compras de un solo pago");
    expect(headings[2]).toHaveTextContent("Pagos fijos previstos");

    expect(screen.getByText(/Cuota 6 de 12/)).toBeInTheDocument();
  });

  it("omite los grupos que no tienen cargos", () => {
    const payment = createPayment({
      purchases: [createCharge({ id: "pur-1", description: "Despensa", cents: 5_000 })],
      totalCents: 5_000,
    });
    renderSheet({ payment });

    expect(screen.getByText("Compras de un solo pago")).toBeInTheDocument();
    expect(screen.queryByText("Compras a meses")).not.toBeInTheDocument();
    expect(screen.queryByText("Pagos fijos previstos")).not.toBeInTheDocument();
  });

  it("muestra cada fila con descripción, fecha e importe", () => {
    const payment = createPayment({
      fixed: [
        createCharge({
          id: "fix-1",
          description: "Gasolina",
          date: new Date("2026-11-22T00:00:00.000Z"),
          cents: 30_000,
        }),
      ],
      totalCents: 30_000,
    });
    renderSheet({ payment });

    expect(screen.getByText("Gasolina")).toBeInTheDocument();
    expect(screen.getAllByText("$300.00").length).toBeGreaterThanOrEqual(1);
  });

  it("el botón Ver tarjeta invoca onOpenCard", async () => {
    const { onOpenCard } = renderSheet();
    const button = screen.getByRole("button", { name: "Ver tarjeta" });
    await userEvent.click(button);
    expect(onOpenCard).toHaveBeenCalled();
  });

  it("el botón de cierre invoca onClose", async () => {
    const { onClose } = renderSheet();
    const close = screen.getByRole("button", { name: "Cerrar" });
    await userEvent.click(close);
    expect(onClose).toHaveBeenCalled();
  });
});
