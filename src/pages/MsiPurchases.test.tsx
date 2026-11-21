/**
 * MsiPurchases — control-ingresos (Tarjetas · Mis finanzas)
 *
 * Pruebas de la página `/cards/msi`: lectura de URL, cálculo con datos
 * reales de Dexie, filtro de plazo y navegación a la ficha.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, beforeEach } from "vitest";
import { MsiPurchases } from "./MsiPurchases";
import { db } from "@/db/database";
import { cardsRepo, settingsRepo, transactionsRepo } from "@/db/repositories";
import type { Card, Transaction, TransactionInput } from "@/db/schemas";

function renderAt(path = "/cards/msi?month=2026-11"): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/cards/msi" element={<MsiPurchases />} />
        <Route path="/cards" element={<div data-testid="cards-screen">Tarjetas</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function seedDemo(): Promise<{ card: Card; tx12: Transaction; tx24: Transaction }> {
  const card = await cardsRepo.create({
    bank: "Mercado Pago",
    holderName: "Bryan Nuñez",
    cardType: "credit",
    cutDay: 27,
    daysToPayAfterCut: 11,
    creditLimit: 5_380_000,
    priority: 0,
    skin: "ocean",
  });

  const tx12 = await transactionsRepo.create({
    type: "expense_msi",
    paymentMethod: "credit",
    cardId: card.id,
    amount: 164_999,
    currency: "MXN",
    description: "Monitor Sansung",
    date: "2026-05-22",
    msiMonths: 12,
    msiStartDate: "2026-06-22",
    msiPlanRule: "last",
  } as TransactionInput);

  const tx24 = await transactionsRepo.create({
    type: "expense_msi",
    paymentMethod: "credit",
    cardId: card.id,
    amount: 1_781_193,
    currency: "MXN",
    description: "Galaxy S26 Papá",
    date: "2026-05-28",
    msiMonths: 24,
    msiStartDate: "2026-06-27",
    msiPlanRule: "last",
  } as TransactionInput);

  return { card, tx12, tx24 };
}

describe("MsiPurchases", () => {
  beforeEach(async () => {
    await db.cards.clear();
    await db.transactions.clear();
    await db.settings.clear();
    await settingsRepo.update({ currency: "MXN" });
  });

  it("usa el mes de la URL y muestra las compras activas", async () => {
    await seedDemo();
    renderAt();

    expect(await screen.findByText("Galaxy S26 Papá")).toBeInTheDocument();
    expect(screen.getByText("Monitor Sansung")).toBeInTheDocument();
  });

  it("usa el mes actual cuando la URL no lo trae", async () => {
    await seedDemo();
    renderAt("/cards/msi");

    expect(await screen.findByText("Compras a meses")).toBeInTheDocument();
    expect(screen.getByText("Galaxy S26 Papá")).toBeInTheDocument();
  });

  it("filtra por plazo desde la URL", async () => {
    await seedDemo();
    renderAt("/cards/msi?month=2026-11&term=12");

    expect(await screen.findByText("Monitor Sansung")).toBeInTheDocument();
    expect(screen.queryByText("Galaxy S26 Papá")).toBeNull();
    expect(screen.getByText("1 compra activa a 12 meses")).toBeInTheDocument();
  });

  it("actualiza la URL al seleccionar un plazo", async () => {
    const user = userEvent.setup();
    await seedDemo();
    renderAt();

    await screen.findByText("Galaxy S26 Papá");

    await user.click(screen.getByRole("button", { name: "12 meses" }));

    await waitFor(() => {
      expect(screen.queryByText("Galaxy S26 Papá")).toBeNull();
    });
    expect(screen.getByText("1 compra activa a 12 meses")).toBeInTheDocument();
  });

  it("quita el filtro y vuelve a mostrar todas las compras", async () => {
    const user = userEvent.setup();
    await seedDemo();
    renderAt("/cards/msi?month=2026-11&term=12");

    await screen.findByText("Monitor Sansung");

    await user.click(screen.getByRole("button", { name: "Quitar filtro" }));

    await waitFor(() => {
      expect(screen.getByText("Galaxy S26 Papá")).toBeInTheDocument();
    });
    expect(screen.getByText("2 compras activas")).toBeInTheDocument();
  });

  it("navega a la ficha de la compra", async () => {
    const user = userEvent.setup();
    await seedDemo();
    renderAt();

    await screen.findByText("Galaxy S26 Papá");

    await user.click(screen.getByRole("button", { name: /Galaxy S26 Papá/ }));

    expect(await screen.findByTestId("cards-screen")).toBeInTheDocument();
  });

  it("muestra el estado vacío cuando no hay compras a meses", async () => {
    renderAt();

    expect(
      await screen.findByText("Sin compras a meses activas."),
    ).toBeInTheDocument();
  });
});
