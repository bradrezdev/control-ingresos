/**
 * collectCategories — control-ingresos (T7)
 *
 * Derives the category chips from the person's live transactions: the
 * app has no category catalog, so the chips are exactly the categories
 * already in use, deduped and trimmed.
 */
import { describe, expect, it } from "vitest";
import { collectCategories } from "./collectCategories";
import type { Transaction } from "@/db/schemas/transaction";

function tx(category: string | undefined): Transaction {
  return {
    id: "tx-1",
    type: "expense",
    amount: 100,
    currency: "MXN",
    description: "Algo",
    date: "2026-11-20",
    paymentMethod: "cash",
    ...(category !== undefined ? { category } : {}),
  } as Transaction;
}

describe("collectCategories", () => {
  it("returns an empty list when there are no transactions", () => {
    expect(collectCategories([])).toEqual([]);
  });

  it("dedupes, trims and sorts the categories in use", () => {
    const list = [
      tx("Comida"),
      tx(" Transporte "),
      tx("Comida"),
      tx(undefined),
      tx(""),
      tx("Auto"),
    ];

    expect(collectCategories(list)).toEqual([
      "Auto",
      "Comida",
      "Transporte",
    ]);
  });
});
