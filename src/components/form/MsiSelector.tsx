/**
 * MsiSelector — control-ingresos
 *
 * Visual selector for an MSI (Meses Sin Intereses) term. Shows the
 * monthly installment preview next to each option. Uses the 3/6/9/12/18/24
 * tenure list and renders as a row of pill-shaped buttons.
 */
import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { getMsiMonthlyAmount } from "@/engine/msi";
import { MSI_TERM, type MsiTerm } from "@/db/schemas/transaction";
import { centsToDisplay, formatCurrency } from "@/lib/money/format";

export interface MsiSelectorProps {
  /** Total amount in cents. */
  totalCents: number;
  /** Currently selected term, or null. */
  value: MsiTerm | null;
  onChange: (term: MsiTerm) => void;
  currency?: string;
  disabled?: boolean;
  label?: string;
}

export function MsiSelector({
  totalCents,
  value,
  onChange,
  currency = "MXN",
  disabled,
  label = "Plazo",
}: MsiSelectorProps): React.JSX.Element {
  const previews = useMemo(
    () =>
      MSI_TERM.map((term) => {
        const monthly = getMsiMonthlyAmount(centsToDisplay(totalCents), term);
        return { term, monthly };
      }),
    [totalCents],
  );

  return (
    <div className="flex flex-col gap-2 w-full">
      <span className="text-sm font-medium text-[var(--color-text-body)]">
        {label}
      </span>
      <div
        role="radiogroup"
        aria-label={label}
        className="grid grid-cols-3 sm:grid-cols-6 gap-2"
      >
        {previews.map(({ term, monthly }) => {
          const selected = value === term;
          return (
            <button
              key={term}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(term)}
              className={cn(
                "flex flex-col items-center justify-center",
                "min-h-[64px] px-3 py-2",
                "rounded-[var(--radius-md)]",
                "border transition-all duration-[var(--duration-fast)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]",
                selected
                  ? "bg-[var(--color-primary)] text-[var(--color-text-inverse)] border-[var(--color-primary)]"
                  : "bg-[var(--color-surface)] text-[var(--color-text-body)] border-[var(--color-border-subtle)] hover:border-[var(--color-border-strong)]",
                disabled && "opacity-50 cursor-not-allowed",
              )}
            >
              <span className="text-lg font-semibold">{term}</span>
              <span
                className={cn(
                  "text-[10px] mt-0.5 font-medium",
                  selected
                    ? "text-[var(--color-text-inverse)]/80"
                    : "text-[var(--color-text-muted)]",
                )}
              >
                {totalCents > 0
                  ? `${formatCurrency(monthly * 100, currency)}/mes`
                  : `${term} meses`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
