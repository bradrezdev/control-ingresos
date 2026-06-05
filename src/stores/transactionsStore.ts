/**
 * Transactions store — control-ingresos
 *
 * Write-through proxy to the transactions repository. Dexie is the source
 * of truth; this store is mainly for imperative write actions.
 *
 * For READS, prefer `useLiveTransactions` (Dexie reactive query) so the UI
 * updates when the data changes.
 */
import { create } from "zustand";
import { transactionsRepo } from "@/db/repositories";
import type { Transaction, TransactionInput } from "@/db/schemas/transaction";

export interface TransactionsState {
  transactions: Transaction[];
  loading: boolean;

  refresh: () => Promise<void>;
  create: (input: TransactionInput) => Promise<Transaction>;
  update: (id: string, patch: Partial<Transaction>) => Promise<Transaction>;
  remove: (id: string) => Promise<void>;
}

export const useTransactionsStore = create<TransactionsState>((set) => ({
  transactions: [],
  loading: true,

  refresh: async () => {
    const transactions = await transactionsRepo.list();
    set({ transactions, loading: false });
  },

  create: async (input) => {
    const tx = await transactionsRepo.create(input);
    set((s) => ({ transactions: [tx, ...s.transactions] }));
    return tx;
  },

  update: async (id, patch) => {
    const tx = await transactionsRepo.update(id, patch);
    set((s) => ({
      transactions: s.transactions.map((t) => (t.id === id ? tx : t)),
    }));
    return tx;
  },

  remove: async (id) => {
    await transactionsRepo.delete(id);
    set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }));
  },
}));
