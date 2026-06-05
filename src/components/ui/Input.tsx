/**
 * Input — control-ingresos
 *
 * Apple-style input: slightly darker inset background, subtle border,
 * 16px radius, prominent focus ring. Supports left/right addons for icons
 * or unit labels (e.g. currency prefix).
 *
 * Uses the React 19 `ref as prop` pattern (no forwardRef needed).
 */
import { cva, type VariantProps } from "class-variance-authority";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

const inputVariants = cva(
  cn(
    "w-full bg-[var(--color-surface-inset)] text-[var(--color-text-body)]",
    "border border-[var(--color-border-subtle)]",
    "placeholder:text-[var(--color-text-muted)]",
    "transition-colors duration-[var(--duration-fast)]",
    "focus:outline-none focus:border-[var(--color-border-focus)] focus:bg-[var(--color-surface)]",
    "disabled:opacity-50 disabled:cursor-not-allowed",
  ),
  {
    variants: {
      size: {
        sm: "h-9 px-3 text-sm rounded-[var(--radius-sm)]",
        md: "h-11 px-4 text-sm rounded-[var(--radius-md)]",
        lg: "h-12 px-5 text-base rounded-[var(--radius-md)]",
      },
      state: {
        default: "",
        error:
          "border-[var(--color-danger)] focus:border-[var(--color-danger)]",
      },
    },
    defaultVariants: {
      size: "md",
      state: "default",
    },
  },
);

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
  leftAddon?: ReactNode;
  rightAddon?: ReactNode;
  invalid?: boolean | undefined;
}

export function Input({
  className,
  size,
  state,
  leftAddon,
  rightAddon,
  invalid,
  ...props
}: InputProps): React.JSX.Element {
  const resolvedState = invalid ? "error" : state;

  if (!leftAddon && !rightAddon) {
    return (
      <input
        className={cn(inputVariants({ size, state: resolvedState }), className)}
        aria-invalid={invalid || undefined}
        {...props}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 w-full",
        "bg-[var(--color-surface-inset)] border border-[var(--color-border-subtle)]",
        "rounded-[var(--radius-md)]",
        "transition-colors duration-[var(--duration-fast)]",
        "focus-within:border-[var(--color-border-focus)] focus-within:bg-[var(--color-surface)]",
        invalid &&
          "border-[var(--color-danger)] focus-within:border-[var(--color-danger)]",
        size === "sm" ? "h-9 px-2" : size === "lg" ? "h-12 px-4" : "h-11 px-3",
      )}
    >
      {leftAddon ? (
        <span
          className="shrink-0 text-[var(--color-text-muted)] flex items-center"
          aria-hidden
        >
          {leftAddon}
        </span>
      ) : null}
      <input
        className={cn(
          "flex-1 min-w-0 bg-transparent border-0 outline-none",
          "text-[var(--color-text-body)] placeholder:text-[var(--color-text-muted)]",
          size === "sm" ? "text-sm" : size === "lg" ? "text-base" : "text-sm",
          className,
        )}
        aria-invalid={invalid || undefined}
        {...props}
      />
      {rightAddon ? (
        <span
          className="shrink-0 text-[var(--color-text-muted)] flex items-center"
          aria-hidden
        >
          {rightAddon}
        </span>
      ) : null}
    </div>
  );
}
