/**
 * Tests for the redesigned card block (redesign-ui-2026, T5).
 *
 * The block is the full-width "card object": flat bank-tinted face with
 * 1.586:1 proportions, usage bar with the percent always in text, and the
 * Corte / Pago / Disponible data row.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Card, Transaction } from "@/db/schemas";
import { computeCardAccount } from "./computeCardAccount";
import { CardBlock, type CardBlockProps } from "./CardBlock";
import type { CardAccount } from "./types";

const today = new Date("2026-11-20T12:00:00Z");

const baseCard: Card = {
  id: "card-1",
  bank: "PLATA",
  holderName: "Bryan Núñez",
  cardType: "credit",
  cutDay: 17,
  daysToPayAfterCut: 20,
  creditLimit: 1_000_000,
  priority: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const debitCard: Card = {
  id: "card-debit",
  bank: "Débito diario",
  holderName: "Bryan Núñez",
  cardType: "debit",
  priority: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function expense(
  id: string,
  date: string,
  amount: number,
  cardId = "card-1",
): Transaction {
  return {
    id,
    type: "expense",
    amount,
    currency: "MXN",
    description: `Gasto ${id}`,
    date,
    category: "Comida",
    paymentMethod: "credit",
    cardId,
  };
}

function makeAccount(card: Card, transactions: Transaction[]): CardAccount {
  return computeCardAccount(card, transactions, today);
}

function renderBlock(
  account: CardAccount,
  handlers: Partial<Pick<CardBlockProps, "onOpenDetail" | "onOpenMenu">> = {},
): ReturnType<typeof render> {
  return render(
    <CardBlock
      account={account}
      currency="MXN"
      onOpenDetail={handlers.onOpenDetail ?? vi.fn()}
      onOpenMenu={handlers.onOpenMenu ?? vi.fn()}
    />,
  );
}

describe("CardBlock", () => {
  it("renders the bank name, holder and card type on the face", () => {
    renderBlock(
      makeAccount(baseCard, [expense("tx", "2026-11-05", 300_000)]),
    );
    expect(screen.getByText("PLATA")).toBeInTheDocument();
    expect(screen.getByText("Bryan Núñez")).toBeInTheDocument();
    expect(screen.getByText("Crédito")).toBeInTheDocument();
  });

  it("shows the usage text with the percent always in text", () => {
    renderBlock(
      makeAccount(baseCard, [
        expense("tx-1", "2026-11-05", 250_000),
        expense("tx-2", "2026-11-10", 50_000),
      ]),
    );
    expect(screen.getByText("$3,000.00")).toBeInTheDocument();
    expect(screen.getByText("$10,000.00")).toBeInTheDocument();
    expect(screen.getByText("30%")).toBeInTheDocument();
  });

  it("renders an 8px usage bar whose tone follows the percent", () => {
    renderBlock(
      makeAccount(baseCard, [expense("tx", "2026-11-05", 300_000)]),
    );
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveClass("h-2");
    expect(bar).toHaveAttribute("aria-valuenow", "30");
    expect(bar.querySelector("span")).toHaveClass("bg-primary");
  });

  it("paints the bar with the warning tone between 61% and 85%", () => {
    const card: Card = { ...baseCard, creditLimit: 100_000 };
    renderBlock(makeAccount(card, [expense("tx", "2026-11-05", 61_000)]));
    expect(screen.getByRole("progressbar").querySelector("span")).toHaveClass(
      "bg-warning",
    );
  });

  it("paints the bar with the danger tone above 85%", () => {
    const card: Card = { ...baseCard, creditLimit: 100_000 };
    renderBlock(makeAccount(card, [expense("tx", "2026-11-05", 86_000)]));
    expect(screen.getByRole("progressbar").querySelector("span")).toHaveClass(
      "bg-danger",
    );
  });

  it("clamps the bar above 100% but keeps the real percent in text", () => {
    const card: Card = { ...baseCard, creditLimit: 100_000 };
    renderBlock(makeAccount(card, [expense("tx", "2026-11-05", 129_000)]));
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
    expect(screen.getByText("129%")).toBeInTheDocument();
  });

  it("shows Corte, Pago with its status chip, and Disponible", () => {
    renderBlock(
      makeAccount(baseCard, [expense("tx", "2026-11-05", 300_000)]),
    );
    expect(screen.getByText("Corte")).toBeInTheDocument();
    expect(screen.getByText("Día 17")).toBeInTheDocument();
    expect(screen.getByText("Pago")).toBeInTheDocument();
    expect(screen.getByText("En 17 días")).toBeInTheDocument();
    expect(screen.getByText("Disponible")).toBeInTheDocument();
    expect(screen.getByText("$7,000.00")).toBeInTheDocument();
  });

  it("says Sin límite when a credit card has no registered limit", () => {
    const card: Card = { ...baseCard, creditLimit: undefined };
    renderBlock(makeAccount(card, [expense("tx", "2026-11-05", 1_000)]));
    expect(screen.getByText("Sin límite")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("opens the detail when the face is tapped", async () => {
    const onOpenDetail = vi.fn();
    const account = makeAccount(baseCard, []);
    renderBlock(account, { onOpenDetail });

    await userEvent.click(
      screen.getByRole("button", { name: "Ver detalle de PLATA" }),
    );
    expect(onOpenDetail).toHaveBeenCalledWith(account);
  });

  it("opens the options menu from the three-dot button", async () => {
    const onOpenMenu = vi.fn();
    const account = makeAccount(baseCard, []);
    renderBlock(account, { onOpenMenu });

    await userEvent.click(
      screen.getByRole("button", { name: "Opciones de PLATA" }),
    );
    expect(onOpenMenu).toHaveBeenCalledWith(account);
  });

  it("renders a debit card without cycle data and without breaking", () => {
    const account = makeAccount(debitCard, [
      expense("d", "2026-11-10", 10_000, "card-debit"),
    ]);
    renderBlock(account);

    expect(screen.getByText("Débito diario")).toBeInTheDocument();
    expect(screen.getByText("Débito")).toBeInTheDocument();
    expect(
      screen.getByText(/sin ciclo de corte ni límite/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByText("Corte")).not.toBeInTheDocument();
    expect(screen.queryByText("Pago")).not.toBeInTheDocument();
    expect(screen.queryByText("Disponible")).not.toBeInTheDocument();
  });

  it("exposes a 44px drag handle inside the data row", () => {
    renderBlock(makeAccount(baseCard, []));
    const handle = screen.getByLabelText("Arrastrar para reordenar");
    expect(handle).toBeInTheDocument();
    expect(handle.className).toContain("size-11");
  });
});
