import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface TransactionErrorProps {
  message: string;
  onRetry: () => void;
}

export function TransactionError({ message, onRetry }: TransactionErrorProps): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 rounded-lg border border-dashed border-border-subtle">
      <div className="size-12 rounded-full bg-danger-bg flex items-center justify-center text-danger mb-4" aria-hidden>
        <AlertCircle className="size-5" strokeWidth={2} />
      </div>
      <h3 className="text-base font-semibold text-primary">No se pudieron cargar los movimientos</h3>
      <p className="mt-1 text-sm text-muted max-w-sm">{message}</p>
      <Button type="button" variant="primary" className="mt-6" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}
