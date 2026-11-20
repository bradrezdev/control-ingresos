import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/money/format";

export interface AmountProps extends HTMLAttributes<HTMLSpanElement> {
  /** Amount in cents. */
  cents: number;
  /** Currency code. Defaults to MXN. */
  currency?: string;
  /** How to render the sign. `auto` preserves the integer sign. */
  sign?: "auto" | "positive" | "negative";
  /** Optional prefix for positive values. Use `"+"` for income. */
  prefix?: "+";
}

/**
 * Currency amount for the redesign.
 *
 * Uses the shared money formatter and renders with tabular figures so columns
 * of amounts align. Negative values are displayed with a typographic minus
 * sign (U+2212) instead of a hyphen, and a `+` prefix can be requested for
 * positive amounts such as income.
 */
export function Amount({
  cents,
  currency = "MXN",
  sign = "auto",
  prefix,
  className,
  ...props
}: AmountProps): React.JSX.Element {
  const value =
    sign === "positive" ? Math.abs(cents) : sign === "negative" ? -Math.abs(cents) : cents;

  let text = formatCurrency(value, currency).replace(/^-/, "\u2212");
  if (prefix === "+" && value > 0) {
    text = `+${text}`;
  }

  return (
    <span className={cn("tabular-nums tracking-tight", className)} {...props}>
      {text}
    </span>
  );
}
