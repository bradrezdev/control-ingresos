import { describe, expect, it } from "vitest";
import { groupTransactionsByDay } from "./groupTransactionsByDay";
import type { TransactionListItem } from "./types";

const baseTx = {
  id: "tx-1",
  type: "expense",
  amount: 100_00,
  currency: "MXN",
  description: "Cena",
  date: "2026-11-05",
  category: "Comida",
  paymentMethod: "credit",
  cardId: "card-1",
} as const;

function makeItem(overrides: Partial<TransactionListItem>): TransactionListItem {
  return {
    id: overrides.tx?.id ?? baseTx.id,
    tx: overrides.tx ?? baseTx,
    displayDate: overrides.displayDate ?? baseTx.date,
    displayAmount: overrides.displayAmount ?? -baseTx.amount,
    ...overrides,
  };
}

describe("groupTransactionsByDay", () => {
  it("groups items by display date and sorts days descending", () => {
    const items = [
      makeItem({ displayDate: "2026-11-05", displayAmount: -100_00 }),
      makeItem({ displayDate: "2026-11-06", displayAmount: -50_00 }),
      makeItem({ displayDate: "2026-11-05", displayAmount: 30_00 }),
    ];
    const groups = groupTransactionsByDay(items);
    expect(groups).toHaveLength(2);
    expect(groups[0]!.date).toBe("2026-11-06");
    expect(groups[0]!.total).toBe(-50_00);
    expect(groups[1]!.date).toBe("2026-11-05");
    expect(groups[1]!.total).toBe(-70_00);
  });

  it("formats day labels in Spanish", () => {
    const items = [makeItem({ displayDate: "2026-11-05" })];
    const groups = groupTransactionsByDay(items);
    expect(groups[0]!.label).toMatch(/5 de noviembre/i);
  });

  it("returns an empty array for no items", () => {
    expect(groupTransactionsByDay([])).toEqual([]);
  });
});
