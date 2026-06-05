/**
 * UpdateBanner — control-ingresos
 *
 * Surfaces a friendly banner when the service worker has a new version
 * ready to install. Uses `useRegisterSW` from `virtual:pwa-register/react`
 * (provided by vite-plugin-pwa) to subscribe to update notifications.
 *
 * Behavior:
 *   - Listens for `onRegisteredSW` to know the SW is alive.
 *   - `needRefresh` is set by the plugin when a new SW is waiting.
 *   - Clicking "Recargar" calls `updateServiceWorker(true)` which applies
 *     the new SW and reloads the page (controlled by the plugin's
 *     `registerType: "autoUpdate"`).
 *
 * Accessibility:
 *   - `role="status"` + `aria-live="polite"` lets screen readers announce
 *     the update without stealing focus.
 */
import { useRegisterSW } from "virtual:pwa-register/react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";

export function UpdateBanner(): React.JSX.Element | null {
  // Hooks always at the top, before any early return.
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl) {
      console.log("SW registered:", swUrl);
    },
    onRegisterError(error) {
      console.error("SW registration error:", error);
    },
  });

  const handleUpdate = () => {
    void updateServiceWorker(true);
  };

  return (
    <AnimatePresence>
      {needRefresh ? (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50"
          role="status"
          aria-live="polite"
        >
          <GlassCard className="p-4 flex items-center gap-3">
            <RefreshCw className="size-5 shrink-0 text-[var(--color-primary)]" aria-hidden />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Nueva versión disponible</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Recargá para usar la última versión.
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={handleUpdate}>
              Recargar
            </Button>
            <button
              type="button"
              onClick={() => setNeedRefresh(false)}
              className="p-1 rounded hover:bg-[var(--color-surface-inset)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]"
              aria-label="Más tarde"
            >
              <span aria-hidden>✕</span>
            </button>
          </GlassCard>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
