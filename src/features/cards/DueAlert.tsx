/**
 * DueAlert — control-ingresos (Tarjetas · Mis finanzas)
 *
 * La cápsula ámbar del próximo vencimiento: un reloj, el nombre de la
 * tarjeta, los días que faltan y, debajo, la fecha y el importe. Toda
 * la cápsula abre el desglose de ese pago.
 *
 * Medidas: `DESIGN-RULES` §4 (radio 999 px, alto mínimo 52 px, relleno
 * 6·14, separación 12 px) y §2 (fondo #FFF1D6, texto #4A22E00, círculo
 * #FFD98A).
 */
import { ChevronRight, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/money/format";
import { formatDayAndMonth, utcDateToLocal } from "@/lib/date/format";
import type { WalletPayment } from "@/engine/wallet";

export interface DueAlertProps {
  payment: WalletPayment;
  currency: string;
  onOpen: () => void;
}

/** "Hoy" / "Mañana" / "En N días". */
export function dueStateLabel(daysLeft: number): string {
  if (daysLeft === 0) return "Hoy";
  if (daysLeft === 1) return "Mañana";
  return `En ${daysLeft} días`;
}

export function DueAlert({
  payment,
  currency,
  onOpen,
}: DueAlertProps): React.JSX.Element {
  const state = dueStateLabel(payment.daysLeft);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-13 w-full items-center gap-3 rounded-full bg-alert-bg px-3.5 py-1.5 text-left text-alert-ink transition-colors duration-fast hover:bg-alert-bg/80"
    >
      <span
        className="grid size-10 shrink-0 place-items-center rounded-full bg-alert-icon text-alert-ink"
        aria-hidden
      >
        <Clock className="size-5" strokeWidth={2} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <b className="truncate text-base font-semibold">
          {payment.card.bank} · {state}
        </b>
        <span className="truncate text-aux">
          {formatDayAndMonth(utcDateToLocal(payment.due))},{" "}
          {formatCurrency(payment.totalCents, currency)}
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0" strokeWidth={2} aria-hidden />
    </button>
  );
}
