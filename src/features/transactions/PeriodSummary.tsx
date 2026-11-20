import { Amount } from "@/components/ui/design/Amount";
import { cn } from "@/lib/cn";
import type { QuickFilter } from "./types";

export interface PeriodSummaryProps {
  stats: {
    spent: number;
    received: number;
    msiCount: number;
  };
  currency: string;
  active?: QuickFilter | null;
  onSelect: (filter: QuickFilter) => void;
}

const TILES: Array<{
  key: QuickFilter;
  label: string;
  foot: string;
  value: (stats: PeriodSummaryProps["stats"], currency: string) => React.ReactNode;
}> = [
  {
    key: "expense",
    label: "Gastado",
    foot: "gastos",
    value: (stats, currency) => (
      <Amount cents={stats.spent} currency={currency} sign="negative" />
    ),
  },
  {
    key: "income",
    label: "Recibido",
    foot: "ingresos",
    value: (stats, currency) => (
      <Amount cents={stats.received} currency={currency} sign="positive" prefix="+" />
    ),
  },
  {
    key: "expense_msi",
    label: "A meses",
    foot: "MSI",
    value: (stats) => `${stats.msiCount} ${stats.msiCount === 1 ? "compra" : "compras"}`,
  },
];

/**
 * Period summary row: three tappable tiles (Gastado / Recibido / A meses).
 *
 * Each tile applies its quick filter (S7). The active tile is distinguished
 * by color AND text, never by color alone (S19).
 */
export function PeriodSummary({
  stats,
  currency,
  active,
  onSelect,
}: PeriodSummaryProps): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-2.5" aria-label="Resumen del periodo">
      {TILES.map((tile) => {
        const selected = active === tile.key;
        return (
          <button
            key={tile.key}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(tile.key)}
            className={cn(
              "flex-1 min-w-[104px] flex flex-col gap-0.5 items-start p-3 rounded-md",
              "transition-colors duration-fast ease-out-soft",
              "focus-visible:outline-offset-2",
              selected
                ? "bg-selected ring-2 ring-primary"
                : "bg-surface hover:bg-day",
            )}
          >
            <span className="text-aux text-muted">{tile.label}</span>
            <span className="text-title font-bold text-primary whitespace-nowrap tabular-nums">
              {tile.value(stats, currency)}
            </span>
            <span className="text-[11px] font-semibold text-muted">
              {selected ? `Mostrando ${tile.foot}` : tile.foot}
            </span>
          </button>
        );
      })}
    </div>
  );
}
