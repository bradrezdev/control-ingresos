/**
 * Button — control-ingresos
 *
 * Variants follow the ONANO Apple-style minimalism guide:
 *   - primary: solid primary color (CTAs)
 *   - secondary: outlined (filter chips, secondary actions)
 *   - ghost: text-only (tertiary actions, navigation)
 *   - danger: destructive actions (delete, remove)
 *
 * Sizes follow the 24/32px radius rule (md=24, cta=32).
 * `loading` replaces children with a spinner and disables the button.
 */
import { Loader2 } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  cn(
    "inline-flex items-center justify-center gap-2",
    "font-medium whitespace-nowrap select-none",
    "transition-all duration-[var(--duration-fast)] ease-[var(--ease-out-soft)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-canvas)]",
    "disabled:opacity-50 disabled:pointer-events-none",
    "active:scale-[0.98]",
  ),
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--color-primary)] text-[var(--color-text-inverse)] hover:bg-[var(--color-primary-hover)] shadow-[var(--shadow-cta)]",
        secondary:
          "bg-transparent text-[var(--color-primary)] border border-[var(--color-border-strong)] hover:bg-[var(--color-surface-inset)]",
        ghost:
          "bg-transparent text-[var(--color-text-body)] hover:bg-[var(--color-surface-inset)]",
        danger:
          "bg-[var(--color-danger)] text-[var(--color-text-inverse)] hover:opacity-90",
      },
      size: {
        sm: "h-9 px-3 text-sm rounded-[var(--radius-md)]",
        md: "h-11 px-5 text-sm rounded-[var(--radius-md)]",
        lg: "h-12 px-6 text-base rounded-[var(--radius-lg)]",
        cta: "h-14 px-8 text-base font-semibold rounded-[var(--radius-xl)]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children?: ReactNode;
}

export function Button({
  className,
  variant,
  size,
  loading = false,
  leftIcon,
  rightIcon,
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps): React.JSX.Element {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : leftIcon ? (
        <span className="shrink-0" aria-hidden>
          {leftIcon}
        </span>
      ) : null}
      {children}
      {!loading && rightIcon ? (
        <span className="shrink-0" aria-hidden>
          {rightIcon}
        </span>
      ) : null}
    </button>
  );
}
