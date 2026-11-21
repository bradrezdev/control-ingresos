/**
 * Tests for the card deletion confirmation modal (redesign-ui-2026, T5).
 *
 * The confirm copy must tell the user how many transactions of that card
 * will be affected before the destructive action runs.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteCardConfirm } from "./DeleteCardConfirm";
import type { Card } from "@/db/schemas/card";

const remove = vi.fn();

vi.mock("@/stores/cardsStore", () => ({
  useCardsStore: (selector: (state: { remove: unknown }) => unknown) =>
    selector({ remove }),
}));

const card: Card = {
  id: "card-1",
  bank: "PLATA",
  holderName: "Bryan Núñez",
  cardType: "credit",
  cutDay: 17,
  daysToPayAfterCut: 20,
  creditLimit: 1_000_000,
  priority: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => {
  remove.mockReset();
  remove.mockResolvedValue(undefined);
});

function renderConfirm(affectedCount: number): void {
  render(
    <DeleteCardConfirm
      card={card}
      affectedCount={affectedCount}
      onClose={vi.fn()}
    />,
  );
}

describe("DeleteCardConfirm", () => {
  it("indicates how many transactions will be affected (plural)", () => {
    renderConfirm(2);
    expect(screen.getByText(/2 transacciones se verán afectadas/)).toBeInTheDocument();
    expect(screen.getByText(/¿Eliminar la tarjeta de PLATA\?/)).toBeInTheDocument();
  });

  it("uses the singular copy for exactly one affected transaction", () => {
    renderConfirm(1);
    expect(screen.getByText(/1 transacción se verá afectada/)).toBeInTheDocument();
  });

  it("states when the card has no associated transactions", () => {
    renderConfirm(0);
    expect(screen.getByText(/No hay transacciones asociadas/)).toBeInTheDocument();
  });

  it("keeps the action buttons named after the action", () => {
    renderConfirm(2);
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeInTheDocument();
  });

  it("removes the card through the store when confirmed", async () => {
    renderConfirm(2);
    await userEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(remove).toHaveBeenCalledWith("card-1");
  });

  it("renders nothing open when card is null", () => {
    render(
      <DeleteCardConfirm card={null} affectedCount={0} onClose={vi.fn()} />,
    );
    expect(screen.queryByText(/Eliminar la tarjeta/)).not.toBeInTheDocument();
  });
});
