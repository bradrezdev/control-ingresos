/**
 * Settings store — control-ingresos
 *
 * Mirrors the Dexie `settings` row into Zustand so React components can
 * subscribe to changes without a full re-render of the Dexie live-query
 * tree.
 *
 * Source of truth is ALWAYS Dexie (IndexedDB). This store is a thin cache
 * and write-through proxy to `settingsRepo`.
 *
 * Hydration: `BootstrapProvider` calls `settingsRepo.getOrCreate()` to
 * ensure the singleton exists, then `refresh()` to populate the store.
 */
import { create } from "zustand";
import { settingsRepo } from "@/db/repositories";
import type { Settings } from "@/db/schemas/settings";

export interface SettingsState {
  settings: Settings | null;
  loading: boolean;

  refresh: () => Promise<void>;
  setMonthlyLimit: (limit: number) => Promise<void>;
  setCurrency: (currency: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  loading: true,

  refresh: async () => {
    const settings = await settingsRepo.getOrCreate();
    set({ settings, loading: false });
  },

  setMonthlyLimit: async (limit) => {
    const current = get().settings;
    if (!current) return;
    const updated = await settingsRepo.update({ monthlyLimit: limit });
    set({ settings: updated });
  },

  setCurrency: async (currency) => {
    const current = get().settings;
    if (!current) return;
    const updated = await settingsRepo.update({ currency });
    set({ settings: updated });
  },
}));
