/**
 * TransactionForm MSI first-installment field — control-ingresos (T7)
 *
 * The MSI start date (`msiStartDate`) is the month the first installment
 * is charged. Following the prototype's `#entry-schedule`, the field
 * lives in a "Primera cuota" disclosure, labelled "Fecha de la primera
 * cuota", and defaults to today. Clearing it must keep the save button
 * disabled with a hint naming the problem.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

function renderForm(): ReturnType<typeof render> {
  return render(
    <TransactionForm
      currency="MXN"
      cards={[creditCard]}
      onSubmit={() => {}}
      onCancel={() => {}}
    />,
  );
}

describe("TransactionForm MSI first-installment date", () => {
  it("labels the field 'Fecha de la primera cuota' inside 'Primera cuota'", async () => {
    renderForm();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "A meses" }));

    expect(screen.getByText(/Primera cuota/)).toBeInTheDocument();
    expect(
      screen.getByLabelText("Fecha de la primera cuota"),
    ).toBeInTheDocument();
  });

  it("keeps the save disabled with 'Revisa la fecha de la primera cuota' when cleared", async () => {
    const onSubmit = vi.fn();
    render(
      <TransactionForm
        currency="MXN"
        cards={[creditCard]}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Monto"), "1200");
    await user.type(screen.getByLabelText("Descripción"), "TV");
    await user.click(screen.getByRole("button", { name: "A meses" }));
    await user.click(screen.getByRole("button", { name: "12" }));
    await user.click(screen.getByRole("button", { name: "Nu" }));

    const msiDateInput = screen.getByLabelText(
      "Fecha de la primera cuota",
    ) as HTMLInputElement;
    await user.clear(msiDateInput);

    expect(
      screen.getByText("Revisa la fecha de la primera cuota"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Guardar movimiento" }),
    ).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
