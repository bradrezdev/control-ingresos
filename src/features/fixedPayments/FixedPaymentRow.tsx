/**
 * FixedPaymentRow — control-ingresos (redesign-ui-2026, T6)
 *
 * Redesign list row for a fixed payment, equivalent to the prototype's
 * `.section-row`: recurring icon on a soft circle, description (15/600)
 * with the payment day as the 13px muted subtitle, and the amount
 * (15/700) plus the frequency chip on the right.
 *
 * Upcoming payments intentionally show no exact due date: the engine
 * exposes no next-occurrence rule, so the row only shows the payment day
 * and the frequency (which already says how often it recurs).
 */
import { Repeat } from "lucide-react";
import { Amount, ListRow } from "@/components/ui/design";
import type { FixedPayment } from "@/db/schemas/fixedPayment";
import { PERIOD_LABEL } from "./types";

export interface FixedPaymentRowProps {
  fixedPayment: FixedPayment;
  currency: string;
  onClick: () => void;
}

export function FixedPaymentRow({
  fixedPayment: fp,
  currency,
  onClick,
}: FixedPaymentRowProps): React.JSX.Element {
  return (
    <ListRow
      title={fp.description}
      subtitle={`Día ${fp.paymentDay}`}
      leading={<Repeat className="size-5" strokeWidth={2} aria-hidden />}
      onClick={onClick}
      trailing={
        <div className="flex flex-col items-end gap-0.5">
          <Amount
            cents={fp.amount}
            currency={currency}
            className="text-body font-bold text-ink"
          />
          <span className="inline-flex h-5 items-center rounded-pill bg-neutral-bg px-2 text-chip font-semibold text-text-secondary">
            {PERIOD_LABEL[fp.period]}
          </span>
        </div>
      }
    />
  );
}
