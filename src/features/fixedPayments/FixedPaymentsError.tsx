/**
 * FixedPaymentsError — control-ingresos (redesign-ui-2026, T6)
 *
 * Error state for the Pagos fijos screen: message plus a retry action
 * named after the action ("Reintentar").
 */
import { AlertTriangle } from "lucide-react";
import { PaperCard } from "@/components/ui/design";

export interface FixedPaymentsErrorProps {
  message?: string;
  onRetry: () => void;
}

export function FixedPaymentsError({
  message,
  onRetry,
}: FixedPaymentsErrorProps): React.JSX.Element {
  return (
    <PaperCard className="p-5 text-center">
      <span className="mx-auto grid size-10 place-items-center rounded-full bg-danger-bg text-danger">
        <AlertTriangle className="size-5" strokeWidth={2} aria-hidden />
      </span>
      <h2 className="mt-3 text-title font-bold text-primary">
        No se pudieron cargar tus pagos fijos
      </h2>
      <p className="mt-1 text-aux text-muted">
        {message ?? "Revisa tus datos y vuelve a intentarlo."}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex h-11 items-center justify-center rounded-pill bg-button px-5 text-sm font-semibold text-hero-text transition-colors duration-fast ease-out-soft hover:bg-primary-hover"
      >
        Reintentar
      </button>
    </PaperCard>
  );
}
