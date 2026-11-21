import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "children"> {
  icon: ReactNode;
  "aria-label": string;
}

/**
 * Circular 44×44 icon button.
 *
 * Equivalent to the prototype's `.bt` primitive: paper background, primary
 * color, fully rounded.
 */
export function IconButton({
  icon,
  className,
  ...props
}: IconButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-full",
        "bg-surface text-primary",
        "transition-colors duration-fast ease-out-soft",
        "hover:bg-day",
        "disabled:opacity-50 disabled:pointer-events-none",
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );
}
