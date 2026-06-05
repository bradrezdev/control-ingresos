/**
 * Debts store — control-ingresos
 *
 * Write-through proxy to the debts repository. Dexie is the source of
 * truth; this store is mainly for imperative write actions.
 */
import { create } from "zustand";
import { debtsRepo } from "@/db/repositories";
import type { Debt, DebtInput } from "@/db/schemas/debt";

export interface DebtsState {
  debts: Debt[];
  loading: boolean;

  refresh: () => Promise<void>;
  create: (input: DebtInput) => Promise<Debt>;
  update: (id: string, patch: Partial<Debt>) => Promise<Debt>;
  remove: (id: string) => Promise<void>;
}

export const useDebtsStore = create<DebtsState>((set) => ({
  debts: [],
  loading: true,

  refresh: async () => {
    const debts = await debtsRepo.list();
    set({ debts, loading: false });
  },

  create: async (input) => {
    const debt = await debtsRepo.create(input);
    set((s) => ({ debts: [...s.debts, debt] }));
    return debt;
  },

  update: async (id, patch) => {
    const debt = await debtsRepo.update(id, patch);
    set((s) => ({ debts: s.debts.map((d) => (d.id === id ? debt : d)) }));
    return debt;
  },

  remove: async (id) => {
    await debtsRepo.delete(id);
    set((s) => ({ debts: s.debts.filter((d) => d.id !== id) }));
  },
}));
