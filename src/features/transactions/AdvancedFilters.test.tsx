import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdvancedFilters } from "./AdvancedFilters";
import { EMPTY_ADVANCED_FILTERS, type AdvancedFilters as Filters } from "./types";

describe("AdvancedFilters", () => {
  it("renders card, category and date range fields", () => {
    render(
      <AdvancedFilters
        filters={EMPTY_ADVANCED_FILTERS}
        onChange={vi.fn()}
        onApply={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Tarjeta o cuenta")).toBeInTheDocument();
    expect(screen.getByLabelText("Categoría")).toBeInTheDocument();
    expect(screen.getByLabelText("Desde")).toBeInTheDocument();
    expect(screen.getByLabelText("Hasta")).toBeInTheDocument();
  });

  it("emits onApply when apply button is clicked", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(
      <AdvancedFilters
        filters={EMPTY_ADVANCED_FILTERS}
        onChange={vi.fn()}
        onApply={onApply}
        onClear={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(onApply).toHaveBeenCalled();
  });

  it("accumulates every typed character when used as a controlled field", async () => {
    const user = userEvent.setup();
    const applied = vi.fn();
    function Harness(): React.JSX.Element {
      const [f, setF] = useState<Filters>(EMPTY_ADVANCED_FILTERS);
      return (
        <AdvancedFilters
          filters={f}
          onChange={setF}
          onApply={() => applied(f)}
          onClear={vi.fn()}
        />
      );
    }
    render(<Harness />);
    const category = screen.getByLabelText("Categoría");
    await user.type(category, "Comida");
    expect(category).toHaveValue("Comida");
    await user.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(applied).toHaveBeenLastCalledWith({
      ...EMPTY_ADVANCED_FILTERS,
      category: "Comida",
    });
  });

  it("emits onClear when clear button is clicked", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(
      <AdvancedFilters
        filters={{ ...EMPTY_ADVANCED_FILTERS, category: "Comida" }}
        onChange={vi.fn()}
        onApply={vi.fn()}
        onClear={onClear}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(onClear).toHaveBeenCalled();
  });
});
