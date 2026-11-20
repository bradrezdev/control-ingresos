import { Clock, ChevronRight } from "lucide-react";
import { NavLink } from "react-router";
import { Amount } from "@/components/ui/design";
import { formatDayAndMonth, utcDateToLocal } from "@/lib/date/format";
import type { CardPaymentRow } from "../types";

export interface UrgentNoticeProps {
  payment: CardPaymentRow;
  currency: string;
}

export function UrgentNotice({ payment, currency }: UrgentNoticeProps): React.JSX.Element {
  const { bank, daysUntil, amountCents, paymentDate } = payment;

  const when =
    daysUntil === 0
      ? `${bank} vence hoy`
      : daysUntil === 1
        ? `${bank} vence mañana`
        : `${bank} vence en ${daysUntil} días`;

  return (
    <NavLink
      to="/cards"
      className="flex items-center gap-3 rounded-pill bg-warning-bg px-4 py-3 text-warning min-h-[52px]"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-warning text-white">
        <Clock className="size-5" aria-hidden strokeWidth={2} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-bold">{when}</span>
        <span className="text-xs opacity-90">
          {formatDayAndMonth(utcDateToLocal(paymentDate))}, <Amount cents={amountCents} currency={currency} />
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0" aria-hidden strokeWidth={2} />
    </NavLink>
  );
}
