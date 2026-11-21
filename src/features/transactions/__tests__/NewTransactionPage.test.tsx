/**
 * NewTransaction page + navigation — control-ingresos (T7)
 *
 * S9: the entry screen mounts at `/transactions/new` OUTSIDE the AppShell
 * (no floating nav, close button + centered title). The shell's "+" goes
 * to that route, and a successful save returns to the previous screen
 * with the row persisted through the shared submit hook.
 */
import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { NewTransaction } from "@/pages/NewTransaction";
import { AppShell } from "@/components/layout/AppShell";
import { db } from "@/db/database";
import { transactionsRepo, settingsRepo } from "@/db/repositories";

const MOVEMENTS_MARKER = "Destino movimientos";

function renderAt(path: string): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/transactions/new" element={<NewTransaction />} />
        <Route path="/transactions" element={<div>{MOVEMENTS_MARKER}</div>} />
        <Route path="/" element={<AppShell><div>Inicio</div></AppShell>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("NewTransaction page", () => {
  beforeEach(async () => {
    await db.cards.clear();
    await db.transactions.clear();
    await db.settings.clear();
    await settingsRepo.update({ monthlyLimit: 100_000, currency: "MXN" });
  });

  it("mounts at /transactions/new outside the shell", async () => {
    renderAt("/transactions/new");

    // El chrome aparece de inmediato; el formulario llega tras los
    // queries vivos (antes: esqueleto).
    expect(
      screen.getByRole("heading", { name: "Nueva transacción" }),
    ).toBeInTheDocument();
    // Fuera del AppShell: sin barra de navegación flotante.
    expect(
      screen.queryByRole("navigation", { name: "Navegación principal" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Guardar movimiento" }),
      ).toBeDisabled();
    });
    expect(screen.getByText("Falta el monto")).toBeInTheDocument();
  });

  it("the shell's + button navigates to /transactions/new", async () => {
    renderAt("/");
    const user = userEvent.setup();

    await user.click(screen.getByRole("link", { name: "Nueva transacción" }));
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Nueva transacción" }),
      ).toBeInTheDocument();
    });
  });

  it("creates the transaction and returns to the previous screen", async () => {
    renderAt("/transactions/new");
    const user = userEvent.setup();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Guardar movimiento" }),
      ).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText("Monto"), "250");
    await user.type(screen.getByLabelText("Descripción"), "Súper");
    await user.click(screen.getByRole("button", { name: "Guardar movimiento" }));

    await waitFor(() => {
      expect(screen.getByText(MOVEMENTS_MARKER)).toBeInTheDocument();
    });
    const list = await transactionsRepo.list();
    expect(list).toHaveLength(1);
    expect(list[0]!.amount).toBe(25_000);
    expect(list[0]!.type).toBe("expense");
  });

  it("the close button returns to the previous screen", async () => {
    renderAt("/transactions/new");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Cerrar" }));
    await waitFor(() => {
      expect(screen.getByText(MOVEMENTS_MARKER)).toBeInTheDocument();
    });
  });
});
