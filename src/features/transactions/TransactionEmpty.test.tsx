import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransactionEmpty } from "./TransactionEmpty";

describe("TransactionEmpty", () => {
  it("renders the empty message with the month", () => {
    render(<TransactionEmpty monthLabel="noviembre" onAdd={vi.fn()} />);
    expect(screen.getByText("Sin movimientos en noviembre")).toBeInTheDocument();
  });

  it("calls onAdd when the action button is pressed", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<TransactionEmpty monthLabel="noviembre" onAdd={onAdd} />);
    await user.click(screen.getByRole("button", { name: "Agregar movimiento" }));
    expect(onAdd).toHaveBeenCalled();
  });

  it("offers clear-filters instead of add when a filter produced no rows", async () => {
    const user = userEvent.setup();
    const onClearFilters = vi.fn();
    render(
      <TransactionEmpty
        monthLabel="noviembre"
        onAdd={vi.fn()}
        filtered
        onClearFilters={onClearFilters}
      />,
    );
    expect(screen.getByText("Sin resultados")).toBeInTheDocument();
    expect(screen.getByText(/Prueba con otra búsqueda/)).toBeInTheDocument();
    expect(screen.queryByText("Sin movimientos en noviembre")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Agregar movimiento" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(onClearFilters).toHaveBeenCalled();
  });
});
