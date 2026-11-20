/**
 * FixedPaymentsEmpty — control-ingresos (redesign-ui-2026, T6)
 *
 * Empty state for the Pagos fijos screen: message plus the add action
 * named after what it does.
 */
import { CalendarDays } from "lucide-react";
import { PaperCard } from "@/components/ui/design";

export interface FixedPaymentsEmptyProps {
  onAdd: () => void;
}

export function FixedPaymentsEmpty({ onAdd }: FixedPaymentsEmptyProps): React.JSX.Element {
  return (
    <PaperCard className="p-5 text-center">
      <span className="mx-auto grid size-10 place-items-center rounded-full bg-surface-inset text-primary">
        <CalendarDays className="size-5" strokeWidth={2} aria-hidden />
      </span>
      <h2 className="mt-3 text-title font-bold text-primary">
        Sin pagos fijos todavía
      </h2>
      <p className="mt-1 text-aux text-muted">
        Agrega rentas, servicios o suscripciones para ver cuánto debes cada mes.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-4 inline-flex h-11 items-center justify-center rounded-pill bg-button px-5 text-sm font-semibold text-hero-text transition-colors duration-fast ease-out-soft hover:bg-primary-hover"
      >
        Agrega tu primer pago fijo
      </button>
    </PaperCard>
  );
}
