/**
 * ThemeToggle — control-ingresos
 *
 * 3-segment radio control to choose between light/dark/system themes.
 * Reads and writes `useUiStore.theme`, which is persisted to localStorage
 * by the store and applied to `<html data-theme="...">` by the
 * BootstrapProvider.
 *
 * Variants:
 *   - sm: icons only (default — fits in sidebar)
 *   - md: icons + labels (use inside Settings)
 *
 * Accessibility:
 *   - role="radiogroup" on the wrapper
 *   - role="radio" + aria-checked + aria-label on each button
 *   - keyboard-friendly (native buttons; Space/Enter activate them)
 */
import { Sun, Moon, Monitor, type LucideIcon } from "lucide-react";
import { useUiStore, type Theme } from "@/stores/uiStore";
import { cn } from "@/lib/cn";

interface ThemeOption {
  value: Theme;
  label: string;
  icon: LucideIcon;
}

const OPTIONS: ThemeOption[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

export interface ThemeToggleProps {
  size?: "sm" | "md";
  className?: string;
}

export function ThemeToggle({
  size = "sm",
  className,
}: ThemeToggleProps): React.JSX.Element {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);

  return (
    <div
      role="radiogroup"
      aria-label="Tema"
      className={cn(
        "inline-flex items-center gap-0.5 p-1",
        "rounded-[var(--radius-md)]",
        "bg-[var(--color-surface-inset)]",
        "border border-[var(--color-border-subtle)]",
        className,
      )}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            onClick={() => setTheme(value)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5",
              "rounded-[var(--radius-sm)]",
              "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-soft)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]",
              size === "sm" ? "px-2 py-1 text-xs min-h-[28px]" : "px-3 py-1.5 text-sm min-h-[36px]",
              active
                ? "bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-[var(--shadow-card)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-body)]",
            )}
          >
            <Icon
              className={size === "sm" ? "size-3.5" : "size-4"}
              aria-hidden
            />
            {size === "md" ? <span>{label}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
