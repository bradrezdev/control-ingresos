import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReorderSheet } from "./ReorderSheet";
import type { Card } from "@/db/schemas";

const cards: Card[] = [
  {
    id: "c1",
    bank: "PLATA",
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
  },
  {
    id: "c2",
    bank: "Mercado Pago",
    holderName: "Bryan Nuñez",
    cardType: "credit",
    cutDay: 27,
    daysToPayAfterCut: 11,
    creditLimit: 5_380_000,
    priority: 1,
    skin: "ocean",
    archived: false,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "c3",
    bank: "Stori",
    holderName: "Bryan Nuñez",
    cardType: "credit",
    cutDay: 13,
    daysToPayAfterCut: 22,
    creditLimit: 1_200_000,
    priority: 2,
    skin: "forest",
    archived: false,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
];

describe("ReorderSheet", () => {
  it("renders the title and instruction", () => {
    render(<ReorderSheet cards={cards} onClose={vi.fn()} onSave={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Ordenar mi cartera" })).toBeInTheDocument();
    expect(screen.getByText(/Mantén presionada el asa/i)).toBeInTheDocument();
  });

  it("moves a card down and persists the final order on save", async () => {
    const onSave = vi.fn();
    render(<ReorderSheet cards={cards} onClose={vi.fn()} onSave={onSave} />);

    await userEvent.click(screen.getByRole("button", { name: "Bajar PLATA" }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar orden" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(["c2", "c1", "c3"]);
  });

  it("moves a card up and persists the final order on save", async () => {
    const onSave = vi.fn();
    render(<ReorderSheet cards={cards} onClose={vi.fn()} onSave={onSave} />);

    await userEvent.click(screen.getByRole("button", { name: "Subir Stori" }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar orden" }));

    expect(onSave).toHaveBeenCalledWith(["c1", "c3", "c2"]);
  });

  it('calls onClose when "Cancelar" is clicked without saving', async () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    render(<ReorderSheet cards={cards} onClose={onClose} onSave={onSave} />);

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("disables the up button on the first card and the down button on the last card", () => {
    render(<ReorderSheet cards={cards} onClose={vi.fn()} onSave={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Subir PLATA" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Bajar Stori" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Bajar PLATA" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Subir Stori" })).toBeEnabled();
  });
});
