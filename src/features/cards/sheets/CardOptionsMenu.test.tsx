/**
 * CardOptionsMenu — control-ingresos (Tarjetas · Mis finanzas)
 *
 * El menú ofrece las acciones de la tarjeta y sólo muestra "Cambiar
 * prioridad" cuando hay más de una tarjeta en la cartera.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CardOptionsMenu } from "./CardOptionsMenu";
import type { Card } from "@/db/schemas";

const CARD: Card = {
  id: "11111111-1111-4111-8111-111111111111",
  bank: "PLATA",
  holderName: "Bryan Nuñez",
  cardType: "credit",
  cutDay: 22,
  daysToPayAfterCut: 31,
  creditLimit: 2_550_000,
  priority: 0,
  skin: "silver",
  archived: false,
  createdAt: "2026-01-01T12:00:00.000Z",
  updatedAt: "2026-01-01T12:00:00.000Z",
};

function renderMenu(
  canReorder: boolean,
  handlers: Partial<{
    onClose: () => void;
    onOpenDetail: () => void;
    onEdit: () => void;
    onReorder: () => void;
    onArchive: () => void;
  }> = {},
) {
  const props = {
    card: CARD,
    canReorder,
    onClose: vi.fn(),
    onOpenDetail: vi.fn(),
    onEdit: vi.fn(),
    onReorder: vi.fn(),
    onArchive: vi.fn(),
    ...handlers,
  };

  return {
    props,
    ...render(<CardOptionsMenu {...props} />),
  };
}

describe("CardOptionsMenu", () => {
  it("muestra el nombre de la tarjeta como título", () => {
    renderMenu(true);
    expect(
      screen.getByRole("heading", { name: "PLATA" }),
    ).toBeInTheDocument();
  });

  it("ofrecee las cuatro acciones con más de una tarjeta", () => {
    renderMenu(true);

    expect(screen.getByRole("button", { name: "Ver detalle" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar tarjeta" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cambiar prioridad" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Quitar de mi cartera" }),
    ).toBeInTheDocument();
  });

  it("omite cambiar prioridad con una sola tarjeta", () => {
    renderMenu(false);
    expect(
      screen.queryByRole("button", { name: "Cambiar prioridad" }),
    ).toBeNull();
  });

  it("devuelve la acción elegida", async () => {
    const user = userEvent.setup();
    const { props } = renderMenu(true);

    await user.click(screen.getByRole("button", { name: "Ver detalle" }));
    expect(props.onOpenDetail).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Editar tarjeta" }));
    expect(props.onEdit).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Cambiar prioridad" }));
    expect(props.onReorder).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Quitar de mi cartera" }));
    expect(props.onArchive).toHaveBeenCalled();
  });
});
