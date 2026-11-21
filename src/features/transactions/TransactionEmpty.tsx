import { Receipt, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/feedback/EmptyState";

export interface TransactionEmptyProps {
  monthLabel: string;
  onAdd: () => void;
  /** True when a search or filter narrowed the list to zero rows. */
  filtered?: boolean | undefined;
  onClearFilters?: (() => void) | undefined;
}

export function TransactionEmpty({
  monthLabel,
  onAdd,
  filtered = false,
  onClearFilters,
}: TransactionEmptyProps): React.JSX.Element {
  if (filtered) {
    return (
      <EmptyState
        icon={<Search className="size-5" strokeWidth={2} aria-hidden />}
        title="Sin resultados"
        description="Prueba con otra búsqueda, periodo o filtro."
        action={
          <Button type="button" variant="secondary" onClick={onClearFilters ?? onAdd}>
            Limpiar filtros
          </Button>
        }
      />
    );
  }

  return (
    <EmptyState
      icon={<Receipt className="size-5" strokeWidth={2} aria-hidden />}
      title={`Sin movimientos en ${monthLabel}`}
      description="Agrega tu primer ingreso o gasto de este mes."
      action={
        <Button type="button" variant="primary" onClick={onAdd}>
          Agregar movimiento
        </Button>
      }
    />
  );
}
