/**
 * Badge — control-ingresos
 *
 * Compact status indicator. Variants map to semantic intent (success,
 * warning, danger, info, neutral). Used for transaction categories,
 * budget status, and MSI tenure indicators.
 */
import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  cn(
    "inline-flex items-center gap-1",
    "px-2.5 py-0.5",
    "rounded-full",
    "text-xs font-medium",
    "leading-none",
  ),
  {
    variants: {
      variant: {
        default: "bg-[var(--color-surface-inset)] text-[var(--color-text-body)]",
        success: "bg-[var(--color-success)]/10 text-[var(--color-success)]",
        warning: "bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
        danger: "bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
        info: "bg-[var(--color-secondary)]/10 text-[var(--color-secondary)]",
        primary: "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  children: ReactNode;
}

export function Badge({
  className,
  variant,
  children,
  ...props
}: BadgeProps): React.JSX.Element {
  return (
    <span
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      {children}
    </span>
  );
}
