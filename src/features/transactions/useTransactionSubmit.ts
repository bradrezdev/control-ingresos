/**
 * useTransactionSubmit — control-ingresos (redesign, T7)
 *
 * Shared transaction persistence, extracted verbatim from the previous
 * `onSubmitForm` in pages/Transactions.tsx (no behavior change: same
 * field mapping, same `transactionsRepo.create` for creates and same
 * `transactionsStore.update` for edits). The Movimientos edit sheet and
 * the full-screen Nueva transacción page both go through this hook, so
 * there is exactly one submit path.
 */
import { transactionsRepo } from "@/db/repositories";
import { useTransactionsStore } from "@/stores/transactionsStore";
import type { MsiTerm, Transaction } from "@/db/schemas/transaction";
import type { TransactionFormValues_Output } from "./TransactionForm";

export interface TransactionSubmitters {
  createTransaction: (values: TransactionFormValues_Output) => Promise<void>;
  updateTransaction: (
    id: string,
    values: TransactionFormValues_Output,
  ) => Promise<void>;
}

export function useTransactionSubmit(currency: string): TransactionSubmitters {
  const update = useTransactionsStore((s) => s.update);

  async function createTransaction(
    values: TransactionFormValues_Output,
  ): Promise<void> {
    const repo = transactionsRepo;
    if (values.type === "income") {
      await repo.create({
        type: "income",
        amount: values.amount,
        currency,
        description: values.description,
        date: values.date,
        category: values.category,
        paymentMethod: values.paymentMethod as "cash" | "transfer",
      } as Parameters<typeof repo.create>[0]);
    } else if (values.type === "expense") {
      await repo.create({
        type: "expense",
        amount: values.amount,
        currency,
        description: values.description,
        date: values.date,
        category: values.category,
        paymentMethod: values.paymentMethod as
          | "cash"
          | "debit"
          | "credit"
          | "transfer",
        ...(values.cardId ? { cardId: values.cardId } : {}),
      } as Parameters<typeof repo.create>[0]);
    } else {
      if (!values.cardId || !values.msiMonths || !values.msiStartDate) {
        // Schema-level validation should have caught this. Bail.
        return;
      }
      await repo.create({
        type: "expense_msi",
        amount: values.amount,
        currency,
        description: values.description,
        date: values.date,
        category: values.category,
        paymentMethod: "credit",
        cardId: values.cardId,
        msiMonths: values.msiMonths,
        msiStartDate: values.msiStartDate,
      } as Parameters<typeof repo.create>[0]);
    }
  }

  async function updateTransaction(
    id: string,
    values: TransactionFormValues_Output,
  ): Promise<void> {
    if (values.type === "income") {
      await update(id, {
        type: "income",
        amount: values.amount,
        description: values.description,
        date: values.date,
        category: values.category,
        paymentMethod: values.paymentMethod as "cash" | "transfer",
      } as Partial<Transaction>);
    } else if (values.type === "expense") {
      await update(id, {
        type: "expense",
        amount: values.amount,
        description: values.description,
        date: values.date,
        category: values.category,
        paymentMethod: values.paymentMethod as
          | "cash"
          | "debit"
          | "credit"
          | "transfer",
        ...(values.cardId ? { cardId: values.cardId } : {}),
      } as Partial<Transaction>);
    } else {
      await update(id, {
        type: "expense_msi",
        amount: values.amount,
        description: values.description,
        date: values.date,
        category: values.category,
        paymentMethod: "credit",
        cardId: values.cardId ?? "",
        msiMonths: (values.msiMonths ?? 3) as MsiTerm,
        msiStartDate: values.msiStartDate ?? values.date,
      } as Partial<Transaction>);
    }
  }

  return { createTransaction, updateTransaction };
}
