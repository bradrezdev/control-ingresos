import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CardFormSheet } from "./CardFormSheet";
import type { Card } from "@/db/schemas";

const existingCard: Card = {
  id: "c-existing",
  bank: "Plata",
  holderName: "Bryan Nuñez",
  cardType: "credit",
  cutDay: 22,
  daysToPayAfterCut: 31,
  creditLimit: 2_550_000,
  priority: 0,
  skin: "silver",
  archived: false,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const existingNames = ["Plata", "Mercado Pago"];

async function fillValidCreateForm(): Promise<void> {
  await userEvent.type(screen.getByLabelText("Nombre de la tarjeta"), "Nueva Oro");
  await userEvent.type(screen.getByLabelText("Titular"), "Bryan Nuñez");
  await userEvent.type(screen.getByLabelText("Límite de crédito en MXN"), "15000.00");
  await userEvent.clear(screen.getByLabelText("Día de corte"));
  await userEvent.type(screen.getByLabelText("Día de corte"), "10");
  await userEvent.clear(screen.getByLabelText("Plazo de pago en días"));
  await userEvent.type(screen.getByLabelText("Plazo de pago en días"), "20");
}

describe("CardFormSheet", () => {
  it("renders create mode title and submit button", () => {
    render(
      <CardFormSheet
        existingNames={existingNames}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Nueva tarjeta" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agregar tarjeta" })).toBeInTheDocument();
  });

  it("renders edit mode title and submit button", () => {
    render(
      <CardFormSheet
        card={existingCard}
        existingNames={existingNames}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Editar tarjeta" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeInTheDocument();
  });

  it("returns a CardInput when creating a valid card", async () => {
    const onSubmit = vi.fn();
    render(
      <CardFormSheet
        existingNames={existingNames}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await fillValidCreateForm();
    await userEvent.click(screen.getByRole("button", { name: "Agregar tarjeta" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const input = onSubmit.mock.calls[0]![0]!;
    expect(input.bank).toBe("Nueva Oro");
    expect(input.holderName).toBe("Bryan Nuñez");
    expect(input.creditLimit).toBe(1_500_000);
    expect(input.cutDay).toBe(10);
    expect(input.daysToPayAfterCut).toBe(20);
    expect(input.skin).toBe("ink");
    expect(input.archived).toBe(false);
    expect(input.cardType).toBe("credit");
  });

  it("preserves archived and priority in edit mode", async () => {
    const onSubmit = vi.fn();
    render(
      <CardFormSheet
        card={{ ...existingCard, archived: true, priority: 3 }}
        existingNames={existingNames}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await userEvent.clear(screen.getByLabelText("Límite de crédito en MXN"));
    await userEvent.type(screen.getByLabelText("Límite de crédito en MXN"), "20000.00");
    await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const input = onSubmit.mock.calls[0]![0]!;
    expect(input.archived).toBe(true);
    expect(input.priority).toBe(3);
  });

  it("shows an error for a duplicate name and preserves the typed value", async () => {
    const onSubmit = vi.fn();
    render(
      <CardFormSheet
        existingNames={existingNames}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await fillValidCreateForm();
    const nameInput = screen.getByLabelText("Nombre de la tarjeta");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "plata");
    await userEvent.click(screen.getByRole("button", { name: "Agregar tarjeta" }));

    await waitFor(() =>
      expect(screen.getByText(/Ya existe una tarjeta con este nombre/i)).toBeInTheDocument(),
    );
    expect(nameInput).toHaveValue("plata");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows an error for a limit below $0.01", async () => {
    const onSubmit = vi.fn();
    render(
      <CardFormSheet
        existingNames={existingNames}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await userEvent.type(screen.getByLabelText("Nombre de la tarjeta"), "Test");
    await userEvent.type(screen.getByLabelText("Titular"), "Test");
    await userEvent.type(screen.getByLabelText("Límite de crédito en MXN"), "0.00");
    await userEvent.clear(screen.getByLabelText("Día de corte"));
    await userEvent.type(screen.getByLabelText("Día de corte"), "15");
    await userEvent.clear(screen.getByLabelText("Plazo de pago en días"));
    await userEvent.type(screen.getByLabelText("Plazo de pago en días"), "15");
    await userEvent.click(screen.getByRole("button", { name: "Agregar tarjeta" }));

    await waitFor(() =>
      expect(screen.getByText(/El límite mínimo es/i)).toBeInTheDocument(),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows an error for a limit above $999,999,999.99", async () => {
    const onSubmit = vi.fn();
    render(
      <CardFormSheet
        existingNames={existingNames}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await userEvent.type(screen.getByLabelText("Nombre de la tarjeta"), "Test");
    await userEvent.type(screen.getByLabelText("Titular"), "Test");
    await userEvent.type(screen.getByLabelText("Límite de crédito en MXN"), "9999999999.00");
    await userEvent.clear(screen.getByLabelText("Día de corte"));
    await userEvent.type(screen.getByLabelText("Día de corte"), "15");
    await userEvent.clear(screen.getByLabelText("Plazo de pago en días"));
    await userEvent.type(screen.getByLabelText("Plazo de pago en días"), "15");
    await userEvent.click(screen.getByRole("button", { name: "Agregar tarjeta" }));

    await waitFor(() =>
      expect(screen.getByText(/El límite máximo es/i)).toBeInTheDocument(),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows an error for cut day out of range", async () => {
    const onSubmit = vi.fn();
    render(
      <CardFormSheet
        existingNames={existingNames}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await userEvent.type(screen.getByLabelText("Nombre de la tarjeta"), "Test");
    await userEvent.type(screen.getByLabelText("Titular"), "Test");
    await userEvent.type(screen.getByLabelText("Límite de crédito en MXN"), "10000.00");
    await userEvent.clear(screen.getByLabelText("Día de corte"));
    await userEvent.type(screen.getByLabelText("Día de corte"), "32");
    await userEvent.clear(screen.getByLabelText("Plazo de pago en días"));
    await userEvent.type(screen.getByLabelText("Plazo de pago en días"), "15");
    await userEvent.click(screen.getByRole("button", { name: "Agregar tarjeta" }));

    await waitFor(() =>
      expect(screen.getByText(/El día de corte máximo es 31/i)).toBeInTheDocument(),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows an error for days to pay out of range", async () => {
    const onSubmit = vi.fn();
    render(
      <CardFormSheet
        existingNames={existingNames}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await userEvent.type(screen.getByLabelText("Nombre de la tarjeta"), "Test");
    await userEvent.type(screen.getByLabelText("Titular"), "Test");
    await userEvent.type(screen.getByLabelText("Límite de crédito en MXN"), "10000.00");
    await userEvent.clear(screen.getByLabelText("Día de corte"));
    await userEvent.type(screen.getByLabelText("Día de corte"), "15");
    await userEvent.clear(screen.getByLabelText("Plazo de pago en días"));
    await userEvent.type(screen.getByLabelText("Plazo de pago en días"), "91");
    await userEvent.click(screen.getByRole("button", { name: "Agregar tarjeta" }));

    await waitFor(() =>
      expect(screen.getByText(/El plazo máximo es 90 días/i)).toBeInTheDocument(),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onClose when "Cancelar" is clicked', async () => {
    const onClose = vi.fn();
    render(
      <CardFormSheet
        existingNames={existingNames}
        onClose={onClose}
        onSubmit={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
