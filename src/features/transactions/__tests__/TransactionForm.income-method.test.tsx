/**
 * TransactionForm income-type payment method — control-ingresos
 *
 * When the user picks "Ingreso" as the transaction type, the only valid
 * `paymentMethod` values are "cash" (Efectivo) and "transfer"
 * (Transferencia). The form's Select for paymentMethod must reflect that:
 * no Débito / Crédito options should appear, and if the user changes the
 * type mid-edit while holding an invalid method, the field should reset
 * to a valid value (cash).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransactionForm } from "../TransactionForm";

function getMethodSelect(): HTMLSelectElement {
  return screen.getByLabelText("Método de pago") as HTMLSelectElement;
}

function optionLabels(select: HTMLSelectElement): string[] {
  return Array.from(select.options).map((o) => o.text);
}

describe("TransactionForm paymentMethod options by type", () => {
  it("type=income → sólo Efectivo y Transferencia", async () => {
    render(
      <TransactionForm currency="MXN" onSubmit={() => {}} onCancel={() => {}} />,
    );
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("Tipo"), "income");

    expect(optionLabels(getMethodSelect()).sort()).toEqual([
      "Efectivo",
      "Transferencia",
    ]);
  });

  it("type=expense → las 4 opciones siguen disponibles (regresión)", () => {
    render(
      <TransactionForm currency="MXN" onSubmit={() => {}} onCancel={() => {}} />,
    );
    // El default es "expense".
    expect(optionLabels(getMethodSelect()).sort()).toEqual([
      "Crédito",
      "Débito",
      "Efectivo",
      "Transferencia",
    ]);
  });

  it("cambiar de expense a income con método 'debit' → se resetea a 'cash'", async () => {
    render(
      <TransactionForm currency="MXN" onSubmit={() => {}} onCancel={() => {}} />,
    );
    const user = userEvent.setup();
    // Estado inicial: expense + debit (elegido por el usuario).
    await user.selectOptions(getMethodSelect(), "debit");
    expect(getMethodSelect()).toHaveValue("debit");
    // Cambia el tipo a income.
    await user.selectOptions(screen.getByLabelText("Tipo"), "income");
    // El método inválido se resetea a una opción válida.
    expect(getMethodSelect()).toHaveValue("cash");
  });

  it("submit con type=income + paymentMethod=transfer persiste correctamente", async () => {
    const onSubmit = vi.fn();
    render(
      <TransactionForm currency="MXN" onSubmit={onSubmit} onCancel={() => {}} />,
    );
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("Tipo"), "income");
    await user.selectOptions(getMethodSelect(), "transfer");
    const amountInput = screen.getByLabelText("Monto") as HTMLInputElement;
    await user.type(amountInput, "500");
    await user.tab();
    await user.type(screen.getByLabelText("Descripción"), "Salario");
    await user.click(screen.getByRole("button", { name: /Crear transacción/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const submitted = onSubmit.mock.calls[0]![0] as {
      type: string;
      paymentMethod: string;
    };
    expect(submitted.type).toBe("income");
    expect(submitted.paymentMethod).toBe("transfer");
  });
});
