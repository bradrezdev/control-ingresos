import { CreditCard } from "lucide-react";
import { NavLink } from "react-router";
import { PaperCard, SectionHeading, ListRow, Amount, StatusPill } from "@/components/ui/design";
import { formatDayAndMonth, utcDateToLocal } from "@/lib/date/format";
import type { DashboardSummary } from "../types";

export interface CardPaymentsSectionProps {
  summary: DashboardSummary;
}

export function CardPaymentsSection({
  summary,
}: CardPaymentsSectionProps): React.JSX.Element {
  const { currency, cardPayments } = summary;
  const hasPayments = cardPayments.length > 0;

  return (
    <PaperCard className="p-5">
      <SectionHeading
        title="Pagos de tarjetas"
        action={
          <NavLink
            to="/cards"
            className="text-aux font-semibold text-primary min-h-11 inline-flex items-center"
          >
            Ver tarjetas
          </NavLink>
        }
      />

      {hasPayments ? (
        <ul className="mt-1">
          {cardPayments.map((row) => (
            <li key={row.cardId}>
              <ListRow
                title={row.bank}
                subtitle={
                  row.isOverdue
                    ? `Venció el ${formatDayAndMonth(utcDateToLocal(row.paymentDate))}`
                    : `Vence el ${formatDayAndMonth(utcDateToLocal(row.paymentDate))}`
                }
                leading={<CreditCard className="size-5" aria-hidden strokeWidth={2} />}
                trailing={
                  <span className="flex flex-col items-end gap-0.5">
                    <Amount cents={row.amountCents} currency={currency} className="text-body font-bold text-ink" />
                    <DueChip daysUntil={row.daysUntil} />
                  </span>
                }
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="py-10 text-center">
          <p className="text-aux text-muted">Sin pagos de tarjetas para este mes.</p>
          <NavLink
            to="/transactions"
            className="mt-3 inline-flex h-10 items-center justify-center rounded-pill bg-button px-4 text-sm font-semibold text-hero-text hover:bg-primary-hover"
          >
            Agregar movimiento
          </NavLink>
        </div>
      )}
    </PaperCard>
  );
}

function DueChip({ daysUntil }: { daysUntil: number }): React.JSX.Element {
  if (daysUntil < 0) {
    return <StatusPill tone="neutral">Pasado</StatusPill>;
  }
  if (daysUntil === 0) {
    return <StatusPill tone="warn">Hoy</StatusPill>;
  }
  if (daysUntil === 1) {
    return <StatusPill tone="warn">Mañana</StatusPill>;
  }
  const label = `En ${daysUntil} días`;
  return <StatusPill tone={daysUntil <= 5 ? "warn" : "neutral"}>{label}</StatusPill>;
}
