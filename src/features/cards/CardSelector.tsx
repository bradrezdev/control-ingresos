/**
 * CardSelector — control-ingresos (Tarjetas · Mis finanzas)
 *
 * Botones con el nombre de cada tarjeta de la cartera. El botón
 * elegido queda marcado con `aria-pressed="true"` y con el color del
 * botón principal.
 *
 * Teclado: flechas laterales mueven la selección (con vuelta al
 * principio), Inicio y Fin saltan a la primera y a la última.
 *
 * Medidas: `DESIGN-RULES` §5 (44 px de alto, 12 px de relleno lateral,
 * radio 22 px, separación 6 px).
 */
import { useCallback, useRef } from "react";
import { cn } from "@/lib/cn";
import type { Card } from "@/db/schemas";

export interface CardSelectorProps {
  cards: Card[];
  selectedId: string | null;
  onSelect: (cardId: string) => void;
}

export function CardSelector({
  cards,
  selectedId,
  onSelect,
}: CardSelectorProps): React.JSX.Element {
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const focusAt = useCallback(
    (index: number) => {
      const bounded = (index + cards.length) % cards.length;
      const button = buttonsRef.current[bounded];
      button?.focus();
      if (cards[bounded]) onSelect(cards[bounded].id);
    },
    [cards, onSelect],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (cards.length === 0) return;
      const current = cards.findIndex((card) => card.id === selectedId);
      switch (event.key) {
        case "ArrowRight":
          event.preventDefault();
          focusAt(current + 1);
          break;
        case "ArrowLeft":
          event.preventDefault();
          focusAt(current - 1);
          break;
        case "Home":
          event.preventDefault();
          focusAt(0);
          break;
        case "End":
          event.preventDefault();
          focusAt(cards.length - 1);
          break;
        default:
          break;
      }
    },
    [cards, selectedId, focusAt],
  );

  return (
    <div
      role="group"
      aria-label="Seleccionar tarjeta"
      onKeyDown={onKeyDown}
      className="flex flex-wrap gap-1.5"
    >
      {cards.map((card, index) => {
        const active = card.id === selectedId;
        return (
          <button
            key={card.id}
            type="button"
            ref={(node) => {
              buttonsRef.current[index] = node;
            }}
            aria-pressed={active}
            onClick={() => onSelect(card.id)}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold",
              "transition-colors duration-fast ease-out-soft",
              active
                ? "bg-button text-hero-text"
                : "bg-surface-inset text-muted hover:bg-day",
            )}
          >
            {card.bank}
          </button>
        );
      })}
    </div>
  );
}
