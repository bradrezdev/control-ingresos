/**
 * TransactionForm redesign entry behaviors — control-ingresos (T7)
 *
 * Pins the prototype #entry-screen contract through the public interface:
 *   - quota notice switches from the placeholder copy to the computed figure
 *     (engine `getMsiMonthlyAmount` + `formatCurrency`)
 *   - "Guardar movimiento" stays disabled with an explanatory hint until the
 *     form is valid
 *   - the "Otro" term input validates the 1–48 domain range
 *   - the type control shows/hides the MSI term block
 *   - a failed save shows an error state with "Reintentar"
 *   - category chips come from live data plus a free input
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransactionForm } from "../TransactionForm";
import type { TransactionFormProps } from "../TransactionForm";
import type { Card } from "@/db/schemas/card";
import type { Transaction } from "@/db/schemas/transaction";

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

const expenseTx: Transaction = {
  id: "tx-edit-1",
  type: "expense",
  amount: 12_345,
  currency: "MXN",
  description: "Cena",
  date: "2026-11-05",
  category: "Comida",
  paymentMethod: "cash",
};

function renderForm(props: Partial<TransactionFormProps> = {}): void {
  render(
    <TransactionForm
      currency="MXN"
      cards={[creditCard]}
      suggestedCategories={["Comida", "Auto"]}
      onSubmit={() => {}}
      onCancel={() => {}}
      {...props}
    />,
  );
}

describe("TransactionForm entry (redesign)", () => {
  it("switches the quota notice to the computed figure when amount and term exist", async () => {
    const user = userEvent.setup();
    renderForm();

    // Gasto e Ingreso no muestran el aviso de cuota.
    expect(screen.queryByText(/Cuota mensual/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "A meses" }));
    expect(
      screen.getByText("Cuota mensual: se calcula con el monto y el plazo"),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("Monto"), "1200");
    await user.click(screen.getByRole("button", { name: "12" }));
    // 120000 cents / 12 months → 10000 cents → "$100.00" (engine floor rule).
    expect(screen.getByText("Cuota mensual: $100.00")).toBeInTheDocument();
  });

  it("keeps 'Guardar movimiento' disabled with the hint until the form is valid", async () => {
    const user = userEvent.setup();
    renderForm();

    const save = screen.getByRole("button", { name: "Guardar movimiento" });
    expect(save).toBeDisabled();
    expect(screen.getByText("Falta el monto")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Monto"), "100");
    expect(screen.getByText("Falta la descripción")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Descripción"), "Cena");
    await waitFor(() => expect(save).toBeEnabled());
    expect(screen.queryByText("Falta el monto")).not.toBeInTheDocument();
    expect(screen.queryByText("Falta la descripción")).not.toBeInTheDocument();
  });

  it("validates the 'Otro' term against the 1–48 domain range", async () => {
    const user = userEvent.setup();
    renderForm();
    const save = screen.getByRole("button", { name: "Guardar movimiento" });

    await user.type(screen.getByLabelText("Monto"), "1000");
    await user.type(screen.getByLabelText("Descripción"), "Compra");

    await user.click(screen.getByRole("button", { name: "A meses" }));
    await user.click(screen.getByRole("button", { name: "Otro" }));
    const other = screen.getByLabelText("Número de meses") as HTMLInputElement;
    expect(other).toHaveAttribute("min", "1");
    expect(other).toHaveAttribute("max", "48");

    await user.type(other, "60");
    expect(screen.getByText("Elige un plazo de 1 a 48 meses")).toBeInTheDocument();
    expect(save).toBeDisabled();

    await user.clear(other);
    await user.type(other, "6");
    await user.click(screen.getByRole("button", { name: "Nu" }));
    await waitFor(() => expect(save).toBeEnabled());
    expect(
      screen.queryByText("Elige un plazo de 1 a 48 meses"),
    ).not.toBeInTheDocument();
  });

  it("shows and hides the term block with the type control", async () => {
    const user = userEvent.setup();
    renderForm();

    expect(
      screen.queryByRole("group", { name: "Plazo en meses" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "A meses" }));
    expect(
      screen.getByRole("group", { name: "Plazo en meses" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Gasto" }));
    expect(
      screen.queryByRole("group", { name: "Plazo en meses" }),
    ).not.toBeInTheDocument();
  });

  it("shows an error with 'Reintentar' when the save fails and retries the submit", async () => {
    const onSubmit = vi
      .fn<(values: unknown) => Promise<void>>()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(undefined);
    renderForm({ onSubmit });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Monto"), "100");
    await user.type(screen.getByLabelText("Descripción"), "Cena");
    await user.click(screen.getByRole("button", { name: "Guardar movimiento" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /No se pudo guardar/i,
    );
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
  });

  it("offers category chips from live data plus a free input for a new one", async () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Comida" }));
    expect(screen.getByRole("button", { name: "Comida" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.type(screen.getByLabelText("Monto"), "80");
    await user.type(screen.getByLabelText("Descripción"), "Despensa");
    await user.click(screen.getByRole("button", { name: "Guardar movimiento" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ category: "Comida" });
  });

  it("uses 'Guardar cambios' in edit mode", () => {
    renderForm({ transaction: expenseTx });
    expect(
      screen.getByRole("button", { name: "Guardar cambios" }),
    ).toBeInTheDocument();
  });
});
