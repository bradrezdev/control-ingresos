/**
 * BudgetCard — control-ingresos
 *
 * Combined dashboard widget showing:
 *   - Monthly spending progress against the configured limit (doughnut).
 *   - Per-card payment breakdown (which cards pay this month, when, how much).
 *
 * Replaces the previous trio of `PaymentCalendar` + `BudgetControl` +
 * `NextMonthBudgetControl` by parameterising the offset against `today`:
 *
 *   monthOffset === 0 → current month (default behaviour of the old BudgetControl)
 *   monthOffset === 1 → next month forecast (default of the old NextMonthBudgetControl,
 *                       plus the same per-card breakdown the current month has)
 *
 * Visual differences vs monthOffset:
 *   - title:  "Presupuesto del mes" vs "Presupuesto del siguiente mes"
 *   - chip:   none vs "Próximo" pill
 *   - border: none vs info-accent border
 *   - subtitle: none vs formatted month name (e.g. "agosto de 2026")
 *
 * IMPORTANT — addMonths disambiguation:
 *   This file uses `addMonths` from `@/lib/date/cycle` (the local utility
 *   that clamps to the last day of the target month and is TZ-safe).
 *   It does NOT use `date-fns/addMonths`, which has different behaviour at
 *   month boundaries (e.g. Jan 31 + 1 month => March 3, not Feb 28).
 */
import { useMemo } from "react";
import {
  AlertTriangle,
  CalendarClock,
  PiggyBank,
} from "lucide-react";
import { NavLink } from "react-router";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
import { GlassCard } from "@/components/ui/GlassCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Button } from "@/components/ui/Button";
import { useLiveCards } from "@/hooks/useLiveCards";
import { useLiveTransactions } from "@/hooks/useLiveTransactions";
import { useLiveSettings } from "@/hooks/useLiveSettings";
import { useLiveFixedPayments } from "@/hooks/useLiveFixedPayments";
import {
  computeMonthlySpending,
  computeBudgetStatus,
  computeFixedPaymentsForMonth,
  computePaymentForCurrentMonth,
} from "@/engine/budget";
import { computeCutCycle } from "@/engine/cycle";
import { addMonths } from "@/lib/date/cycle";
import {
  formatCurrency,
  centsToDisplay,
} from "@/lib/money/format";
import { formatDate, formatMonth, dateToMonthIso } from "@/lib/date/format";
import { cn } from "@/lib/cn";

// Register Chart.js components once at module load. Tree-shaking safe.
ChartJS.register(ArcElement, Tooltip, Legend);

interface BudgetCardProps {
  /**
   * 0 → current month.
   * 1 → next month (forecast).
   */
  monthOffset: 0 | 1;
}

interface PaymentRow {
  cardId: string;
  bank: string;
  paymentDate: Date;
  amount: number;
}

const STATUS_COLOR: Record<"safe" | "warning" | "danger", string> = {
  safe: "rgb(16, 185, 129)", // --color-success
  warning: "rgb(245, 158, 11)", // --color-warning
  danger: "rgb(239, 68, 68)", // --color-danger
};

