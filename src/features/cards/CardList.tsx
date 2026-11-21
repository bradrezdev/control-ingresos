/**
 * CardList — control-ingresos (redesign-ui-2026, T5)
 *
 * Drag-and-drop reorderable list of redesigned card blocks. Same
 * Pragmatic DnD wiring the app already uses:
 *
 *   1. Each row registers itself as a `draggable` (initial data =
 *      `{ type: 'card', id }`) AND as a `dropTargetForElements` whose
 *      `getData()` returns the target index from the pointer's Y
 *      position relative to the row's midpoint.
 *   2. The drag gesture starts ONLY on the 44px handle: the block
 *      exposes its handle element via `handleRef` and we pass it to
 *      `draggable({ dragHandle })`, so tapping the card face (detail)
 *      or the options button never starts a drag.
 *   3. On drop, `reorderLocal` reorders locally for instant feedback and
 *      `useCardsStore.reorder(orderedIds)` persists priority to Dexie.
 */
import { useEffect, useRef, useState } from "react";
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { cn } from "@/lib/cn";
import { useCardsStore } from "@/stores/cardsStore";
import { CardBlock } from "./CardBlock";
import { reorderLocal } from "./reorderLocal";
import type { CardAccount } from "./types";

const DRAG_TYPE = "card";

export interface CardListProps {
  accounts: CardAccount[];
  currency: string;
  onOpenDetail: (account: CardAccount) => void;
  onOpenMenu: (account: CardAccount) => void;
}

export function CardList({
  accounts,
  currency,
  onOpenDetail,
  onOpenMenu,
}: CardListProps): React.JSX.Element {
  const reorder = useCardsStore((s) => s.reorder);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Sync the local order whenever the live set changes (create / delete /
  // external edit), preserving the current order for surviving ids.
  useEffect(() => {
    setOrderedIds((current) => {
      const liveIds = new Set(accounts.map((account) => account.card.id));
      const preserved = current.filter((id) => liveIds.has(id));
      const appended = accounts
        .map((account) => account.card.id)
        .filter((id) => !preserved.includes(id));
      return preserved.length + appended.length === current.length
        ? current
        : [...preserved, ...appended];
    });
  }, [accounts]);

  // Track the active drag globally so we can dim the source row.
  // `onDrop` fires for both successful drops and cancellations — there is
  // no separate `onDragCancel` in the monitor API.
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

  const byId = new Map(accounts.map((account) => [account.card.id, account]));

  return (
    <ul
      className="flex list-none flex-col gap-3.5 p-0"
      role="list"
      aria-label="Tarjetas"
    >
      {orderedIds.map((id, index) => {
        const account = byId.get(id);
        if (!account) return null;
        return (
          <CardRow
            key={id}
            account={account}
            index={index}
            currency={currency}
            isDragging={draggingId === id}
            onOpenDetail={onOpenDetail}
            onOpenMenu={onOpenMenu}
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
  account,
  index,
  currency,
  isDragging,
  onOpenDetail,
  onOpenMenu,
  onReorderLocal,
}: CardRowProps): React.JSX.Element {
  const rowRef = useRef<HTMLLIElement | null>(null);
  const handleRef = useRef<HTMLDivElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    return combine(
      draggable({
        element: el,
        // Drag starts only on the 44px handle (see module doc). The
        // spread keeps the arg assignable under exactOptionalPropertyTypes.
        ...(handleRef.current ? { dragHandle: handleRef.current } : {}),
        getInitialData: () => ({ type: DRAG_TYPE, id: account.card.id }),
      }),
      dropTargetForElements({
        element: el,
        canDrop: ({ source }) => {
          const data = source.data;
          return data.type === DRAG_TYPE && data.id !== account.card.id;
        },
        getData: ({ input, element }) => {
          // Target index = where to insert the dragged item, computed
          // from the pointer's Y position relative to the row midpoint.
          const rect = element.getBoundingClientRect();
          const isBelowMid = input.clientY > rect.top + rect.height / 2;
          return {
            type: DRAG_TYPE,
            id: account.card.id,
            targetIndex: isBelowMid ? index + 1 : index,
          };
        },
        onDragEnter: () => setIsHovered(true),
        onDragLeave: () => setIsHovered(false),
        onDrop: ({ source, location }) => {
          setIsHovered(false);
          const fromId = source.data.id;
          if (typeof fromId !== "string") return;
          // Registered in our own `getData()`, so it is typed as
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
  }, [account.card.id, index, onReorderLocal]);

  return (
    <li
      ref={rowRef}
      className={cn(
        "rounded-lg transition-shadow",
        isHovered && "ring-2 ring-primary ring-inset",
      )}
    >
      <CardBlock
        account={account}
        currency={currency}
        handleRef={handleRef}
        isDragging={isDragging}
        onOpenDetail={onOpenDetail}
        onOpenMenu={onOpenMenu}
      />
    </li>
  );
}

interface CardRowProps {
  account: CardAccount;
  index: number;
  currency: string;
  isDragging: boolean;
  onOpenDetail: (account: CardAccount) => void;
  onOpenMenu: (account: CardAccount) => void;
  onReorderLocal: (fromId: string, toIndex: number) => void;
}
