import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  TransactionFilters,
  EMPTY_FILTERS,
  type TransactionFilters as Filters,
} from "./TransactionFilters";

describe("TransactionFilters", () => {
  it("renders all 4 type tabs", () => {
    const onChange = vi.fn();
    render(<TransactionFilters value={EMPTY_FILTERS} onChange={onChange} />);
    expect(screen.getByRole("tab", { name: "Todas" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Ingresos" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Gastos" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "MSI" })).toBeInTheDocument();
  });

  it("selects the active type tab", () => {
    const onChange = vi.fn();
    render(
      <TransactionFilters
        value={{ ...EMPTY_FILTERS, type: "income" }}
        onChange={onChange}
      />,
    );
    const ingresos = screen.getByRole("tab", { name: "Ingresos" });
    expect(ingresos).toHaveAttribute("aria-selected", "true");
  });

  it("emits onChange when a tab is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TransactionFilters value={EMPTY_FILTERS} onChange={onChange} />);
    await user.click(screen.getByRole("tab", { name: "Gastos" }));
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, type: "expense" });
  });

  it("hides the clear button when no filters are active", () => {
    const onChange = vi.fn();
    render(<TransactionFilters value={EMPTY_FILTERS} onChange={onChange} />);
    expect(screen.queryByText("Limpiar filtros")).not.toBeInTheDocument();
  });

  it("shows the clear button when filters are active and resets to EMPTY_FILTERS", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const active: Filters = { ...EMPTY_FILTERS, type: "expense_msi" };
    render(<TransactionFilters value={active} onChange={onChange} />);
    const clear = screen.getByText("Limpiar filtros");
    expect(clear).toBeInTheDocument();
    await user.click(clear);
    expect(onChange).toHaveBeenCalledWith(EMPTY_FILTERS);
  });
});
