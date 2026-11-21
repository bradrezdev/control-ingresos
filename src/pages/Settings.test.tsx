/**
 * Settings screen — control-ingresos (redesign-ui-2026, T8)
 *
 * REDESIGN §Fase 4 "Ajustes": back button in the header, sections in
 * cards, "Guardar cambios" gray/disabled until the form is dirty, primary
 * when there are pending changes, and the "Cambios guardados" message
 * after saving. All copy uses es-MX tuteo.
 */
import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { Settings } from "@/pages/Settings";
import { db } from "@/db/database";
import { settingsRepo } from "@/db/repositories";

function renderAt(path = "/settings"): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/settings" element={<Settings />} />
        <Route path="/" element={<div>Inicio</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Settings (redesign T8)", () => {
  beforeEach(async () => {
    await db.settings.clear();
    await settingsRepo.update({ monthlyLimit: 250_000, currency: "MXN" });
  });

  it("has a 44px back button labelled Volver and the title Ajustes", () => {
    renderAt();
    const back = screen.getByRole("link", { name: "Volver" });
    expect(back).toHaveClass("size-11");
    expect(screen.getByRole("heading", { name: "Ajustes" })).toBeInTheDocument();
  });

  it("renders the three sections in cards with tuteo copy", async () => {
    renderAt();
    expect(await screen.findByText("Apariencia")).toBeInTheDocument();
    expect(
      screen.getByText("Elige el tema visual de la aplicación."),
    ).toBeInTheDocument();
    expect(screen.getByText("Presupuesto y moneda")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Define tu límite mensual y la moneda de los montos.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Respaldo de datos")).toBeInTheDocument();
    expect(screen.queryByText(/Elegí|Definí|Exportá|importá/i)).not.toBeInTheDocument();
  });

  it("keeps Guardar cambios disabled until there are changes and confirms after saving", async () => {
    renderAt();
    const user = userEvent.setup();

    const save = await screen.findByRole("button", { name: "Guardar cambios" });
    expect(save).toBeDisabled();
    expect(save).toHaveClass("bg-segment", "text-text-secondary");

    const limit = screen.getByLabelText("Límite mensual");
    await user.clear(limit);
    await user.type(limit, "3000");

    await waitFor(() => expect(save).toBeEnabled());
    expect(save).toHaveClass("bg-button");

    await user.click(save);

    expect(await screen.findByText("Cambios guardados")).toBeInTheDocument();
    await waitFor(() => expect(save).toBeDisabled());
  });
});
