import { NavLink } from "react-router";
import { PaperCard, SectionHeading, Amount } from "@/components/ui/design";
import { cn } from "@/lib/cn";
import { formatShortDay } from "@/lib/date/format";
import type { DashboardSummary, RecentTransactionRow } from "../types";
import { CategoryAvatar } from "./CategoryAvatar";

export interface RecentTransactionsSectionProps {
  summary: DashboardSummary;
}

export function RecentTransactionsSection({
  summary,
}: RecentTransactionsSectionProps): React.JSX.Element {
  const { currency, recentTransactions } = summary;
  const hasTransactions = recentTransactions.length > 0;

  return (
    <PaperCard className="p-5">
      <SectionHeading
        title="Últimos movimientos"
        action={
          <NavLink
            to="/transactions"
            className="text-aux font-semibold text-primary min-h-11 inline-flex items-center"
          >
            Ver todos
          </NavLink>
        }
      />

      {hasTransactions ? (
        <ul className="mt-1">
          {recentTransactions.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} currency={currency} />
          ))}
        </ul>
      ) : (
        <div className="py-10 text-center">
          <p className="text-aux text-muted">Aún no hay movimientos registrados.</p>
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

function TransactionRow({
  tx,
  currency,
}: {
  tx: RecentTransactionRow;
  currency: string;
}): React.JSX.Element {
  const isIncome = tx.sign === "positive";
  return (
    <li className="flex min-h-16 items-center gap-3 border-t border-border-subtle py-3">
      <CategoryAvatar
        initial={tx.categoryInitial}
        bgClass={tx.categoryColor}
        textClass={tx.categoryTextColor}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-body font-semibold text-ink">{tx.description}</span>
        <span className="truncate text-aux text-muted">
          {tx.accountName} · {tx.category ?? "Sin categoría"}
        </span>
      </div>
      <div className="flex flex-col items-end gap-0.5 text-right">
        <Amount
          cents={tx.amountCents}
          currency={currency}
          {...(isIncome ? { prefix: "+" as const } : {})}
          className={cn("text-body font-bold", isIncome ? "text-positive" : "text-ink")}
        />
        <span className="text-chip text-muted">{formatShortDay(tx.date)}</span>
      </div>
    </li>
  );
}
