/**
 * FixedPaymentListItem — control-ingresos
 *
 * A single fixed payment row. Mirrors the surface treatment of
 * `CardListItem` (rounded card, left accent bar, action buttons on the
 * right) but for recurring payments: header has description + amount +
 * period badge; footer shows the day-of-month and payment method.
 */
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { useSettingsStore } from "@/stores/settingsStore";
import { formatCurrency } from "@/lib/money/format";
import type { FixedPayment } from "@/db/schemas/fixedPayment";

const PERIOD_LABEL: Record<FixedPayment["period"], string> = {
  monthly: "Mensual",
  bimonthly: "Bimestral",
  quarterly: "Trimestral",
};

const METHOD_LABEL: Record<FixedPayment["paymentMethod"], string> = {
  cash: "Efectivo",
  debit: "Débito",
  credit: "Crédito",
  transfer: "Transferencia",
};

export interface FixedPaymentListItemProps {
  fixedPayment: FixedPayment;
  onEdit: (fp: FixedPayment) => void;
  onDelete: (fp: FixedPayment) => void;
}

export function FixedPaymentListItem({
  fixedPayment,
  onEdit,
  onDelete,
}: FixedPaymentListItemProps): React.JSX.Element {
  const currency = useSettingsStore((s) => s.settings?.currency ?? "MXN");

  return (
    <li className="list-none">
      <div
        className={cn(
          "group flex items-stretch gap-3",
          "rounded-[var(--radius-lg)]",
          "border border-[var(--color-border-subtle)] border-l-[3px]",
          "border-l-[var(--color-primary)]",
          "bg-[var(--color-surface)]",
        )}
      >
        <div className="flex-1 flex items-center justify-between gap-4 px-4 py-3 md:px-5 md:py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
                {fixedPayment.description}
              </h3>
              <Badge variant="default" className="hidden sm:inline-flex">
                {PERIOD_LABEL[fixedPayment.period]}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-[var(--color-text-body)]">
              {formatCurrency(fixedPayment.amount, currency)}
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
              Día {fixedPayment.paymentDay} de cada {PERIOD_LABEL[fixedPayment.period].toLowerCase()} · {METHOD_LABEL[fixedPayment.paymentMethod]}
              {fixedPayment.category ? ` · ${fixedPayment.category}` : null}
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onEdit(fixedPayment)}
              aria-label={`Editar pago fijo ${fixedPayment.description}`}
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
              onClick={() => onDelete(fixedPayment)}
              aria-label={`Eliminar pago fijo ${fixedPayment.description}`}
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
        </div>
      </div>
    </li>
  );
}
