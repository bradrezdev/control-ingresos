/**
 * CardDetail — control-ingresos (redesign-ui-2026, T5)
 *
 * Bottom-sheet content for a single card. Credit cards show the current
 * statement cycle (cut date + payment due date), the cycle movements,
 * the active MSI plans with their remaining debt (engine schedule via
 * `listMsiForCard`), and next month's estimated payment. Debit cards
 * show only what applies: their month's movements.
 */
import { useMemo } from "react";
import { format, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { parseISO } from "date-fns";
import { Amount, ListRow, SectionHeading, StatusPill } from "@/components/ui/design";
import { formatDate, formatShortDay } from "@/lib/date/format";
import { computeMsiPlans, toLocalDay } from "./computeCardAccount";
import { useLiveMsiForCard } from "./useLiveMsiForCard";
import type { CardAccount } from "./types";

export interface CardDetailProps {
  account: CardAccount;
  currency: string;
  /** Pinned by the page so the sheet is deterministic while open. */
  today: Date;
}

export function CardDetail({
  account,
  currency,
  today,
}: CardDetailProps): React.JSX.Element {
  const msiTransactions = useLiveMsiForCard(account.card.id);
  const plans = useMemo(
    () => computeMsiPlans(msiTransactions ?? [], today),
    [msiTransactions, today],
  );

  const { isCredit, cycle, cycleTransactions, paymentChip, paymentDate } =
    account;
  const nextMonthLabel = format(addMonths(today, 1), "MMMM", { locale: es });
  const msiRemainingTotal = plans.reduce(
    (sum, plan) => sum + plan.remainingCents,
    0,
  );

  return (
    <div className="flex flex-col gap-5">
      {isCredit && cycle && paymentDate !== null ? (
        <>
          <SectionHeading level={3} title="Ciclo actual" />
          <dl className="grid grid-cols-[1fr_auto] items-center gap-y-3 text-body">
            <dt className="text-muted">Corte</dt>
            <dd className="text-right font-semibold text-ink">
              {formatDate(toLocalDay(cycle.cutDate))}
            </dd>
            <dt className="text-muted">Fecha límite de pago</dt>
            <dd className="flex items-center justify-end gap-2 text-right font-semibold text-ink">
              {formatDate(toLocalDay(paymentDate))}
              {paymentChip ? (
                <StatusPill tone={paymentChip.tone}>{paymentChip.label}</StatusPill>
              ) : null}
            </dd>
          </dl>
        </>
      ) : (
        <p className="text-body text-muted">
          Tarjeta de débito · sin ciclo de corte ni límite.
        </p>
      )}

      <SectionHeading
        level={3}
        title={isCredit ? "Movimientos del ciclo" : "Movimientos del mes"}
      />
      {cycleTransactions.length > 0 ? (
        <ul className="list-none p-0">
          {cycleTransactions.map((tx) => (
            <li key={tx.id}>
              <ListRow
                title={tx.description}
                subtitle={`${formatShortDay(parseISO(tx.date))} · ${tx.category ?? "Sin categoría"}`}
                trailing={
                  <Amount
                    cents={-tx.amount}
                    currency={currency}
                    sign="negative"
                    className="text-body font-bold text-ink"
                  />
                }
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-aux text-muted">
          {isCredit ? "Sin movimientos en este ciclo." : "Sin movimientos este mes."}
        </p>
      )}

      {isCredit ? (
        <>
          <SectionHeading level={3} title="Compras a meses" />
          {plans.length > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-0.5 rounded-md bg-surface-inset p-4">
                <span className="text-aux text-muted">
                  Saldo restante en compras a meses
                </span>
                <Amount
                  cents={msiRemainingTotal}
                  currency={currency}
                  className="text-title font-bold text-ink"
                />
              </div>
              <ul className="list-none p-0">
                {plans.map((plan) => (
                  <li key={plan.id}>
                    <ListRow
                      title={plan.description}
                      subtitle={`Cuota ${plan.currentInstallment} de ${plan.monthsTotal} · ${plan.installmentsLeft} ${plan.installmentsLeft === 1 ? "cuota restante" : "cuotas restantes"}`}
                      trailing={
                        <span className="flex flex-col items-end">
                          <Amount
                            cents={plan.remainingCents}
                            currency={currency}
                            className="text-body font-bold text-ink"
                          />
                          <span className="text-chip text-muted tabular-nums">
                            <Amount
                              cents={plan.monthlyCents}
                              currency={currency}
                            />{" "}
                            al mes
                          </span>
                        </span>
                      }
                    />
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-aux text-muted">Sin compras a meses activas.</p>
          )}

          <div className="flex flex-col gap-0.5 rounded-md bg-surface-inset p-4">
            <span className="text-aux text-muted">
              Pago estimado de {nextMonthLabel}
            </span>
            <Amount
              cents={account.nextMonthPaymentCents ?? 0}
              currency={currency}
              className="text-title font-bold text-ink"
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
