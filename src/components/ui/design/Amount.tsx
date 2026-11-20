import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/money/format";

export interface AmountProps extends HTMLAttributes<HTMLSpanElement> {
  /** Amount in cents. */
  cents: number;
  /** How to render the sign. `auto` preserves the integer sign. */
  sign?: "auto" | "positive" | "negative";
}

/**
 * Currency amount for the redesign.
 *
 * Uses the shared money formatter (MXN) and renders with tabular figures so
 * columns of amounts align.
 */
export function Amount({
  cents,
  sign = "auto",
  className,
  ...props
}: AmountProps): React.JSX.Element {
  const value = sign === "positive" ? Math.abs(cents) : sign === "negative" ? -Math.abs(cents) : cents;
  return (
    <span className={cn("tabular-nums tracking-tight", className)} {...props}>
      {formatCurrency(value, "MXN")}
    </span>
  );
}
