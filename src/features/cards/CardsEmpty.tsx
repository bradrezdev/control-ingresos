/**
 * CardsEmpty — control-ingresos (redesign-ui-2026, T5)
 *
 * Empty state for the Tarjetas screen: message plus the create action.
 */
import { CreditCard } from "lucide-react";
import { PaperCard } from "@/components/ui/design";

export interface CardsEmptyProps {
  onAdd: () => void;
}

export function CardsEmpty({ onAdd }: CardsEmptyProps): React.JSX.Element {
  return (
    <PaperCard className="p-5 text-center">
      <span className="mx-auto grid size-10 place-items-center rounded-full bg-surface-inset text-primary">
        <CreditCard className="size-5" strokeWidth={2} aria-hidden />
      </span>
      <h2 className="mt-3 text-title font-bold text-primary">
        Agrega tu primera tarjeta
      </h2>
      <p className="mt-1 text-aux text-muted">
        Registra tus tarjetas para ver su disponible, su ciclo y sus pagos.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-4 inline-flex h-11 items-center justify-center rounded-pill bg-button px-5 text-sm font-semibold text-hero-text transition-colors duration-fast ease-out-soft hover:bg-primary-hover"
      >
        Nueva tarjeta
      </button>
    </PaperCard>
  );
}
