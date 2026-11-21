import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransactionDayGroup } from "./TransactionDayGroup";
import type { DayGroup } from "./groupTransactionsByDay";
import type { Card } from "@/db/schemas";

const card: Card = {
  id: "card-1",
  bank: "Stori",
  holderName: "Usuario",
  cardType: "credit",
  cutDay: 15,
  daysToPayAfterCut: 5,
  creditLimit: 100_000,
  priority: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const group: DayGroup = {
  date: "2026-11-05",
  label: "5 de noviembre",
  total: -50_00,
  items: [
    {
      id: "tx-1",
      tx: {
        id: "tx-1",
        type: "expense",
        amount: 100_00,
        currency: "MXN",
        description: "Cena",
        date: "2026-11-05",
        category: "Comida",
        paymentMethod: "credit",
        cardId: "card-1",
      },
      displayDate: "2026-11-05",
      displayAmount: -100_00,
    },
    {
      id: "tx-2",
      tx: {
        id: "tx-2",
        type: "income",
        amount: 50_00,
        currency: "MXN",
        description: "Reembolso",
        date: "2026-11-05",
        category: "Otros",
        paymentMethod: "transfer",
      },
      displayDate: "2026-11-05",
      displayAmount: 50_00,
    },
  ],
};

describe("TransactionDayGroup", () => {
  it("renders the day label and total", () => {
    render(
      <TransactionDayGroup
        group={group}
        cardById={new Map([[card.id, card]])}
        currency="MXN"
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("5 de noviembre")).toBeInTheDocument();
    expect(screen.getByText("−$50.00")).toBeInTheDocument();
  });

  it("renders one row per item", () => {
    render(
      <TransactionDayGroup
        group={group}
        cardById={new Map([[card.id, card]])}
        currency="MXN"
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("Cena")).toBeInTheDocument();
    expect(screen.getByText("Reembolso")).toBeInTheDocument();
  });

  it("calls onSelect with the list item when a row is pressed", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <TransactionDayGroup
        group={group}
        cardById={new Map([[card.id, card]])}
        currency="MXN"
        onSelect={onSelect}
      />,
    );
    await user.click(screen.getByText("Cena"));
    expect(onSelect).toHaveBeenCalledWith(group.items[0]);
  });
});
