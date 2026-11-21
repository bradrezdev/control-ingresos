/**
 * PaymentDetailSheet — control-ingresos (Tarjetas · Mis finanzas)
 *
 * Desglose del vencimiento de una tarjeta: importe, fechas y grupos de
 * cargos (MSI, compras de un solo pago y pagos fijos previstos).
 */
import { Sheet } from "@/components/ui/design";
import { formatCurrency } from "@/lib/money/format";
import { formatDayAndMonth, utcDateToLocal } from "@/lib/date/format";
import type { WalletPayment, WalletPaymentCharge } from "@/engine/wallet";

export interface PaymentDetailSheetProps {
  payment: WalletPayment;
  currency: string;
  onClose: () => void;
  /** "Ver tarjeta" */
  onOpenCard: () => void;
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-aux text-muted">{label}</span>
      <span className="text-base font-semibold tabular-nums text-ink">
        {value}
      </span>
    </div>
  );
}

function formatChargeDate(date: Date): string {
  return formatDayAndMonth(utcDateToLocal(date));
}

function ChargeRow({
  charge,
  currency,
}: {
  charge: WalletPaymentCharge;
  currency: string;
}): React.JSX.Element {
  return (
    <li className="flex min-h-16 items-center gap-3 border-t border-border-subtle py-2">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <b className="text-base font-semibold text-ink">{charge.description}</b>
        <span className="text-aux text-muted">
          {formatChargeDate(charge.date)}
          {charge.installment
            ? ` · Cuota ${charge.installment.n} de ${charge.installment.of}`
            : null}
        </span>
      </span>
      <span className="shrink-0 text-base font-bold tabular-nums text-ink">
        {formatCurrency(charge.cents, currency)}
      </span>
    </li>
  );
}

function PaymentGroup({
  title,
  charges,
  currency,
}: {
  title: string;
  charges: WalletPaymentCharge[];
  currency: string;
}): React.JSX.Element | null {
  if (charges.length === 0) return null;

  const total = charges.reduce((sum, charge) => sum + charge.cents, 0);

  return (
    <section className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-title font-bold leading-tight tracking-tight text-primary">
          {title}
        </h3>
        <span className="text-base font-bold tabular-nums text-ink">
          {formatCurrency(total, currency)}
        </span>
      </div>
      <ul className="flex list-none flex-col p-0" role="list">
        {charges.map((charge) => (
          <ChargeRow key={charge.id} charge={charge} currency={currency} />
        ))}
      </ul>
    </section>
  );
}

export function PaymentDetailSheet({
  payment,
  currency,
  onClose,
  onOpenCard,
}: PaymentDetailSheetProps): React.JSX.Element {
  const title = `Pago previsto de ${payment.card.bank}`;

  return (
    <Sheet open onClose={onClose} title={title}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 rounded-md bg-surface-inset p-4">
          <span className="text-aux text-muted">
            Vence el {formatDayAndMonth(utcDateToLocal(payment.due))}
          </span>
          <strong className="text-3xl font-extrabold tracking-tight tabular-nums text-ink">
            {formatCurrency(payment.totalCents, currency)}
          </strong>
        </div>

        <div className="rounded-md bg-surface-inset p-3">
          <KeyValue
            label="Fecha de corte"
            value={formatDayAndMonth(utcDateToLocal(payment.cut))}
          />
        </div>

        <h2 className="text-title font-bold leading-tight tracking-tight text-primary">
          Desglose del pago
        </h2>

        <PaymentGroup
          title="Compras a meses"
          charges={payment.installments}
          currency={currency}
        />
        <PaymentGroup
          title="Compras de un solo pago"
          charges={payment.purchases}
          currency={currency}
        />
        <PaymentGroup
          title="Pagos fijos previstos"
          charges={payment.fixed}
          currency={currency}
        />

        {payment.totalCents === 0 ? (
          <p className="py-6 text-center text-aux text-muted">
            Sin cargos previstos para este vencimiento.
          </p>
        ) : null}

        <button
          type="button"
          onClick={onOpenCard}
          className="mt-2 inline-flex min-h-11 items-center justify-center rounded-md border border-border-subtle bg-surface px-4 text-base font-semibold text-primary transition-colors duration-fast hover:bg-day"
        >
          Ver tarjeta
        </button>
      </div>
    </Sheet>
  );
}
