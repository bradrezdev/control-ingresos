/**
 * CardDetailSheet — control-ingresos (Tarjetas · Mis finanzas)
 *
 * Ficha de la tarjeta con tres pestañas: Resumen, Movimientos y MSI.
 * Es presentacional: recibe los datos ya calculados y delega las
 * acciones al padre.
 */
import type { ReactNode } from "react";
import { CalendarDays, CreditCard, Receipt } from "lucide-react";
import { Sheet } from "@/components/ui/design";
import { formatCurrency } from "@/lib/money/format";
import {
  formatDayAndMonth,
  formatShortDate,
  utcDateToLocal,
} from "@/lib/date/format";
import {
  computeCardUsage,
  computeWalletCycle,
  referenceDate,
  type WalletMsiPlan,
  type WalletPayment,
} from "@/engine/wallet";
import type { Card, Transaction } from "@/db/schemas";
import { cn } from "@/lib/cn";
import { CardPlastic } from "../CardPlastic";

export interface CardDetailSheetProps {
  card: Card;
  /** Pestaña activa. */
  tab: "resumen" | "actividad" | "msi";
  onTabChange: (tab: "resumen" | "actividad" | "msi") => void;
  /** Movimientos de la tarjeta (ya cargados). */
  transactions: Transaction[];
  /** Planes MSI activos de la tarjeta. */
  plans: WalletMsiPlan[];
  /** Pago previsto del ciclo en curso (puede ser null si no aplica). */
  payment: WalletPayment | null;
  currency: string;
  onClose: () => void;
  onEdit: () => void;
  /** "Ver historial completo (N)" */
  onViewHistory: () => void;
}

const TABS: { value: CardDetailSheetProps["tab"]; label: string }[] = [
  { value: "resumen", label: "Resumen" },
  { value: "actividad", label: "Movimientos" },
  { value: "msi", label: "MSI" },
];

