/**
 * ReorderSheet — control-ingresos (Tarjetas · Mis finanzas)
 *
 * Hoja para cambiar la prioridad de las tarjetas activas. Usa
 * `reorderLocal` para mover filas con los botones de subir/bajar.
 */
import { useState } from "react";
import { GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { Sheet } from "@/components/ui/design";
import { Button } from "@/components/ui/Button";
import { MiniCard } from "../MiniCard";
import { reorderLocal } from "../reorderLocal";
import type { Card } from "@/db/schemas";

export interface ReorderSheetProps {
  /** Tarjetas activas en orden de prioridad. */
  cards: Card[];
  onClose: () => void;
  /** Persiste el nuevo orden. */
  onSave: (orderedIds: string[]) => void | Promise<void>;
}

export function ReorderSheet({
  cards,
  onClose,
  onSave,
}: ReorderSheetProps): React.JSX.Element {
  const [orderedIds, setOrderedIds] = useState<string[]>(() =>
    cards.map((card) => card.id),
  );

  const orderedCards = orderedIds
    .map((id) => cards.find((card) => card.id === id))
    .filter((card): card is Card => card !== undefined);

  function move(cardId: string, direction: "up" | "down"): void {
    const index = orderedIds.indexOf(cardId);
    if (index < 0) return;

    const targetIndex =
      direction === "up"
        ? Math.max(0, index - 1)
        : Math.min(orderedIds.length, index + 2);

    setOrderedIds((prev) => reorderLocal(prev, cardId, targetIndex));
  }

  async function handleSave(): Promise<void> {
    await onSave(orderedIds);
  }

  return (
    <Sheet open onClose={onClose} title="Ordenar mi cartera">
      <div className="flex flex-col gap-5">
        <p className="text-body text-muted">
          Mantén presionada el asa y arrastra para ordenar por prioridad.
          También puedes usar las flechas.
        </p>

        <ol className="flex list-none flex-col p-0" role="list">
          {orderedCards.map((card, index) => {
            const isFirst = index === 0;
            const isLast = index === orderedCards.length - 1;
            return (
              <li
                key={card.id}
                className="flex min-h-[57px] items-center gap-2 border-b border-border-subtle py-2 last:border-b-0"
              >
                <span
                  className="grid size-11 shrink-0 place-items-center rounded-md text-muted"
                  aria-hidden
                >
                  <GripVertical className="size-5" strokeWidth={2} />
                </span>

                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <MiniCard card={card} />
                  <span className="truncate text-body font-semibold text-ink">
                    {card.bank}
                  </span>
                </span>

                <span className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Subir ${card.bank}`}
                    disabled={isFirst}
                    onClick={() => move(card.id, "up")}
                    className="grid size-11 shrink-0 place-items-center rounded-md text-primary transition-colors duration-fast hover:bg-day disabled:cursor-default disabled:opacity-35"
                  >
                    <ChevronUp className="size-5" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Bajar ${card.bank}`}
                    disabled={isLast}
                    onClick={() => move(card.id, "down")}
                    className="grid size-11 shrink-0 place-items-center rounded-md text-primary transition-colors duration-fast hover:bg-day disabled:cursor-default disabled:opacity-35"
                  >
                    <ChevronDown className="size-5" strokeWidth={2} />
                  </button>
                </span>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            className="flex-1"
            onClick={handleSave}
          >
            Guardar orden
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
