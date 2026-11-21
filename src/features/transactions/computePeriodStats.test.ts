import { describe, expect, it } from "vitest";
import { computePeriodStats } from "./computePeriodStats";
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
];

describe("computePeriodStats", () => {
  it("sums expenses and MSI purchases as spent", () => {
    const stats = computePeriodStats({
      transactions,
      cards: [card],
      monthIso: "2026-11",
      filters: EMPTY_FILTER_STATE,
    });
    expect(stats.spent).toBe(100_00 + 240_00);
  });

  it("sums income as received", () => {
    const stats = computePeriodStats({
      transactions,
      cards: [card],
      monthIso: "2026-11",
      filters: EMPTY_FILTER_STATE,
    });
    expect(stats.received).toBe(50_00);
  });

  it("counts MSI purchases in the period", () => {
    const stats = computePeriodStats({
      transactions,
      cards: [card],
      monthIso: "2026-11",
      filters: EMPTY_FILTER_STATE,
    });
    expect(stats.msiCount).toBe(1);
  });

  it("ignores quick filter so the three tiles always show period totals", () => {
    const stats = computePeriodStats({
      transactions,
      cards: [card],
      monthIso: "2026-11",
      filters: { ...EMPTY_FILTER_STATE, quick: "income" },
    });
    expect(stats.spent).toBe(100_00 + 240_00);
    expect(stats.received).toBe(50_00);
  });

  it("applies search and advanced filters", () => {
    const stats = computePeriodStats({
      transactions,
      cards: [card],
      monthIso: "2026-11",
      filters: {
        ...EMPTY_FILTER_STATE,
        search: "Cena",
      },
    });
    expect(stats.spent).toBe(100_00);
    expect(stats.received).toBe(0);
    expect(stats.msiCount).toBe(0);
  });
});
