/**
 * MsiSummary — control-ingresos
 *
 * F6.4 — Dashboard widget that visualizes the active MSI debt grouped
 * by tenure (3/6/9/12/18/24 months). Uses Chart.js Bar.
 *
 * Each bar shows the totalDebt for that tenure. A small table below
 * the chart shows the per-tenure breakdown (count + debt).
 */
import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
import { Layers } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { useLiveTransactions } from "@/hooks/useLiveTransactions";
import { useLiveSettings } from "@/hooks/useLiveSettings";
import { summarizeMsiByTenure } from "@/engine/debt";
import { MSI_TERM } from "@/db/schemas/transaction";
import { formatCurrency } from "@/lib/money/format";
import { centsToDisplay } from "@/lib/money/format";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export function MsiSummary(): React.JSX.Element {
  const transactions = useLiveTransactions();
  const settings = useLiveSettings();
  const today = useMemo(() => new Date(), []);

  const summary = useMemo(
    () => (transactions ? summarizeMsiByTenure(transactions, today) : null),
    [transactions, today],
  );

  if (transactions === undefined || settings === undefined || summary === null) {
    return <WidgetSkeleton />;
  }

  const totalActive = MSI_TERM.reduce(
    (acc, t) => acc + summary[t].activeCount,
    0,
  );

  if (totalActive === 0) {
    return (
      <GlassCard className="p-6 h-full flex flex-col">
        <h2 className="text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
          Deuda a MSI activa
        </h2>
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<Layers className="size-5" aria-hidden />}
            title="No tenés compras a MSI activas"
            description="Cuando registres una compra a meses, aparecerá acá."
          />
        </div>
      </GlassCard>
    );
  }

  const currency = settings.currency;

  // Bar chart data — totalDebt per tenure.
  const data = {
    labels: MSI_TERM.map((t) => `${t}m`),
    datasets: [
      {
        label: "Deuda",
        data: MSI_TERM.map((t) => centsToDisplay(summary[t].totalDebt)),
        backgroundColor: [
          "rgba(16, 185, 129, 0.85)", // safe (3m)
          "rgba(132, 204, 22, 0.85)", // (6m)
          "rgba(245, 158, 11, 0.85)", // warning (9m)
          "rgba(249, 115, 22, 0.85)", // (12m)
          "rgba(239, 68, 68, 0.85)", // danger (18m)
          "rgba(220, 38, 38, 0.85)", // (24m)
        ],
        borderRadius: 8,
        borderSkipped: false,
        maxBarThickness: 56,
      },
    ],
  };

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const value = Number(ctx.parsed.y);
            return formatCurrency(Math.round(value * 100), currency);
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (val) => {
            const n = Number(val);
            if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
            return n.toString();
          },
          color: "oklch(0.45 0.005 240)",
          font: { size: 11 },
        },
        grid: {
          color: "oklch(0.92 0.005 240)",
        },
      },
      x: {
        ticks: {
          color: "oklch(0.45 0.005 240)",
          font: { size: 11 },
        },
        grid: { display: false },
      },
    },
  };

  return (
    <GlassCard className="p-6 h-full flex flex-col">
      <h2 className="text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
        Deuda a MSI activa
      </h2>

      <div
        className="mt-4 h-44"
        aria-label={`MSI activa en ${totalActive} ${totalActive === 1 ? "compra" : "compras"}`}
      >
        <Bar data={data} options={options} />
      </div>

      <table className="mt-4 w-full text-xs">
        <thead>
          <tr className="border-b border-[var(--color-border-subtle)]">
            <th className="text-left font-semibold text-[var(--color-text-muted)] py-1.5 uppercase tracking-wide">
              Plazo
            </th>
            <th className="text-right font-semibold text-[var(--color-text-muted)] py-1.5 uppercase tracking-wide">
              # Compras
            </th>
            <th className="text-right font-semibold text-[var(--color-text-muted)] py-1.5 uppercase tracking-wide">
              Deuda
            </th>
          </tr>
        </thead>
        <tbody>
          {MSI_TERM.map((t) => {
            const s = summary[t];
            if (s.activeCount === 0) return null;
            return (
              <tr
                key={t}
                className="border-b border-[var(--color-border-subtle)]/50 last:border-0"
              >
                <td className="py-1.5 text-[var(--color-text-body)]">
                  {t} meses
                </td>
                <td className="py-1.5 text-right tabular-nums text-[var(--color-text-body)]">
                  {s.activeCount}
                </td>
                <td className="py-1.5 text-right tabular-nums font-semibold text-[var(--color-text-body)]">
                  {formatCurrency(s.totalDebt, currency)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </GlassCard>
  );
}

function WidgetSkeleton(): React.JSX.Element {
  return (
    <GlassCard className="p-6 h-full">
      <Skeleton className="h-4 w-40" rounded="sm" />
      <Skeleton className="mt-4 h-44 w-full" rounded="md" />
      <div className="mt-3 space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-4 w-full" rounded="sm" />
        ))}
      </div>
    </GlassCard>
  );
}
