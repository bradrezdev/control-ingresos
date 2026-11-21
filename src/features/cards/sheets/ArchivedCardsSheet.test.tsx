import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArchivedCardsSheet } from "./ArchivedCardsSheet";
import type { Card } from "@/db/schemas";

const archivedCard: Card = {
  id: "c1",
  bank: "Banamex",
  holderName: "Bryan Nuñez",
  cardType: "credit",
  cutDay: 15,
  daysToPayAfterCut: 15,
  creditLimit: 100_000,
  priority: 0,
  skin: "ink",
  archived: true,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("ArchivedCardsSheet", () => {
  it("renders the title and restore button", () => {
    render(
      <ArchivedCardsSheet
        cards={[archivedCard]}
        onClose={vi.fn()}
        onRestore={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Tarjetas archivadas" })).toBeInTheDocument();
    expect(screen.getByText("Banamex")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Restaurar en mi cartera" }),
    ).toBeInTheDocument();
  });

  it("calls onRestore with the card id when restore is clicked", async () => {
    const onRestore = vi.fn();
    render(
      <ArchivedCardsSheet
        cards={[archivedCard]}
        onClose={vi.fn()}
        onRestore={onRestore}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Restaurar en mi cartera" }));
    expect(onRestore).toHaveBeenCalledTimes(1);
    expect(onRestore).toHaveBeenCalledWith("c1");
  });

  it("shows an empty state when there are no archived cards", () => {
    render(<ArchivedCardsSheet cards={[]} onClose={vi.fn()} onRestore={vi.fn()} />);

    expect(screen.getByText(/No hay tarjetas archivadas/i)).toBeInTheDocument();
  });

  it("calls onClose when the drawer close button is clicked", async () => {
    const onClose = vi.fn();
    render(
      <ArchivedCardsSheet
        cards={[archivedCard]}
        onClose={onClose}
        onRestore={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Cerrar la hoja" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
