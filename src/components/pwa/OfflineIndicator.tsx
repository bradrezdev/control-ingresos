/**
 * OfflineIndicator — control-ingresos
 *
 * A subtle top banner that surfaces when the browser loses network
 * connectivity. The app is local-first (Dexie), so functionality is
 * preserved; this banner simply informs the user that data sync is
 * paused.
 *
 * UX rules:
 *   - Only appears after the user has been online at least once during
 *     the current session. This avoids a confusing flash on first load
 *     for users who are genuinely offline from the start.
 *   - Disappears automatically when the `online` event fires.
 *
 * Accessibility:
 *   - `role="status"` + `aria-live="polite"` so screen readers announce
 *     the state change without stealing focus.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { WifiOff } from "lucide-react";

export function OfflineIndicator(): React.JSX.Element {
  // Hooks always at the top.
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false,
  );
  const [hasBeenOnline, setHasBeenOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : false,
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setHasBeenOnline(true);
    };
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const shouldShow = isOffline && hasBeenOnline;

  return (
    <AnimatePresence>
      {shouldShow ? (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          role="status"
          aria-live="polite"
          className="fixed top-0 left-0 right-0 z-50 bg-[var(--color-warning)]/95 backdrop-blur-sm text-white text-center text-xs py-2 px-4 shadow-[var(--shadow-card)]"
        >
          <WifiOff className="inline size-3.5 mr-1.5 align-text-bottom" aria-hidden />
          Sin conexión — los datos quedan locales y se sincronizan al reconectar.
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
