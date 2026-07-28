/**
 * TransactionForm MSI "Fecha del primer pago" label — control-ingresos
 *
 * The date field for `msiStartDate` is labelled "Fecha del primer pago".
 * The label is the user's contract: this date is the month the first
 * installment is charged. The validation message is consistent with the
 * label.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransactionForm } from "../TransactionForm";

describe("TransactionForm MSI start-date label", () => {
  it("renders the MSI start-date field labelled 'Fecha del primer pago'", async () => {
    render(
      <TransactionForm currency="MXN" onSubmit={() => {}} onCancel={() => {}} />,
    );
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("Tipo"), "expense_msi");

    expect(
      screen.getByLabelText("Fecha del primer pago"),
    ).toBeInTheDocument();
  });

  it("shows the matching validation message when the field is empty", async () => {
    const onSubmit = vi.fn();
    render(
      <TransactionForm currency="MXN" onSubmit={onSubmit} onCancel={() => {}} />,
    );
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("Tipo"), "expense_msi");
    // Borrar el valor por default y forzar submit.
    const msiDateInput = screen.getByLabelText(
      "Fecha del primer pago",
    ) as HTMLInputElement;
    await user.clear(msiDateInput);
    await user.click(screen.getByRole("button", { name: /Crear transacción/i }));

    expect(
      await screen.findByText("Fecha del primer pago requerida"),
    ).toBeInTheDocument();
  });
});
