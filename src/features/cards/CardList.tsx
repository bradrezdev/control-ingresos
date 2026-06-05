/**
 * CardList — control-ingresos
 *
 * Drag-and-drop reorderable list of credit cards. Uses
 * `@atlaskit/pragmatic-drag-and-drop` for the gesture.
 *
 * Pattern:
 *   1. Each row registers itself as a `draggable` (initial data =
 *      `{ type: 'card', id }`) AND as a `dropTargetForElements` with
 *      a `getData()` that returns the target index based on the
 *      pointer's Y position relative to the row's midpoint.
 *   2. On drop, we read the source id and the target index from the
 *      monitor's `location` and call our local `reorderLocal` helper.
 *   3. The new order is committed via `useCardsStore.reorder(orderedIds)`
 *      which persists priority to Dexie.
 *
 * The store update is fire-and-forget from the user's POV. The local
 * `orderedIds` state is the immediate source for the visual order, so
 * the user gets instant feedback even before Dexie re-emits.
 */
import { useEffect, useRef, useState } from "react";
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { CreditCard } from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { useLiveCards } from "@/hooks/useLiveCards";
import { useCardsStore } from "@/stores/cardsStore";
import type { Card } from "@/db/schemas/card";
import { CardListItem } from "./CardListItem";
import { reorderLocal } from "./reorderLocal";

const DRAG_TYPE = "card";

interface CardListProps {
  onEdit: (card: Card) => void;
  onDelete: (card: Card) => void;
}

export function CardList({ onEdit, onDelete }: CardListProps): React.JSX.Element {
  const liveCards = useLiveCards();
  const reorder = useCardsStore((s) => s.reorder);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Sync the local order from Dexie's live query whenever the set
  // changes (create / delete / external edit).
  useEffect(() => {
    if (!liveCards) return;
    setOrderedIds((current) => {
      // Preserve local order for IDs that still exist; append any new
      // ones at the end. This avoids "snap back" mid-drag.
      const liveIds = new Set(liveCards.map((c) => c.id));
      const preserved = current.filter((id) => liveIds.has(id));
      const appended = liveCards
        .map((c) => c.id)
        .filter((id) => !preserved.includes(id));
      return preserved.length + appended.length === current.length
        ? current
        : [...preserved, ...appended];
    });
  }, [liveCards]);

  // Track the active drag globally so we can dim the source row.
  // `onDrop` fires for both successful drops and cancellations — there
  // is no separate `onDragCancel` in the monitor API.
  useEffect(() => {
    return monitorForElements({
      onDragStart: ({ source }) => {
        if (
          source.data.type === DRAG_TYPE &&
          typeof source.data.id === "string"
        ) {
          setDraggingId(source.data.id);
        }
      },
      onDrop: () => setDraggingId(null),
    });
  }, []);

  if (!liveCards) {
    return (
      <div className="space-y-3" role="status" aria-label="Cargando tarjetas">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full" rounded="lg" />
        ))}
      </div>
    );
  }

  if (liveCards.length === 0) {
    return (
      <EmptyState
        icon={<CreditCard className="size-5" aria-hidden />}
        title="No tenés tarjetas todavía"
        description="Hacé click en 'Nueva tarjeta' para empezar a registrar las tarjetas con las que vas a trabajar."
      />
    );
  }

  const byId = new Map(liveCards.map((c) => [c.id, c]));

  return (
    <ul className="space-y-3 list-none p-0" role="list" aria-label="Tarjetas">
      {orderedIds.map((id, index) => {
        const card = byId.get(id);
        if (!card) return null;
        return (
          <CardRow
            key={id}
            card={card}
            index={index}
            isDragging={draggingId === id}
            onEdit={onEdit}
            onDelete={onDelete}
            onReorderLocal={(fromId, toIndex) => {
              const next = reorderLocal(orderedIds, fromId, toIndex);
              setOrderedIds(next);
              void reorder(next);
            }}
          />
        );
      })}
    </ul>
  );
}

function CardRow({
  card,
  index,
  isDragging,
  onEdit,
  onDelete,
  onReorderLocal,
}: CardRowProps): React.JSX.Element {
  const ref = useRef<HTMLLIElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return combine(
      draggable({
        element: el,
        getInitialData: () => ({ type: DRAG_TYPE, id: card.id }),
      }),
      dropTargetForElements({
        element: el,
        canDrop: ({ source }) => {
          const data = source.data;
          return data.type === DRAG_TYPE && data.id !== card.id;
        },
        getData: ({ input, element }) => {
          // Target index = where to insert the dragged item. We compute
          // it from the pointer's Y position relative to the row's
          // midpoint. Above the midpoint = insert before this row;
          // below = insert after.
          const rect = element.getBoundingClientRect();
          const isBelowMid = input.clientY > rect.top + rect.height / 2;
          return {
            type: DRAG_TYPE,
            id: card.id,
            targetIndex: isBelowMid ? index + 1 : index,
          };
        },
        onDragEnter: () => setIsHovered(true),
        onDragLeave: () => setIsHovered(false),
        onDrop: ({ source, location }) => {
          setIsHovered(false);
          const fromId = source.data.id;
          if (typeof fromId !== "string") return;
          // Use the deepest drop target's `targetIndex`. We registered
          // the value in our own `getData()` so it's typed as
          // `unknown` here — guard before reading.
          const dropTarget = location.current.dropTargets[0];
          const data = dropTarget?.data as
            | { type?: string; id?: string; targetIndex?: unknown }
            | undefined;
          const rawIndex = data?.targetIndex;
          const targetIndex =
            typeof rawIndex === "number" ? rawIndex : index;
          onReorderLocal(fromId, targetIndex);
        },
      }),
    );
  }, [card.id, index, onReorderLocal]);

  return (
    <li
      ref={ref}
      className={cn(
        "rounded-[var(--radius-lg)] transition-shadow",
        isHovered && "ring-2 ring-[var(--color-primary)] ring-inset",
      )}
    >
      <CardListItem
        card={card}
        isDragging={isDragging}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </li>
  );
}

interface CardRowProps {
  card: Card;
  index: number;
  isDragging: boolean;
  onEdit: (card: Card) => void;
  onDelete: (card: Card) => void;
  onReorderLocal: (fromId: string, toIndex: number) => void;
}
