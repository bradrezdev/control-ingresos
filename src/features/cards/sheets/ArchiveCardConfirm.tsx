/**
 * ArchiveCardConfirm — control-ingresos (Tarjetas · Mis finanzas)
 *
 * Confirmación antes de archivar una tarjeta. Recuerda que la tarjeta
 * sale de la cartera pero conserva sus movimientos y reglas de pagos
 * fijos.
 */
import { Sheet } from "@/components/ui/design";
import { Button } from "@/components/ui/Button";
import type { Card } from "@/db/schemas";

export interface ArchiveCardConfirmProps {
  card: Card;
  onClose: () => void;
  /** Confirma: la tarjeta se archiva, NO se borra. */
  onConfirm: () => void | Promise<void>;
}

export function ArchiveCardConfirm({
  card,
  onClose,
  onConfirm,
}: ArchiveCardConfirmProps): React.JSX.Element {
  return (
    <Sheet open onClose={onClose} title={`¿Quitar ${card.bank}?`}>
      <div className="flex flex-col gap-5">
        <p className="text-body text-muted">
          La tarjeta dejará de aparecer en tu cartera y sus importes saldrán
          de los totales. Conservarás sus movimientos en el historial y sus
          reglas de pagos fijos. Puedes restaurarla después.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onClose}
          >
            Conservar tarjeta
          </Button>
          <Button
            type="button"
            variant="danger"
            className="flex-1"
            onClick={onConfirm}
          >
            Quitar tarjeta
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
