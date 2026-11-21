/**
 * FixedPaymentDetail — control-ingresos (redesign-ui-2026, T6)
 *
 * Detail sheet content for a single fixed payment, equivalent to the
 * prototype's `fixedDetail` sheet: charge amount, account, category,
 * frequency, payment day (and the MSI term when present) plus the
 * Editar / Eliminar actions.
 */
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Amount } from "@/components/ui/design";
import { useLiveCards } from "@/hooks/useLiveCards";
import type { FixedPayment } from "@/db/schemas/fixedPayment";
import { METHOD_LABEL, PERIOD_LABEL } from "./types";

export interface FixedPaymentDetailProps {
  fixedPayment: FixedPayment;
  currency: string;
  onEdit: (fixedPayment: FixedPayment) => void;
  onDelete: (fixedPayment: FixedPayment) => void;
}

export function FixedPaymentDetail({
  fixedPayment: fp,
  currency,
  onEdit,
  onDelete,
}: FixedPaymentDetailProps): React.JSX.Element {
  const cards = useLiveCards();
  const account = fp.cardId
    ? (cards?.find((c) => c.id === fp.cardId)?.bank ?? METHOD_LABEL[fp.paymentMethod])
    : METHOD_LABEL[fp.paymentMethod];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-1 py-2">
        <Amount
          cents={fp.amount}
          currency={currency}
          className="text-secondary-figure font-extrabold text-ink"
        />
        <span className="text-aux text-muted">Importe por cargo</span>
      </div>

      <dl className="grid grid-cols-[1fr_2fr] gap-y-3 text-body">
        <dt className="text-muted">Cuenta</dt>
        <dd className="text-right text-ink">{account}</dd>

        <dt className="text-muted">Categoría</dt>
        <dd className="text-right text-ink">{fp.category ?? "—"}</dd>

        <dt className="text-muted">Frecuencia</dt>
        <dd className="text-right text-ink">{PERIOD_LABEL[fp.period]}</dd>

        <dt className="text-muted">Día del cargo</dt>
        <dd className="text-right text-ink">{fp.paymentDay}</dd>

        {fp.msiMonths ? (
          <>
            <dt className="text-muted">Meses sin intereses</dt>
            <dd className="text-right text-ink">{fp.msiMonths} meses</dd>
          </>
        ) : null}
      </dl>

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          onClick={() => onEdit(fp)}
          leftIcon={<Pencil className="size-4" strokeWidth={2} aria-hidden />}
        >
          Editar
        </Button>
        <Button
          type="button"
          variant="danger"
          className="flex-1"
          onClick={() => onDelete(fp)}
          leftIcon={<Trash2 className="size-4" strokeWidth={2} aria-hidden />}
        >
          Eliminar
        </Button>
      </div>
    </div>
  );
}
