/**
 * CardListItem — control-ingresos
 *
 * A single card row inside the drag-and-drop list. The wrapper element
 * is registered with Pragmatic DnD (in CardList). The visible content
 * lives inside a GlassCard surface with bank-tinted accents.
 *
 * The drag handle icon on the left and the right-side action buttons
 * (edit/delete) are siblings of the same DOM node — Pragmatic DnD
 * operates on the whole element by default, but we make the handle
 * the explicit drag target via `data-dnd-handle` so the buttons stay
 * clickable.
 */
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import type { Card } from "@/db/schemas/card";
import { tintFor } from "./bankTint";

export interface CardListItemProps {
  card: Card;
  onEdit: (card: Card) => void;
  onDelete: (card: Card) => void;
  isDragging?: boolean;
  isOverlay?: boolean;
}

export function CardListItem({
  card,
  onEdit,
  onDelete,
  isDragging = false,
  isOverlay = false,
}: CardListItemProps): React.JSX.Element {
  const tint = tintFor(card.bank);

  return (
    <div
      className={cn(
        "group flex items-stretch gap-3",
        "rounded-[var(--radius-lg)]",
        "transition-shadow duration-[var(--duration-base)] ease-[var(--ease-out-soft)]",
        isDragging && !isOverlay && "opacity-30",
        isOverlay && "shadow-[var(--shadow-glass)] cursor-grabbing",
      )}
    >
      <div
        data-dnd-handle
        aria-label="Arrastrar para reordenar"
        className={cn(
          "flex items-center justify-center",
          "w-10 rounded-l-[var(--radius-lg)]",
          "bg-[var(--color-surface-inset)]",
          "text-[var(--color-text-muted)]",
          "cursor-grab active:cursor-grabbing",
          "select-none touch-none",
        )}
      >
        <GripVertical className="size-4" aria-hidden />
      </div>

      <div
        className={cn(
          "flex-1 flex items-center justify-between gap-4",
          "px-4 py-3 md:px-5 md:py-4",
          "rounded-r-[var(--radius-lg)]",
          "border border-l-0",
          "border-[var(--color-border-subtle)]",
          tint.bar,
          "bg-[var(--color-surface)]",
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
              {card.bank}
            </h3>
            <Badge variant="primary">**** {card.last4}</Badge>
            <Badge variant="default" className="hidden sm:inline-flex">
              Prioridad {card.priority + 1}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-[var(--color-text-body)] truncate">
            {card.holderName}
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            Corte día {card.cutDay} · Pago día {card.paymentDueDay}
            {card.creditLimit
              ? ` · Límite ${card.creditLimit.toLocaleString("es-MX")}`
              : null}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(card)}
            aria-label={`Editar tarjeta ${card.bank}`}
            className={cn(
              "size-10 rounded-[var(--radius-md)]",
              "flex items-center justify-center",
              "text-[var(--color-text-muted)]",
              "hover:bg-[var(--color-surface-inset)] hover:text-[var(--color-primary)]",
              "transition-colors duration-[var(--duration-fast)]",
            )}
          >
            <Pencil className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onDelete(card)}
            aria-label={`Eliminar tarjeta ${card.bank}`}
            className={cn(
              "size-10 rounded-[var(--radius-md)]",
              "flex items-center justify-center",
              "text-[var(--color-text-muted)]",
              "hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)]",
              "transition-colors duration-[var(--duration-fast)]",
            )}
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
