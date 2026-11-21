/**
 * Tests for the fixed payment detail sheet content (redesign-ui-2026, T6).
 *
 * The card lookup hook is mocked so no Dexie query runs here: the
 * account falls back to the payment-method label, which is the behavior
 * under test for payments without an associated card.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FixedPaymentDetail } from "./FixedPaymentDetail";
import type { FixedPayment } from "@/db/schemas/fixedPayment";

vi.mock("@/hooks/useLiveCards", () => ({
  useLiveCards: vi.fn(() => undefined),
}));

const renta: FixedPayment = {
  id: "fp-1",
  amount: 500_000,
  description: "Renta",
  paymentDay: 1,
  period: "monthly",
  paymentMethod: "cash",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("FixedPaymentDetail", () => {
  it("renders the charge amount, account, frequency and day", () => {
    render(
      <FixedPaymentDetail
        fixedPayment={renta}
        currency="MXN"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("$5,000.00")).toBeInTheDocument();
    expect(screen.getByText("Importe por cargo")).toBeInTheDocument();
    expect(screen.getByText("Efectivo")).toBeInTheDocument();
    expect(screen.getByText("Mensual")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.queryByText("Meses sin intereses")).not.toBeInTheDocument();
  });

  it("forwards the edit and delete intents with the fixed payment", async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <FixedPaymentDetail
        fixedPayment={renta}
        currency="MXN"
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /Editar/ }));
    expect(onEdit).toHaveBeenCalledWith(renta);

    await userEvent.click(screen.getByRole("button", { name: /Eliminar/ }));
    expect(onDelete).toHaveBeenCalledWith(renta);
  });

  it("shows the MSI term when the payment is on installments", () => {
    const msi: FixedPayment = {
      ...renta,
      paymentMethod: "credit",
      cardId: "card-1",
      msiMonths: 12,
    };
    render(
      <FixedPaymentDetail
        fixedPayment={msi}
        currency="MXN"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("Meses sin intereses")).toBeInTheDocument();
    expect(screen.getByText("12 meses")).toBeInTheDocument();
  });
});
