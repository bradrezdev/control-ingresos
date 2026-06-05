/**
 * BootstrapProvider — control-ingresos
 *
 * Wraps the entire app and performs the ONE-TIME initialization needed
 * before any UI is rendered:
 *
 *   1. Ensures the Dexie database is open.
 *   2. Ensures the settings singleton exists (creates default if not).
 *   3. Hydrates the settings Zustand store.
 *   4. Re-seeds `currentMonth` in the UI store (only when persisted value
 *      is missing or stale).
 *
 * Renders a minimal splash while loading so the user never sees a flash of
 * empty content.
 */
import { useEffect, type ReactNode } from "react";
import { db } from "@/db/database";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUiStore } from "@/stores/uiStore";

interface BootstrapProviderProps {
  children: ReactNode;
}

function currentMonthNow(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function Splash(): React.JSX.Element {
  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center bg-[var(--color-canvas)]"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="size-10 rounded-full border-2 border-[var(--color-border-subtle)] border-t-[var(--color-primary)] animate-spin"
          aria-hidden
        />
        <p className="text-sm text-[var(--color-text-muted)]">Cargando…</p>
      </div>
    </div>
  );
}

export function BootstrapProvider({
  children,
}: BootstrapProviderProps): React.JSX.Element {
  const loading = useSettingsStore((s) => s.loading);
  const refresh = useSettingsStore((s) => s.refresh);
  const theme = useUiStore((s) => s.theme);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap(): Promise<void> {
      // Open Dexie (idempotent — if already open, this is a no-op).
      await db.open();
      if (cancelled) return;

      // Re-seed currentMonth to "now" so a user opening the app on a new
      // month lands on the current month even if localStorage has an
      // old persisted value.
      const uiStore = useUiStore.getState();
      const fresh = currentMonthNow();
      if (uiStore.currentMonth !== fresh) {
        uiStore.setCurrentMonth(fresh);
      }

      // Hydrate settings store.
      await refresh();
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [refresh]);

  // Apply `data-theme` to <html> so CSS tokens flip on user choice.
  // The CSS in src/styles/index.css scopes per :root[data-theme="..."],
  // with "system" relying on `prefers-color-scheme`.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  if (loading) {
    return <Splash />;
  }

  return <>{children}</>;
}
