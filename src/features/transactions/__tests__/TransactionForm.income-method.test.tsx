/**
 * TransactionForm paymentMethod options by type — control-ingresos
 *
 * When the user picks "Ingreso" as the transaction type, the only valid
 * `paymentMethod` values are "cash" (Efectivo) and "transfer"
 * (Transferencia) — the same restriction as the Zod `IncomeSchema`. The
 * account chips must reflect that: no card chips should appear, and if
 * the user changes the type mid-edit while holding an invalid method
 * (e.g. a debit card), the method must fall back to a valid chip
 * (Efectivo).
 *
 * PRESERVE (T7): same rules, asserted through the redesigned chip UI.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { within } from "@testing-library/react";
import { TransactionForm } from "../TransactionForm";
import type { Card } from "@/db/schemas/card";

const creditCard: Card = {
  id: "card-credit-1",
  bank: "Nu",
  holderName: "Usuario",
  cardType: "credit",
  cutDay: 15,
  daysToPayAfterCut: 5,
  creditLimit: 100_000,
  priority: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const debitCard: Card = {
  id: "card-debit-1",
  bank: "BBVA",
  holderName: "Usuario",
  cardType: "debit",
  priority: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function accountLabels(): string[] {
  const group = screen.getByRole("group", { name: "Tarjeta o cuenta" });
  return within(group)
    .getAllByRole("button")
    .map((button) => button.textContent ?? "");
}

describe("TransactionForm paymentMethod options by type", () => {
  it("type=income → sólo chips Efectivo y Transferencia", async () => {
    render(
      <TransactionForm
        currency="MXN"
        cards={[creditCard, debitCard]}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Ingreso" }));

    expect(accountLabels().sort()).toEqual(["Efectivo", "Transferencia"]);
  });

  it("type=expense → chips de tarjetas vivas + Efectivo + Transferencia (regresión)", () => {
    render(
      <TransactionForm
        currency="MXN"
        cards={[creditCard, debitCard]}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );
    // El default es "expense".
    expect(accountLabels().sort()).toEqual([
      "BBVA",
      "Efectivo",
      "Nu",
      "Transferencia",
    ]);
  });

  it("cambiar de expense con tarjeta de débito a income → vuelve a Efectivo", async () => {
    render(
      <TransactionForm
        currency="MXN"
        cards={[debitCard]}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );
    const user = userEvent.setup();
    // Estado inicial: expense + débito (elegido por el usuario).
    await user.click(screen.getByRole("button", { name: "BBVA" }));
    expect(screen.getByRole("button", { name: "BBVA" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    // Cambia el tipo a income.
    await user.click(screen.getByRole("button", { name: "Ingreso" }));
    // El método inválido se resetea a una opción válida (Efectivo).
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Efectivo" })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
    expect(
      screen.queryByRole("button", { name: "BBVA" }),
    ).not.toBeInTheDocument();
  });

  it("submit con type=income + paymentMethod=transfer persiste correctamente", async () => {
    const onSubmit = vi.fn();
    render(
      <TransactionForm currency="MXN" onSubmit={onSubmit} onCancel={() => {}} />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Ingreso" }));
    await user.click(screen.getByRole("button", { name: "Transferencia" }));
    const amountInput = screen.getByLabelText("Monto") as HTMLInputElement;
    await user.type(amountInput, "500");
    await user.tab();
    await user.type(screen.getByLabelText("Descripción"), "Salario");
    await user.click(screen.getByRole("button", { name: /Guardar movimiento/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const submitted = onSubmit.mock.calls[0]![0] as {
      type: string;
      paymentMethod: string;
    };
    expect(submitted.type).toBe("income");
    expect(submitted.paymentMethod).toBe("transfer");
  });
});
