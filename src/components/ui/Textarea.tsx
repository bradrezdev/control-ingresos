/**
 * Textarea — control-ingresos
 *
 * Multi-line text input. Matches the Input visual style with 16px radius,
 * inset background, and a focus ring. Resizes vertically only.
 */
import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean | undefined;
}

export function Textarea({
  className,
  invalid,
  rows = 3,
  ...props
}: TextareaProps): React.JSX.Element {
  return (
    <textarea
      rows={rows}
      className={cn(
        "w-full bg-[var(--color-surface-inset)] text-[var(--color-text-body)]",
        "border border-[var(--color-border-subtle)]",
        "rounded-[var(--radius-md)] px-4 py-3 text-sm",
        "placeholder:text-[var(--color-text-muted)]",
        "transition-colors duration-[var(--duration-fast)] resize-y",
        "focus:outline-none focus:border-[var(--color-border-focus)] focus:bg-[var(--color-surface)]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        invalid &&
          "border-[var(--color-danger)] focus:border-[var(--color-danger)]",
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}