function TabBar({
  active,
  onChange,
}: {
  active: CardDetailSheetProps["tab"];
  onChange: (tab: CardDetailSheetProps["tab"]) => void;
}): React.JSX.Element {
  return (
    <div
      role="tablist"
      className="flex gap-0.5 rounded-[14px] bg-segment p-[3px]"
    >
      {TABS.map((tab) => {
        const isActive = tab.value === active;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-pressed={isActive}
            onClick={() => onChange(tab.value)}
            className={cn(
              "flex-1 min-h-11 rounded-[11px] px-3 text-sm font-semibold transition-colors duration-fast ease-out-soft",
              isActive
                ? "bg-surface text-primary border border-border-subtle shadow-sm"
                : "bg-transparent text-text-secondary hover:text-primary",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
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

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mt-5 text-title font-bold leading-tight tracking-tight text-primary">
      {children}
    </h3>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <Receipt className="size-8 text-muted" strokeWidth={1.5} />
      <p className="text-aux text-muted">{children}</p>
    </div>
  );
}

function ResumenTab({
  card,
  transactions,
  payment,
  currency,
  onViewHistory,
}: Pick<
  CardDetailSheetProps,
  | "card"
  | "transactions"
  | "payment"
  | "currency"
  | "onViewHistory"
>): React.JSX.Element {
  const ref = referenceDate();
  const cycle = computeWalletCycle(card, ref);
  const usage = computeCardUsage(card, transactions, ref);

  return (
    <div className="flex flex-col gap-1">
      <div className="mt-2">
        <CardPlastic card={card} />
      </div>

      <SectionTitle>Ciclo en curso</SectionTitle>
      <div className="rounded-md bg-surface-inset p-3">
        <KeyValue
          label="Periodo"
          value={`${formatShortDate(
            utcDateToLocal(cycle.start),
          )} – ${formatShortDate(utcDateToLocal(cycle.cut))}`}
        />
        <KeyValue label="Corte" value={formatDayAndMonth(utcDateToLocal(cycle.cut))} />
        <KeyValue
          label="Vence este ciclo"
          value={formatDayAndMonth(utcDateToLocal(cycle.due))}
        />
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-3">
        <span className="text-aux text-muted">Disponible estimado</span>
        <b className="text-lg font-bold tabular-nums text-ink">
          {formatCurrency(usage.availableCents, currency)}
        </b>
      </div>

      {payment ? (
        <div className="mt-2 flex items-baseline justify-between gap-3">
          <span className="text-aux text-muted">Pago previsto</span>
          <span className="flex shrink-0 flex-col items-end">
            <b className="text-lg font-bold tabular-nums text-ink">
              {formatCurrency(payment.totalCents, currency)}
            </b>
            <span className="text-aux text-muted">
              Vence el {formatDayAndMonth(utcDateToLocal(payment.due))}
            </span>
          </span>
        </div>
      ) : null}

      {transactions.length > 0 ? (
        <button
          type="button"
          onClick={onViewHistory}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md bg-surface-inset px-4 text-aux font-semibold text-primary transition-colors duration-fast hover:bg-selected"
        >
          Ver historial completo ({transactions.length})
        </button>
      ) : null}
    </div>
  );
}

function MovimientosTab({
  transactions,
  currency,
}: {
  transactions: Transaction[];
  currency: string;
}): React.JSX.Element {
  if (transactions.length === 0) {
    return <EmptyState>Sin movimientos.</EmptyState>;
  }

  return (
    <ul className="flex list-none flex-col p-0" role="list">
      {transactions.map((tx) => (
        <li
          key={tx.id}
          className="flex min-h-16 items-center gap-3 border-t border-border-subtle py-2"
        >
          <span
            className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-inset text-primary"
            aria-hidden
          >
            <CalendarDays className="size-5" strokeWidth={2} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <b className="text-base font-semibold text-ink">{tx.description}</b>
            <span className="text-aux text-muted">{formatShortDate(tx.date)}</span>
          </span>
          <span
            className={cn(
              "shrink-0 text-base font-bold tabular-nums",
              tx.type === "income" ? "text-positive" : "text-ink",
            )}
          >
            {tx.type === "income"
              ? formatCurrency(tx.amount, currency)
              : `−${formatCurrency(tx.amount, currency)}`}
          </span>
        </li>
      ))}
    </ul>
  );
}

function MsiTab({
  plans,
  currency,
}: {
  plans: WalletMsiPlan[];
  currency: string;
}): React.JSX.Element {
  if (plans.length === 0) {
    return <EmptyState>Sin compras a meses activas.</EmptyState>;
  }

  return (
    <ul className="flex list-none flex-col p-0" role="list">
      {plans.map((plan) => (
        <li
          key={plan.id}
          className="flex min-h-16 items-center gap-3 border-t border-border-subtle py-2"
        >
          <span
            className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-inset text-primary"
            aria-hidden
          >
            <CreditCard className="size-5" strokeWidth={2} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <b className="text-base font-semibold text-ink">
              {plan.description}
            </b>
            <span className="text-aux text-muted">
              Cuota {plan.currentInstallment} de {plan.monthsTotal} ·{" "}
              {plan.installmentsLeft} cuotas por cubrir
            </span>
          </span>
          <span className="flex shrink-0 flex-col items-end">
            <b className="text-base font-bold tabular-nums text-ink">
              {formatCurrency(plan.remainingCents, currency)}
            </b>
            <span className="text-aux text-muted">
              {formatCurrency(plan.monthlyCents, currency)}/mes
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function CardDetailSheet({
  card,
  tab,
  onTabChange,
  transactions,
  plans,
  payment,
  currency,
  onClose,
  onEdit,
  onViewHistory,
}: CardDetailSheetProps): React.JSX.Element {
  return (
    <Sheet open onClose={onClose} title={card.bank}>
      <div className="flex flex-col gap-4">
        <TabBar active={tab} onChange={onTabChange} />

        {tab === "resumen" ? (
          <ResumenTab
            card={card}
            transactions={transactions}
            payment={payment}
            currency={currency}
            onViewHistory={onViewHistory}
          />
        ) : null}

        {tab === "actividad" ? (
          <MovimientosTab transactions={transactions} currency={currency} />
        ) : null}

        {tab === "msi" ? <MsiTab plans={plans} currency={currency} /> : null}

        <button
          type="button"
          onClick={onEdit}
          className="mt-2 inline-flex min-h-11 items-center justify-center rounded-md border border-border-subtle bg-surface px-4 text-base font-semibold text-primary transition-colors duration-fast hover:bg-day"
        >
          Editar tarjeta
        </button>
      </div>
    </Sheet>
  );
}
