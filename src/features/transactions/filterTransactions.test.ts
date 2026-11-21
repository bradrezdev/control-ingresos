import { describe, expect, it } from "vitest";
import { filterTransactions } from "./filterTransactions";
import { EMPTY_FILTER_STATE } from "./types";
import type { Card, Transaction } from "@/db/schemas";

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

const transactions: Transaction[] = [
  {
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
  {
    id: "tx-2",
    type: "income",
    amount: 50_00,
    currency: "MXN",
    description: "Reembolso",
    date: "2026-11-05",
    category: "Otros",
    paymentMethod: "transfer",
  },
  {
    id: "tx-3",
    type: "expense_msi",
    amount: 240_00,
    currency: "MXN",
    description: "Televisión",
    date: "2026-11-01",
    category: "Hogar",
    paymentMethod: "credit",
    cardId: "card-1",
    msiMonths: 12,
    msiStartDate: "2026-11-01",
  },
  {
    id: "tx-4",
    type: "expense",
    amount: 30_00,
    currency: "MXN",
    description: "Taxi",
    date: "2026-10-30",
    category: "Transporte",
    paymentMethod: "cash",
  },
];

describe("filterTransactions", () => {
  it("returns all transactions for the selected month ordered by date desc", () => {
    const items = filterTransactions({
      transactions,
      cards: [card],
      monthIso: "2026-11",
      filters: EMPTY_FILTER_STATE,
    });
    expect(items).toHaveLength(3);
    expect(items[0]!.displayDate).toBe("2026-11-05");
    expect(items[1]!.displayDate).toBe("2026-11-05");
    expect(items[2]!.displayDate).toBe("2026-11-01");
  });

  it("applies quick income filter", () => {
    const items = filterTransactions({
      transactions,
      cards: [card],
      monthIso: "2026-11",
      filters: { ...EMPTY_FILTER_STATE, quick: "income" },
    });
    expect(items).toHaveLength(1);
    expect(items[0]!.tx.type).toBe("income");
    expect(items[0]!.displayAmount).toBe(50_00);
  });

  it("applies quick expense filter", () => {
    const items = filterTransactions({
      transactions,
      cards: [card],
      monthIso: "2026-11",
      filters: { ...EMPTY_FILTER_STATE, quick: "expense" },
    });
    expect(items.every((i) => i.tx.type === "expense")).toBe(true);
  });

  it("shows MSI purchases by purchase date when msiView is purchase", () => {
    const items = filterTransactions({
      transactions,
      cards: [card],
      monthIso: "2026-11",
      filters: { ...EMPTY_FILTER_STATE, quick: "expense_msi", msiView: "purchase" },
    });
    expect(items).toHaveLength(1);
    expect(items[0]!.tx.description).toBe("Televisión");
    expect(items[0]!.displayAmount).toBe(-240_00);
  });

  it("shows MSI installments by installment date when msiView is installment", () => {
    const items = filterTransactions({
      transactions,
      cards: [card],
      monthIso: "2026-11",
      filters: { ...EMPTY_FILTER_STATE, quick: "expense_msi", msiView: "installment" },
    });
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]!.tx.type).toBe("expense_msi");
    expect(items[0]!.installmentIndex).toBeDefined();
    expect(items[0]!.installmentTotal).toBe(12);
    expect(items[0]!.displayDate.startsWith("2026-11")).toBe(true);
  });

  it("filters by search query across description, category and card", () => {
    const items = filterTransactions({
      transactions,
      cards: [card],
      monthIso: "2026-11",
      filters: { ...EMPTY_FILTER_STATE, search: "stori" },
    });
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => {
      const cardName = i.tx.type !== "income" && "cardId" in i.tx && i.tx.cardId ? "Stori" : "";
      return `${i.tx.description} ${i.tx.category ?? ""} ${cardName}`.toLowerCase().includes("stori");
    })).toBe(true);
  });

  it("filters by advanced card id", () => {
    const items = filterTransactions({
      transactions,
      cards: [card],
      monthIso: "2026-11",
      filters: {
        ...EMPTY_FILTER_STATE,
        advanced: { ...EMPTY_FILTER_STATE.advanced, cardId: "card-1" },
      },
    });
    expect(items.every((i) => "cardId" in i.tx && i.tx.cardId === "card-1")).toBe(true);
  });

  it("filters by advanced category", () => {
    const items = filterTransactions({
      transactions,
      cards: [card],
      monthIso: "2026-11",
      filters: {
        ...EMPTY_FILTER_STATE,
        advanced: { ...EMPTY_FILTER_STATE.advanced, category: "Comida" },
      },
    });
    expect(items).toHaveLength(1);
    expect(items[0]!.tx.category).toBe("Comida");
  });

  it("filters by advanced date range", () => {
    const items = filterTransactions({
      transactions,
      cards: [card],
      monthIso: "2026-11",
      filters: {
        ...EMPTY_FILTER_STATE,
        advanced: { ...EMPTY_FILTER_STATE.advanced, fromDate: "2026-11-01", toDate: "2026-11-30" },
      },
    });
    expect(items.every((i) => i.displayDate >= "2026-11-01" && i.displayDate <= "2026-11-30")).toBe(true);
  });
});
