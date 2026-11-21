/**
 * UpcomingPayments — control-ingresos (Tarjetas · Mis finanzas)
 *
 * Una fila por tarjeta con pago previsto: el icono, el nombre de la
 * tarjeta, "Vence el …", el importe y el plazo relativo. Tocar la fila
 * abre el detalle de ese vencimiento.
 *
 * Medidas: `DESIGN-RULES` §4 (fila continua de 64 px mínimo, separación
 * interna 12 px, círculo de 40 px, pictograma de 20 px).
 */
import { CalendarDays } from "lucide-react";
import { formatCurrency } from "@/lib/money/format";
import { formatDayAndMonth, utcDateToLocal } from "@/lib/date/format";
import { dueStateLabel } from "./DueAlert";
import type { WalletPayment } from "@/engine/wallet";

export interface UpcomingPaymentsProps {
  payments: WalletPayment[];
  currency: string;
  onOpen: (payment: WalletPayment) => void;
}

export function UpcomingPayments({
  payments,
  currency,
  onOpen,
}: UpcomingPaymentsProps): React.JSX.Element {
  if (payments.length === 0) {
    return <p className="text-aux text-muted">Sin pagos previstos.</p>;
  }

  return (
    <ul className="flex list-none flex-col p-0" role="list">
      {payments.map((payment) => (
        <li key={payment.card.id}>
          <button
            type="button"
            onClick={() => onOpen(payment)}
            className="flex min-h-16 w-full items-center gap-3 border-t border-border-subtle py-2 text-left transition-colors duration-fast hover:bg-day"
          >
            <span
              className="grid size-10 shrink-0 place-items-center rounded-full bg-selected text-primary"
              aria-hidden
            >
              <CalendarDays className="size-5" strokeWidth={2} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <b className="truncate text-base font-semibold text-ink">
                {payment.card.bank}
              </b>
              <span className="truncate text-aux text-muted">
                Vence el {formatDayAndMonth(utcDateToLocal(payment.due))}
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <b className="text-base font-bold tabular-nums text-ink">
                {formatCurrency(payment.totalCents, currency)}
              </b>
              <span className="text-aux text-muted">
                {dueStateLabel(payment.daysLeft)}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
