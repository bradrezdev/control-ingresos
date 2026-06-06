/**
 * FixedPayments store — control-ingresos
 *
 * Write-through proxy to the fixedPayments repository. Dexie is the source
 * of truth; this store is mainly for imperative write actions.
 */
import { create } from "zustand";
import { fixedPaymentsRepo } from "@/db/repositories";
import type {
  FixedPayment,
  FixedPaymentInput,
} from "@/db/schemas/fixedPayment";

export interface FixedPaymentsState {
  fixedPayments: FixedPayment[];
  loading: boolean;

  refresh: () => Promise<void>;
  create: (input: FixedPaymentInput) => Promise<FixedPayment>;
  update: (
    id: string,
    patch: Partial<FixedPayment>,
  ) => Promise<FixedPayment>;
  remove: (id: string) => Promise<void>;
}

export const useFixedPaymentsStore = create<FixedPaymentsState>((set) => ({
  fixedPayments: [],
  loading: true,

  refresh: async () => {
    const fixedPayments = await fixedPaymentsRepo.list();
    set({ fixedPayments, loading: false });
  },

  create: async (input) => {
    const fp = await fixedPaymentsRepo.create(input);
    set((s) => ({ fixedPayments: [...s.fixedPayments, fp] }));
    return fp;
  },

  update: async (id, patch) => {
    const fp = await fixedPaymentsRepo.update(id, patch);
    set((s) => ({
      fixedPayments: s.fixedPayments.map((f) => (f.id === id ? fp : f)),
    }));
    return fp;
  },

  remove: async (id) => {
    await fixedPaymentsRepo.delete(id);
    set((s) => ({
      fixedPayments: s.fixedPayments.filter((f) => f.id !== id),
    }));
  },
}));
