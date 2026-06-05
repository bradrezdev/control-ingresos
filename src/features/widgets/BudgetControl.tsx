/**
 * BudgetControl — control-ingresos
 *
 * F6.3 — Dashboard widget that shows the monthly spending progress
 * against the configured limit. Uses a Chart.js Doughnut.
 *
 * The color of the doughnut segment reflects the budget status:
 *   - safe    → success (emerald)
 *   - warning → warning (amber)
 *   - danger  → danger-neon (red with glow)
 *
 * When the user passes 80% a warning banner is shown above the chart.
 * The chart segment color transitions are handled by Chart.js's own
 * animation system (we set the color via the data prop, Chart.js
 * interpolates between updates).
 */
import { useMemo } from "react";
import { AlertTriangle, PiggyBank } from "lucide-react";
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
import { computeMonthlySpending, computeBudgetStatus } from "@/engine/budget";
import { formatCurrency } from "@/lib/money/format";
import { centsToDisplay } from "@/lib/money/format";
import { cn } from "@/lib/cn";

// Register Chart.js components once at module load. Tree-shaking safe.
ChartJS.register(ArcElement, Tooltip, Legend);

const STATUS_COLOR: Record<"safe" | "warning" | "danger", string> = {
  safe: "rgb(16, 185, 129)", // --color-success
  warning: "rgb(245, 158, 11)", // --color-warning
  danger: "rgb(239, 68, 68)", // --color-danger
};

export function BudgetControl(): React.JSX.Element {
  const transactions = useLiveTransactions();
  const settings = useLiveSettings();
  const today = useMemo(() => new Date(), []);

  if (transactions === undefined || settings === undefined) {
    return <WidgetSkeleton />;
  }

  const monthlyLimitCents = settings.monthlyLimit;
  const hasLimit = monthlyLimitCents > 0;

  if (!hasLimit) {
    return (
      <GlassCard className="p-6 h-full flex flex-col">
        <h2 className="text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
          Presupuesto del mes
        </h2>
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

  const { total } = computeMonthlySpending(transactions, today);
  const status = computeBudgetStatus(total, monthlyLimitCents);
  const pctSpent = Math.min(100, status.percent);
  const pctRemaining = 100 - pctSpent;
  const overBudget = total > monthlyLimitCents;
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
    <GlassCard className="p-6 h-full flex flex-col">
      <h2 className="text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
        Presupuesto del mes
      </h2>

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
              ? `Excediste tu presupuesto por ${formatCurrency(total - monthlyLimitCents, settings.currency)}.`
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
              {formatCurrency(total, settings.currency)}
            </strong>{" "}
            de{" "}
            <span className="text-[var(--color-text-muted)]">
              {formatCurrency(monthlyLimitCents, settings.currency)}
            </span>
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)] tabular-nums">
            Restante: {formatCurrency(Math.max(0, monthlyLimitCents - total), settings.currency)}
          </p>
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

// Re-export helper used by the engine.
export { centsToDisplay };
