/**
 * InstallPrompt — control-ingresos
 *
 * Surfaces the browser's native PWA install prompt as a friendly bottom
 * card. The prompt is only available after the user has interacted with
 * the app at least once and the browser fires `beforeinstallprompt`.
 *
 * UX rules:
 *   - If the user has already dismissed the prompt (persisted), do not
 *     show it again, even on a fresh `beforeinstallprompt` event.
 *   - If the user accepts, the browser takes over (we never re-show on
 *     the same session).
 *   - If the user dismisses (closes the banner or rejects the native
 *     prompt), persist `installPromptDismissed = true`.
 *
 * Notes:
 *   - The component returns `null` on SSR or when the browser does not
 *     support `beforeinstallprompt` (e.g. iOS Safari).
 *   - Listeners are attached to `window`, so the component is a Client
 *     Component effect — the only `useEffect` in the file runs once on
 *     mount, and is gated by the persisted `installPromptDismissed`.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, X } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { useUiStore } from "@/stores/uiStore";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt(): React.JSX.Element | null {
  // Hooks always at the top, before any early return.
  const installPromptDismissed = useUiStore((s) => s.installPromptDismissed);
  const setInstallPromptDismissed = useUiStore((s) => s.setInstallPromptDismissed);

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (installPromptDismissed) return;
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [installPromptDismissed]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "dismissed") {
      setInstallPromptDismissed(true);
    }
    setShowPrompt(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setInstallPromptDismissed(true);
    setShowPrompt(false);
  };

  return (
    <AnimatePresence>
      {showPrompt ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50"
          role="dialog"
          aria-label="Instalar aplicación"
        >
          <GlassCard className="p-4 flex items-center gap-3">
            <Download className="size-5 shrink-0 text-[var(--color-primary)]" aria-hidden />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Instalá Control de Ingresos</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Acceso rápido desde tu pantalla.
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={handleInstall}>
              Instalar
            </Button>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 rounded hover:bg-[var(--color-surface-inset)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]"
              aria-label="Cerrar"
            >
              <X className="size-4" />
            </button>
          </GlassCard>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
