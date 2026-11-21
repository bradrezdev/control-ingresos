import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArchiveCardConfirm } from "./ArchiveCardConfirm";
import type { Card } from "@/db/schemas";

const card: Card = {
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
};

describe("ArchiveCardConfirm", () => {
  it("renders the title with the card name and the explanation", () => {
    render(<ArchiveCardConfirm card={card} onClose={vi.fn()} onConfirm={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "¿Quitar PLATA?" })).toBeInTheDocument();
    expect(screen.getByText(/Conservarás sus movimientos/i)).toBeInTheDocument();
    expect(screen.getByText(/reglas de pagos fijos/i)).toBeInTheDocument();
  });

  it('calls onConfirm when "Quitar tarjeta" is clicked', async () => {
    const onConfirm = vi.fn();
    render(<ArchiveCardConfirm card={card} onClose={vi.fn()} onConfirm={onConfirm} />);

    await userEvent.click(screen.getByRole("button", { name: "Quitar tarjeta" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when "Conservar tarjeta" is clicked', async () => {
    const onClose = vi.fn();
    render(<ArchiveCardConfirm card={card} onClose={onClose} onConfirm={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Conservar tarjeta" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
