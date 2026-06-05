/**
 * DebtListItem — control-ingresos
 *
 * Visual representation of a single debt. Shows creditor, description,
 * a progress bar (paid/original), monthly payment and remaining
 * balance. The progress bar color shifts as the debt gets closer to
 * being paid off (warning at >80%, success when fully paid).
 *
 * Action buttons:
 *   - "Pagar mensualidad" — opens a confirmation modal that records
 *     the standard fixedMonthlyPayment via the store.
 *   - Edit / Delete — wired up by the parent list.
 */
import { Pencil, Trash2, Wallet } from "lucide-react";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/money/format";
import type { Debt } from "@/db/schemas/debt";
import { useSettingsStore } from "@/stores/settingsStore";

export interface DebtListItemProps {
  debt: Debt;
  onEdit: (debt: Debt) => void;
  onDelete: (debt: Debt) => void;
  onPayMonthly: (debt: Debt) => void;
}

export function DebtListItem({
  debt,
  onEdit,
  onDelete,
  onPayMonthly,
}: DebtListItemProps): React.JSX.Element {
  const currency = useSettingsStore((s) => s.settings?.currency ?? "MXN");

  const isPaidOff = debt.remainingBalance === 0;
  const paid = Math.max(0, debt.originalAmount - debt.remainingBalance);
  const ratio =
    debt.originalAmount > 0
      ? Math.min(1, paid / debt.originalAmount)
      : 0;
  const percent = Math.round(ratio * 100);

  // Color thresholds: < 80% primary, 80-99% warning, 100% success.
  const progressColor = isPaidOff
    ? "bg-[var(--color-success)]"
    : percent >= 80
      ? "bg-[var(--color-warning)]"
      : "bg-[var(--color-primary)]";

  return (
    <article
      className={cn(
        "flex flex-col gap-3",
        "p-4 md:p-5",
        "rounded-[var(--radius-lg)]",
        "border border-[var(--color-border-subtle)]",
        "bg-[var(--color-surface)]",
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
              {debt.creditor}
            </h3>
            {isPaidOff ? (
              <Badge variant="success">Pagado</Badge>
            ) : percent >= 80 ? (
              <Badge variant="warning">Casi listo</Badge>
            ) : null}
          </div>
          {debt.description ? (
            <p className="mt-0.5 text-sm text-[var(--color-text-muted)] truncate">
              {debt.description}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(debt)}
            aria-label={`Editar deuda con ${debt.creditor}`}
            className={cn(
              "size-10 rounded-[var(--radius-md)]",
              "flex items-center justify-center",
              "text-[var(--color-text-muted)]",
              "hover:bg-[var(--color-surface-inset)] hover:text-[var(--color-primary)]",
              "transition-colors duration-[var(--duration-fast)]",
            )}
          >
            <Pencil className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onDelete(debt)}
            aria-label={`Eliminar deuda con ${debt.creditor}`}
            className={cn(
              "size-10 rounded-[var(--radius-md)]",
              "flex items-center justify-center",
              "text-[var(--color-text-muted)]",
              "hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)]",
              "transition-colors duration-[var(--duration-fast)]",
            )}
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      </header>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
          <span>{percent}% pagado</span>
          <span>
            {formatCurrency(paid, currency)} de {formatCurrency(debt.originalAmount, currency)}
          </span>
        </div>
        <div
          className="h-2 w-full rounded-full bg-[var(--color-surface-inset)] overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label={`Progreso de pago: ${percent}%`}
        >
          <div
            className={cn("h-full transition-all duration-500", progressColor)}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="text-sm">
          <p className="text-[var(--color-text-body)]">
            <span className="font-semibold">Saldo:</span>{" "}
            {formatCurrency(debt.remainingBalance, currency)}
          </p>
          <p className="text-[var(--color-text-muted)] text-xs">
            Mensualidad: {formatCurrency(debt.fixedMonthlyPayment, currency)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onPayMonthly(debt)}
          disabled={isPaidOff}
          className={cn(
            "inline-flex items-center gap-2 h-10 px-4",
            "rounded-[var(--radius-md)]",
            "bg-[var(--color-primary)] text-[var(--color-text-inverse)]",
            "hover:bg-[var(--color-primary-hover)]",
            "disabled:opacity-50 disabled:pointer-events-none",
            "transition-colors duration-[var(--duration-fast)]",
            "text-sm font-medium",
          )}
        >
          <Wallet className="size-4" aria-hidden />
          Pagar mensualidad
        </button>
      </footer>
    </article>
  );
}
