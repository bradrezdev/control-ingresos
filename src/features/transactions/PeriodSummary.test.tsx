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
});