export function BudgetCard({
  monthOffset,
}: BudgetCardProps): React.JSX.Element {
  const isNext = monthOffset === 1;

  // RULES OF HOOKS: every hook below is called unconditionally, in the same
  // order on every render. Do NOT add hooks after the early returns below.
  const transactions = useLiveTransactions();
  const settings = useLiveSettings();
  const cards = useLiveCards();
  const fixedPayments = useLiveFixedPayments();

  // `today` shifted +1 month for forecast via the local TZ-safe addMonths.
  const today = useMemo(
    () => (isNext ? addMonths(new Date(), 1) : new Date()),
    [isNext],
  );

  // Per-card payment rows for the active month. null while any input is
  // still resolving (loading guard uses this).
  const paymentRows = useMemo<PaymentRow[] | null>(() => {
    if (!cards || !transactions) return null;
    const rows: PaymentRow[] = [];
    for (const card of cards) {
      const amount = computePaymentForCurrentMonth(
        card.id,
        transactions,
        today,
      );
      if (amount <= 0) continue;
      const cycle = computeCutCycle(card, today);
      rows.push({
        cardId: card.id,
        bank: card.bank,
        paymentDate: cycle.paymentDate,
        amount,
      });
    }
    rows.sort((a, b) => a.paymentDate.getTime() - b.paymentDate.getTime());
    return rows;
  }, [cards, transactions, today]);

  // Loading guard.
  if (
    transactions === undefined ||
    settings === undefined ||
    cards === undefined ||
    fixedPayments === undefined ||
    paymentRows === null
  ) {
    return <WidgetSkeleton isNext={isNext} />;
  }

  const currency = settings.currency;
  const monthlyLimitCents = settings.monthlyLimit;
  const hasLimit = monthlyLimitCents > 0;

  // Budget figures.
  const { total: spendingTotal } = computeMonthlySpending(transactions, today);
  const fixedTotal = computeFixedPaymentsForMonth(fixedPayments ?? [], today);
  const combinedTotal = spendingTotal + fixedTotal;
  const status = computeBudgetStatus(combinedTotal, monthlyLimitCents);
  const pctSpent = Math.min(100, status.percent);
  const pctRemaining = 100 - pctSpent;
  const overBudget = combinedTotal > monthlyLimitCents;
  const showWarning = status.percent >= 80;

  const hasPayments = paymentRows.length > 0;

  // Footer total semantics:
  //   - hasLimit  → combined total (spending + fixed payments)
  //   - !hasLimit → sum of card payments (best signal we have without a limit)
  const footerTotalCents = hasLimit
    ? combinedTotal
    : paymentRows.reduce((acc, r) => acc + r.amount, 0);
  const showFooter = hasLimit || hasPayments;

  // Build doughnut dataset only when there's a limit.
  const chartData = hasLimit
    ? {
        labels: ["Gastado", "Restante"],
        datasets: [
          {
            data: [pctSpent, pctRemaining],
            backgroundColor: [
              STATUS_COLOR[status.status],
              "rgb(241, 245, 249)", // --color-surface-inset
            ],
            borderWidth: 0,
            hoverOffset: 4,
          },
        ],
      }
    : null;

  const chartOptions: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: "75%",
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.label}: ${ctx.parsed.toFixed(1)}%`,
        },
      },
    },
  };

  return (
    <GlassCard
      className={cn(
        "p-6 h-full flex flex-col",
        isNext && "border-[var(--color-info)]/40",
      )}
    >
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
          {isNext ? "Presupuesto del siguiente mes" : "Presupuesto del mes"}
        </h2>
        {isNext ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
              "bg-[var(--color-info)]/10 text-[var(--color-info)]",
              "text-[10px] font-semibold uppercase tracking-wider",
            )}
            aria-label="Pronóstico del mes entrante"
          >
            <CalendarClock className="size-3" aria-hidden />
            Próximo
          </span>
        ) : null}
      </header>
      {isNext ? (
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          {formatMonth(dateToMonthIso(today), "long")}
        </p>
      ) : null}

      {/* Budget section — only meaningful with a configured limit. */}
      {hasLimit ? (
        <>
          {showWarning ? (
            <div
              role="alert"
              className={cn(
                "mt-3 flex items-start gap-2 p-3 rounded-[var(--radius-md)] border",
                status.status === "danger"
                  ? "bg-[var(--color-danger)]/10 border-[var(--color-danger)]/30"
                  : "bg-[var(--color-warning)]/10 border-[var(--color-warning)]/30",
              )}
            >
              <AlertTriangle
                className={cn(
                  "size-4 shrink-0 mt-0.5",
                  status.status === "danger"
                    ? "text-[var(--color-danger)]"
                    : "text-[var(--color-warning)]",
                )}
                aria-hidden
              />
              <p className="text-xs text-[var(--color-text-body)]">
                {overBudget
                  ? `Excediste tu presupuesto por ${formatCurrency(combinedTotal - monthlyLimitCents, currency)}.`
                  : `Estás cerca de tu límite. Usaste el ${status.percent.toFixed(0)}% del presupuesto.`}
              </p>
            </div>
          ) : null}

          <div className="mt-4 flex flex-col items-center justify-center">
            <div
              className="relative w-32 h-32"
              aria-label={`${status.percent.toFixed(0)} por ciento del presupuesto usado`}
            >
              {chartData ? (
                <Doughnut data={chartData} options={chartOptions} />
              ) : null}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span
                  className={cn(
                    "text-2xl font-semibold tabular-nums",
                    status.status === "safe" &&
                      "text-[var(--color-text-body)]",
                    status.status === "warning" &&
                      "text-[var(--color-warning)]",
                    status.status === "danger" &&
                      "text-[var(--color-danger-neon)]",
                  )}
                >
                  {status.percent.toFixed(0)}%
                </span>
                <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                  usado
                </span>
              </div>
            </div>

            <div className="mt-3 text-center">
              <p className="text-sm text-[var(--color-text-body)]">
                <strong className="font-semibold">
                  {formatCurrency(combinedTotal, currency)}
                </strong>{" "}
                de{" "}
                <span className="text-[var(--color-text-muted)]">
                  {formatCurrency(monthlyLimitCents, currency)}
                </span>
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)] tabular-nums">
                Restante:{" "}
                {formatCurrency(
                  Math.max(0, monthlyLimitCents - combinedTotal),
                  currency,
                )}
              </p>
              {fixedTotal > 0 ? (
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Incluye {formatCurrency(fixedTotal, currency)} en pagos fijos
                </p>
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      {/* Divider only when both sections render. */}
      {hasLimit && hasPayments ? (
        <hr className="my-4 border-[var(--color-border-subtle)]" />
      ) : null}

      {/* Per-card payment section. */}
      {hasPayments ? (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Pagos por tarjeta
          </h3>
          <ul className="mt-3 space-y-2">
            {paymentRows.map((row) => (
              <li
                key={row.cardId}
                className="flex items-center justify-between gap-3 border-b border-[var(--color-border-subtle)]/50 pb-2 last:border-0 last:pb-0"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-[var(--color-text-body)] truncate">
                    {row.bank}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                    {formatDate(row.paymentDate)}
                  </span>
                </div>
                <span className="text-sm font-semibold tabular-nums text-[var(--color-text-body)] shrink-0">
                  {formatCurrency(row.amount, currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Empty state when neither limit nor payments exist. */}
      {!hasLimit && !hasPayments ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<PiggyBank className="size-5" aria-hidden />}
            title="Sin límite configurado"
            description="Configurá un límite mensual para visualizar tu progreso."
            action={
              <NavLink to="/settings">
                <Button variant="primary" size="sm">
                  Ir a Ajustes
                </Button>
              </NavLink>
            }
          />
        </div>
      ) : null}

      {/* Footer total. */}
      {showFooter ? (
        <div className="mt-auto pt-4 border-t border-[var(--color-border-subtle)] flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-[var(--color-text-muted)] font-semibold">
            Total
          </span>
          <span className="text-2xl font-semibold tabular-nums text-[var(--color-text-primary)]">
            {formatCurrency(footerTotalCents, currency)}
          </span>
        </div>
      ) : null}
    </GlassCard>
  );
}

function WidgetSkeleton({
  isNext,
}: {
  isNext: boolean;
}): React.JSX.Element {
  return (
    <GlassCard
      className={cn(
        "p-6 h-full flex flex-col",
        isNext && "border-[var(--color-info)]/40",
      )}
    >
      <Skeleton className="h-4 w-40" rounded="sm" />
      <div className="mt-4 flex justify-center">
        <Skeleton className="size-32 rounded-full" />
      </div>
      <Skeleton className="mt-3 h-4 w-32 mx-auto" rounded="sm" />
    </GlassCard>
  );
}

// Re-export helper used elsewhere via this module.
export { centsToDisplay };