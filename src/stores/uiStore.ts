/**
 * UI store — control-ingresos
 *
 * Holds UI preferences (persisted to localStorage) and ephemeral state
 * (modals) that does NOT need to survive a refresh.
 *
 *   - sidebarOpen: collapsed/expanded state of the desktop sidebar.
 *   - activeModal: ID of the currently open modal (single-modal model for
 *     simplicity; switching modals closes the previous one).
 *   - theme: 'light' | 'dark' | 'system'. Persisted.
 *   - currentMonth: the "YYYY-MM" month being displayed. Persisted so a
 *     user navigating away and back returns to the same period.
 *
 * Modals are NOT persisted (always starts closed on reload).
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Theme = "light" | "dark" | "system";

export interface UiState {
  sidebarOpen: boolean;
  activeModal: string | null;
  theme: Theme;
  currentMonth: string;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveModal: (id: string | null) => void;
  setTheme: (theme: Theme) => void;
  setCurrentMonth: (month: string) => void;
}

const currentMonthNow = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      activeModal: null,
      theme: "system",
      currentMonth: currentMonthNow(),

      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setActiveModal: (id) => set({ activeModal: id }),
      setTheme: (theme) => set({ theme }),
      setCurrentMonth: (month) => set({ currentMonth: month }),
    }),
    {
      name: "control-ingresos-ui",
      storage: createJSONStorage(() => localStorage),
      // Persist preferences only; activeModal is ephemeral.
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        theme: state.theme,
        currentMonth: state.currentMonth,
      }),
    },
  ),
);
