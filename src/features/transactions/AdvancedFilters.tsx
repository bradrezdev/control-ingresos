import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CardSelect } from "@/components/form/CardSelect";
import type { AdvancedFilters as Filters } from "./types";

export interface AdvancedFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  onApply: () => void;
  onClear: () => void;
}

export function AdvancedFilters({ filters, onChange, onApply, onClear }: AdvancedFiltersProps): React.JSX.Element {
  const hasActive = filters.cardId !== "" || filters.category !== "" || filters.fromDate !== "" || filters.toDate !== "";

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onApply();
      }}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="filter-card" className="text-aux font-medium text-muted">
          Tarjeta o cuenta
        </label>
        <CardSelect
          id="filter-card"
          value={filters.cardId}
          onChange={(cardId) => onChange({ ...filters, cardId })}
          placeholder="Todas las cuentas"
          aria-label="Tarjeta o cuenta"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="filter-category" className="text-aux font-medium text-muted">
          Categoría
        </label>
        <Input
          id="filter-category"
          value={filters.category}
          onChange={(e) => onChange({ ...filters, category: e.target.value })}
          placeholder="Todas las categorías"
          autoComplete="off"
        />
      </div>

      <fieldset className="border-0 p-0 m-0">
        <legend className="text-aux font-medium text-muted mb-2">Rango personalizado</legend>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="filter-from" className="text-[11px] font-medium text-muted">
              Desde
            </label>
            <input
              id="filter-from"
              type="date"
              value={filters.fromDate}
              onChange={(e) => onChange({ ...filters, fromDate: e.target.value })}
              className="w-full h-11 px-3 text-base rounded-md bg-surface-inset border border-border-subtle text-body focus:outline-none focus:border-border-focus focus:bg-surface"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="filter-to" className="text-[11px] font-medium text-muted">
              Hasta
            </label>
            <input
              id="filter-to"
              type="date"
              value={filters.toDate}
              onChange={(e) => onChange({ ...filters, toDate: e.target.value })}
              className="w-full h-11 px-3 text-base rounded-md bg-surface-inset border border-border-subtle text-body focus:outline-none focus:border-border-focus focus:bg-surface"
            />
          </div>
        </div>
      </fieldset>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onClear} disabled={!hasActive} className="flex-1">
          Limpiar filtros
        </Button>
        <Button type="submit" variant="primary" className="flex-1">
          Aplicar
        </Button>
      </div>
    </form>
  );
}
