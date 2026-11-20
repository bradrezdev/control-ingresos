import { Settings } from "lucide-react";
import { Link } from "react-router";
import { cn } from "@/lib/cn";

/**
 * Circular 44×44 settings button.
 *
 * Used in the redesigned screen headers to reach the Settings page.
 */
export function SettingsButton(): React.JSX.Element {
  return (
    <Link
      to="/settings"
      aria-label="Ajustes"
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-full",
        "bg-surface text-primary",
        "transition-colors duration-fast ease-out-soft",
        "hover:bg-day",
      )}
    >
      <Settings className="size-5" aria-hidden strokeWidth={2} />
    </Link>
  );
}
