/**
 * MsiTermFilter — control-ingresos (Tarjetas · Mis finanzas)
 *
 * Pruebas del selector de plazos: orden descendente, selección visible y
 * callback al cambiar de plazo.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MsiTermFilter } from "./MsiTermFilter";

const TERMS = [24, 18, 15, 12, 10, 4];

function renderFilter(props: Partial<React.ComponentProps<typeof MsiTermFilter>> = {}) {
  return render(
    <MsiTermFilter
      terms={TERMS}
      term={null}
      onSelect={vi.fn()}
      {...props}
    />,
  );
}

describe("MsiTermFilter", () => {
  it("renderiza los plazos de mayor a menor", () => {
    renderFilter();

    const nav = screen.getByRole("navigation", { name: "Filtrar compras por plazo" });
    const buttons = screen.getAllByRole("button");

    expect(nav).toBeInTheDocument();
    expect(buttons.map((b) => b.textContent)).toEqual([
      "24 meses",
      "18 meses",
      "15 meses",
      "12 meses",
      "10 meses",
      "4 meses",
    ]);
  });

  it("marca el plazo seleccionado", () => {
    renderFilter({ term: 12 });

    expect(screen.getByRole("button", { name: "12 meses" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "24 meses" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("notifica cuando se elige un plazo", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    renderFilter({ onSelect });

    await user.click(screen.getByRole("button", { name: "12 meses" }));

    expect(onSelect).toHaveBeenCalledWith(12);
  });

  it("no notifica si se pulsa el plazo ya activo", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    renderFilter({ term: 12, onSelect });

    await user.click(screen.getByRole("button", { name: "12 meses" }));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("usa una sola fila horizontal con desplazamiento propio", () => {
    const { container } = renderFilter();
    const nav = container.querySelector("nav");

    expect(nav).toHaveClass("overflow-x-auto");
    expect(nav).toHaveClass("overscroll-x-contain");
  });
});
