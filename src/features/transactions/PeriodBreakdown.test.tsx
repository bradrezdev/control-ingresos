import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PeriodBreakdown } from "./PeriodBreakdown";
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

const groups: DayGroup[] = [
  {
    date: "2026-11-05",
    label: "5 de noviembre",
    total: -100_00,
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
    ],
  },
];

describe("PeriodBreakdown", () => {
  it("renders category and account breakdowns", () => {
    render(
      <PeriodBreakdown
        groups={groups}
        cardById={new Map([[card.id, card]])}
        currency="MXN"
      />,
    );
    expect(screen.getByText("Desglose del periodo")).toBeInTheDocument();
    expect(screen.getByText("Comida")).toBeInTheDocument();
    expect(screen.getByText("Stori")).toBeInTheDocument();
  });

  it("hides when there are no expense transactions", () => {
    const emptyGroups: DayGroup[] = [];
    const { container } = render(
      <PeriodBreakdown groups={emptyGroups} cardById={new Map()} currency="MXN" />,
    );
    expect(container.firstChild).toBeNull();
  });
});
