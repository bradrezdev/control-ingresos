import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface ChipProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children: ReactNode;
  active: boolean;
}

/**
 * Pill-shaped toggle chip.
 *
 * Equivalent to the prototype's `.ch` / `.ch.on` primitives: 44px tall,
 * fully rounded, inactive on a paper/segment surface, active on the primary
 * button color with white text.
 */
export function Chip({
  active,
  children,
  className,
  ...props
}: ChipProps): React.JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex h-11 items-center justify-center whitespace-nowrap px-5",
        "rounded-pill text-sm font-semibold",
        "transition-colors duration-fast ease-out-soft",
        "focus-visible:outline-offset-2",
        active
          ? "bg-button text-hero-text hover:bg-primary-hover"
          : "bg-surface text-text-secondary hover:bg-selected hover:text-primary",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
