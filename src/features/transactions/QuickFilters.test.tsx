import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuickFilters } from "./QuickFilters";

describe("QuickFilters", () => {
  it("renders all four chips", () => {
    render(<QuickFilters value="all" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Todas" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ingresos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gastos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "MSI" })).toBeInTheDocument();
  });

  it("selects the active chip", () => {
    render(<QuickFilters value="expense" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Gastos" })).toHaveAttribute("aria-pressed", "true");
  });

  it("emits the selected filter on click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<QuickFilters value="all" onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "MSI" }));
    expect(onChange).toHaveBeenCalledWith("expense_msi");
  });
});
