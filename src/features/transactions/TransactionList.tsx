import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { TransactionDayGroup } from "./TransactionDayGroup";
import type { Card } from "@/db/schemas/card";
import type { DayGroup } from "./groupTransactionsByDay";
import type { TransactionListItem } from "./types";

export interface TransactionListProps {
  groups: DayGroup[];
  cardById: Map<string, Card>;
  currency: string;
  hasMore?: boolean;
  onLoadMore: () => void;
  onSelect: (item: TransactionListItem) => void;
}

export function TransactionList({
  groups,
  cardById,
  currency,
  hasMore = false,
  onLoadMore,
  onSelect,
}: TransactionListProps): React.JSX.Element {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasMore || !sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          onLoadMore();
        }
      },
      { rootMargin: "120px" },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore]);

  return (
    <div className="flex flex-col">
      {groups.map((group) => (
        <TransactionDayGroup
          key={group.date}
          group={group}
          cardById={cardById}
          currency={currency}
          onSelect={onSelect}
        />
      ))}
      {hasMore ? (
        <div ref={sentinelRef} className="pt-4 pb-2 flex justify-center">
          <Button type="button" variant="ghost" onClick={onLoadMore}>
            Cargar más movimientos
          </Button>
        </div>
      ) : null}
    </div>
  );
}
