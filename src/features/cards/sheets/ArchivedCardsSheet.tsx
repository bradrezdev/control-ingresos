/**
 * ArchivedCardsSheet — control-ingresos (Tarjetas · Mis finanzas)
 *
 * Hoja con las tarjetas archivadas. Cada fila permite restaurar la
 * tarjeta en la cartera.
 */
import { Sheet } from "@/components/ui/design";
import { MiniCard } from "../MiniCard";
import type { Card } from "@/db/schemas";

export interface ArchivedCardsSheetProps {
  cards: Card[];
  onClose: () => void;
  /** Devuelve la tarjeta a la cartera. */
  onRestore: (cardId: string) => void | Promise<void>;
}

export function ArchivedCardsSheet({
  cards,
  onClose,
  onRestore,
}: ArchivedCardsSheetProps): React.JSX.Element {
  return (
    <Sheet open onClose={onClose} title="Tarjetas archivadas">
      {cards.length === 0 ? (
        <div className="py-8 text-center text-body text-muted">
          No hay tarjetas archivadas.
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {cards.map((card) => (
            <div
              key={card.id}
              className="flex min-h-16 items-center gap-3 border-b border-border-subtle py-3 last:border-b-0"
            >
              <MiniCard card={card} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-body font-semibold text-ink">
                  {card.bank}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onRestore(card.id)}
                className="inline-flex min-h-11 shrink-0 items-center text-aux font-semibold text-primary"
              >
                Restaurar en mi cartera
              </button>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}
