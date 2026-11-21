import { AlertCircle } from "lucide-react";

export interface DashboardErrorProps {
  onRetry: () => void;
}

export function DashboardError({ onRetry }: DashboardErrorProps): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-danger-bg text-danger">
        <AlertCircle className="size-6" aria-hidden strokeWidth={2} />
      </div>
      <div>
        <p className="text-body font-semibold text-ink">No se pudo cargar el inicio</p>
        <p className="text-aux text-muted">Algo salió mal al leer los datos.</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex h-11 items-center justify-center rounded-pill bg-button px-6 text-sm font-semibold text-hero-text hover:bg-primary-hover"
      >
        Reintentar
      </button>
    </div>
  );
}
