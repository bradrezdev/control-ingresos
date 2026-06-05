/**
 * TransactionFilters — control-ingresos
 *
 * Filter bar for the Transactions page. Tabs (by type), date range,
 * and card selector. The page owns the filter state — this component
 * is purely presentational + emits changes.
 *
 * - Type filter: pill buttons (Ingresos / Gastos / MSI / Todas)
 * - Date range: two native date inputs
 * - Card: uses CardSelect from the design system
 */
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CardSelect } from "@/components/form/CardSelect";
import { cn } from "@/lib/cn";
import type { TransactionType } from "@/db/schemas/transaction";

export type TypeFilter = "all" | TransactionType;

export interface TransactionFilters {
  type: TypeFilter;
  fromDate: string; // YYYY-MM-DD or ""
  toDate: string; // YYYY-MM-DD or ""
  cardId: string; // "" = all
}

export const EMPTY_FILTERS: TransactionFilters = {
  type: "all",
  fromDate: "",
  toDate: "",
  cardId: "",
};

export interface TransactionFiltersProps {
  value: TransactionFilters;
  onChange: (next: TransactionFilters) => void;
}

const TYPE_OPTIONS: Array<{ value: TypeFilter; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "income", label: "Ingresos" },
  { value: "expense", label: "Gastos" },
  { value: "expense_msi", label: "MSI" },
];

export function TransactionFilters({
  value,
  onChange,
}: TransactionFiltersProps): React.JSX.Element {
  function setType(type: TypeFilter): void {
    onChange({ ...value, type });
  }
  function clear(): void {
    onChange(EMPTY_FILTERS);
  }
  const hasActive =
    value.type !== "all" ||
    value.fromDate !== "" ||
    value.toDate !== "" ||
    value.cardId !== "";

  return (
    <div className="flex flex-col gap-3 mb-4">
      <div
        role="tablist"
        aria-label="Filtrar por tipo"
        className="flex flex-wrap gap-1.5"
      >
        {TYPE_OPTIONS.map((opt) => {
          const selected = value.type === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setType(opt.value)}
              className={cn(
                "h-9 px-4 text-sm font-medium rounded-full",
                "transition-colors duration-[var(--duration-fast)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]",
                selected
                  ? "bg-[var(--color-primary)] text-[var(--color-text-inverse)]"
                  : "bg-[var(--color-surface-inset)] text-[var(--color-text-body)] hover:bg-[var(--color-border-subtle)]",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="filter-from"
            className="text-xs font-medium text-[var(--color-text-muted)]"
          >
            Desde
          </label>
          <input
            id="filter-from"
            type="date"
            value={value.fromDate}
            onChange={(e) => onChange({ ...value, fromDate: e.target.value })}
            className="h-9 px-3 text-sm rounded-[var(--radius-sm)] bg-[var(--color-surface-inset)] border border-[var(--color-border-subtle)] focus:outline-none focus:border-[var(--color-border-focus)] focus:bg-[var(--color-surface)]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="filter-to"
            className="text-xs font-medium text-[var(--color-text-muted)]"
          >
            Hasta
          </label>
          <input
            id="filter-to"
            type="date"
            value={value.toDate}
            onChange={(e) => onChange({ ...value, toDate: e.target.value })}
            className="h-9 px-3 text-sm rounded-[var(--radius-sm)] bg-[var(--color-surface-inset)] border border-[var(--color-border-subtle)] focus:outline-none focus:border-[var(--color-border-focus)] focus:bg-[var(--color-surface)]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="filter-card"
            className="text-xs font-medium text-[var(--color-text-muted)]"
          >
            Tarjeta
          </label>
          <CardSelect
            id="filter-card"
            value={value.cardId}
            onChange={(cardId) => onChange({ ...value, cardId })}
            placeholder="Todas las tarjetas"
          />
        </div>
      </div>

      {hasActive ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clear}
            leftIcon={<X className="size-3.5" aria-hidden />}
          >
            Limpiar filtros
          </Button>
        </div>
      ) : null}
    </div>
  );
}
