/**
 * useTransactionSubmit — control-ingresos (T7)
 *
 * The shared persistence path extracted from pages/Transactions.tsx.
 * Both the Movimientos edit sheet and the full-screen Nueva transacción
 * page must go through the same `transactionsRepo.create` /
 * `transactionsStore.update` calls with the same field mapping.
 */
import { describe, expect, it, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useTransactionSubmit } from "./useTransactionSubmit";
import type { TransactionFormValues_Output } from "./TransactionForm";
import { db } from "@/db/database";
import { transactionsRepo } from "@/db/repositories";

const baseValues: TransactionFormValues_Output = {
  type: "expense",
  amount: 20_000,
  description: "Despensa",
  date: "2026-11-20",
  category: "Comida",
  paymentMethod: "cash",
  cardId: undefined,
  msiMonths: undefined,
  msiStartDate: undefined,
};

describe("useTransactionSubmit", () => {
  beforeEach(async () => {
    await db.cards.clear();
    await db.transactions.clear();
    await db.settings.clear();
  });

  it("createTransaction persists an income row with the given currency", async () => {
    const { result } = renderHook(() => useTransactionSubmit("MXN"));

    await act(async () => {
      await result.current.createTransaction({
        ...baseValues,
        type: "income",
        amount: 50_000,
        description: "Nómina",
        paymentMethod: "transfer",
      });
    });

    const list = await transactionsRepo.list();
    expect(list).toHaveLength(1);
    expect(list[0]!.type).toBe("income");
    expect(list[0]!.amount).toBe(50_000);
    expect(list[0]!.currency).toBe("MXN");
  });

  it("updateTransaction patches an existing row through the store", async () => {
    const created = await transactionsRepo.create({
      type: "expense",
      amount: 10_000,
      currency: "MXN",
      description: "Original",
      date: "2026-11-05",
      category: "Comida",
      paymentMethod: "cash",
    } as Parameters<typeof transactionsRepo.create>[0]);

    const { result } = renderHook(() => useTransactionSubmit("MXN"));
    await act(async () => {
      await result.current.updateTransaction(created.id, {
        ...baseValues,
        description: "Editada",
      });
    });

    const list = await transactionsRepo.list();
    expect(list).toHaveLength(1);
    expect(list[0]!.description).toBe("Editada");
    expect(list[0]!.amount).toBe(20_000);
  });

  it("createTransaction bails without persisting when MSI values are incomplete", async () => {
    const { result } = renderHook(() => useTransactionSubmit("MXN"));

    await act(async () => {
      await result.current.createTransaction({
        ...baseValues,
        type: "expense_msi",
        paymentMethod: "credit",
        // cardId / msiMonths / msiStartDate missing → schema-level bail.
        cardId: undefined,
        msiMonths: undefined,
        msiStartDate: undefined,
      });
    });

    expect(await transactionsRepo.list()).toHaveLength(0);
  });
});
