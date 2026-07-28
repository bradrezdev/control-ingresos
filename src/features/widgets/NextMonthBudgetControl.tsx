/**
 * NextMonthBudgetControl — control-ingresos
 *
 * Forecast widget that mirrors BudgetControl but with `today` shifted one
 * month ahead. Shows the user the committed spend for the next month so they
 * can prepare.
 *
 * IMPORTANT — addMonths disambiguation:
 *   This file uses `addMonths` from `@/lib/date/cycle` (the local utility
 *   that clamps to the last day of the target month and is TZ-safe).
 *   It does NOT use `date-fns/addMonths`, which has different behaviour at
 *   month boundaries (e.g. Jan 31 + 1 month => March 3, not Feb 28).
 *
 *   The engine functions accept a `today` parameter, so the engine is
 *   unaffected — we only shift the parameter we pass in.
 */
import { useMemo } from "react";
import { AlertTriangle, PiggyBank, CalendarClock } from "lucide-react";
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
import { NavLink } from "react-router";
import { Button } from "@/components/ui/Button";
import { useLiveTransactions } from "@/hooks/useLiveTransactions";
import { useLiveSettings } from "@/hooks/useLiveSettings";
import { useLiveFixedPayments } from "@/hooks/useLiveFixedPayments";
import {
  computeMonthlySpending,
  computeBudgetStatus,
  computeFixedPaymentsForMonth,
} from "@/engine/budget";
import { formatMonth, dateToMonthIso } from "@/lib/date/format";
// LOCAL addMonths — NOT date-fns/addMonths. See header comment above.
import { addMonths } from "@/lib/date/cycle";
import { formatCurrency } from "@/lib/money/format";
import { cn } from "@/lib/cn";

// Register Chart.js components once at module load. Tree-shaking safe.
ChartJS.register(ArcElement, Tooltip, Legend);

const STATUS_COLOR: Record<"safe" | "warning" | "danger", string> = {
  safe: "rgb(16, 185, 129)", // --color-success
  warning: "rgb(245, 158, 11)", // --color-warning
  danger: "rgb(239, 68, 68)", // --color-danger
};

export function NextMonthBudgetControl(): React.JSX.Element {
  const transactions = useLiveTransactions();
  const settings = useLiveSettings();
  const fixedPayments = useLiveFixedPayments();
  // `today` is shifted +1 month via the local TZ-safe addMonths helper.
  const today = useMemo(() => addMonths(new Date(), 1), []);

  if (
    transactions === undefined ||
    settings === undefined ||
    fixedPayments === undefined
  ) {
    return <WidgetSkeleton />;
  }

  const monthlyLimitCents = settings.monthlyLimit;
  const hasLimit = monthlyLimitCents > 0;

  if (!hasLimit) {
    return (
      <GlassCard className="p-6 h-full flex flex-col border-[var(--color-info)]/40">
        <header className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
            Presupuesto del siguiente mes
          </h2>
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
        </header>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          {formatMonth(dateToMonthIso(today), "long")}
        </p>
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
      </GlassCard>
    );
  }

  const { total: spendingTotal } = computeMonthlySpending(transactions, today);
  const fixedTotal = computeFixedPaymentsForMonth(fixedPayments ?? [], today);
  const combinedTotal = spendingTotal + fixedTotal;
  const status = computeBudgetStatus(combinedTotal, monthlyLimitCents);
  const pctSpent = Math.min(100, status.percent);
  const pctRemaining = 100 - pctSpent;
  const overBudget = combinedTotal > monthlyLimitCents;
  const showWarning = status.percent >= 80;

  const data = {
    labels: ["Gastado", "Restante"],
    datasets: [
      {
        data: [pctSpent, pctRemaining],
        backgroundColor: [
          STATUS_COLOR[status.status],
          "rgb(241, 245, 249)", // --color-surface-inset equivalent
        ],
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  };

  const options: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: "75%",
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const value = ctx.parsed;
            return `${ctx.label}: ${value.toFixed(1)}%`;
          },
        },
      },
    },
  };

  return (
    <GlassCard className="p-6 h-full flex flex-col border-[var(--color-info)]/40">
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
          Presupuesto del siguiente mes
        </h2>
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
      </header>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
        {formatMonth(dateToMonthIso(today), "long")}
      </p>

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
              ? `Excedés tu presupuesto por ${formatCurrency(combinedTotal - monthlyLimitCents, settings.currency)}.`
              : `Estás cerca de tu límite. Usaste el ${status.percent.toFixed(0)}% del presupuesto.`}
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex-1 flex flex-col items-center justify-center">
        <div
          className="relative w-44 h-44"
          aria-label={`${status.percent.toFixed(0)} por ciento del presupuesto usado`}
        >
          <Doughnut data={data} options={options} />
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span
              className={cn(
                "text-3xl font-semibold tabular-nums",
                status.status === "safe" && "text-[var(--color-text-body)]",
                status.status === "warning" && "text-[var(--color-warning)]",
                status.status === "danger" && "text-[var(--color-danger-neon)]",
              )}
            >
              {status.percent.toFixed(0)}%
            </span>
            <span className="text-xs text-[var(--color-text-muted)] mt-0.5">
              usado
            </span>
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-[var(--color-text-body)]">
            <strong className="font-semibold">
              {formatCurrency(combinedTotal, settings.currency)}
            </strong>{" "}
            de{" "}
            <span className="text-[var(--color-text-muted)]">
              {formatCurrency(monthlyLimitCents, settings.currency)}
            </span>
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)] tabular-nums">
            Restante: {formatCurrency(Math.max(0, monthlyLimitCents - combinedTotal), settings.currency)}
          </p>
          {fixedTotal > 0 ? (
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Incluye {formatCurrency(fixedTotal, settings.currency)} en pagos fijos
            </p>
          ) : null}
        </div>
      </div>
    </GlassCard>
  );
}

function WidgetSkeleton(): React.JSX.Element {
  return (
    <GlassCard className="p-6 h-full">
      <Skeleton className="h-4 w-40" rounded="sm" />
      <div className="mt-4 flex justify-center">
        <Skeleton className="size-44 rounded-full" />
      </div>
      <Skeleton className="mt-3 h-4 w-32 mx-auto" rounded="sm" />
    </GlassCard>
  );
}
