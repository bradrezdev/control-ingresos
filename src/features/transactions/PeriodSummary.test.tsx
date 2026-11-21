import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PeriodSummary } from "./PeriodSummary";

describe("PeriodSummary", () => {
  it("renders spent, received and MSI count tiles", () => {
    render(
      <PeriodSummary
        stats={{ spent: 100_00, received: 50_00, msiCount: 2 }}
        currency="MXN"
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /Gastado/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Recibido/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /A meses/i })).toBeInTheDocument();
    expect(screen.getByText("2 compras")).toBeInTheDocument();
  });

  it("uses singular for one MSI purchase", () => {
    render(
      <PeriodSummary
        stats={{ spent: 0, received: 0, msiCount: 1 }}
        currency="MXN"
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("1 compra")).toBeInTheDocument();
  });

  it("emits the corresponding quick filter when a tile is pressed", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <PeriodSummary
        stats={{ spent: 100_00, received: 50_00, msiCount: 2 }}
        currency="MXN"
        onSelect={onSelect}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Recibido/i }));
    expect(onSelect).toHaveBeenCalledWith("income");
    await user.click(screen.getByRole("button", { name: /A meses/i }));
    expect(onSelect).toHaveBeenCalledWith("expense_msi");
  });

  it("marks the active tile with aria-pressed and shows text feedback", () => {
    render(
      <PeriodSummary
        stats={{ spent: 100_00, received: 50_00, msiCount: 2 }}
        currency="MXN"
        active="expense"
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /Gastado/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Recibido/i })).toHaveAttribute("aria-pressed", "false");
    // Active state is not color-only (S19): the tile gains a text marker.
    expect(screen.getByText("Mostrando gastos")).toBeInTheDocument();
    expect(screen.getByText("ingresos")).toBeInTheDocument();
  });

  it("lays the three tiles in a single row that fits 360px", () => {
    const { container } = render(
      <PeriodSummary
        stats={{ spent: 130_907, received: 0, msiCount: 4 }}
        currency="MXN"
        onSelect={vi.fn()}
      />,
    );
    const row = container.firstChild as HTMLElement;
    // A container-aware flex row: no wrap, so "A meses" never drops to a
    // second row (REDESIGN §Fase 2 punto 3: tres mosaicos en una fila).
    expect(row).toHaveClass("flex", "@container");
    expect(row.className).not.toContain("flex-wrap");
    const tiles = row.querySelectorAll("button");
    expect(tiles).toHaveLength(3);
    tiles.forEach((tile) => {
      expect(tile).toHaveClass("flex-1");
      expect(tile).toHaveClass("min-w-0");
    });
  });

  it("never breaks a cifra and steps down to the 14px floor when narrow", () => {
    render(
      <PeriodSummary
        stats={{ spent: 130_907, received: 0, msiCount: 4 }}
        currency="MXN"
        onSelect={vi.fn()}
      />,
    );
    const value = screen.getByText("\u2212$1,309.07");
    // `white-space` inherits: the tile's value cell keeps the cifra whole.
    expect(value.parentElement).toHaveClass("whitespace-nowrap");
    // Cifra 17/700 where it fits; REDESIGN floor for montos is 14px.
    expect(value.parentElement?.className).toContain("@max-[340px]:text-[14px]");
  });
});
