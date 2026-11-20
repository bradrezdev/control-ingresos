import { Amount } from "@/components/ui/design/Amount";
import { TransactionRow } from "./TransactionRow";
import type { Card } from "@/db/schemas/card";
import type { DayGroup } from "./groupTransactionsByDay";
import type { TransactionListItem } from "./types";

export interface TransactionDayGroupProps {
  group: DayGroup;
  cardById: Map<string, Card>;
  currency: string;
  onSelect: (item: TransactionListItem) => void;
}

export function TransactionDayGroup({ group, cardById, currency, onSelect }: TransactionDayGroupProps): React.JSX.Element {
  return (
    <section aria-labelledby={`day-${group.date}`}>
      <div className="flex items-center justify-between min-h-12 pt-2">
        <h2 id={`day-${group.date}`} className="text-title font-bold text-primary">
          {group.label}
        </h2>
        <Amount
          cents={group.total}
          currency={currency}
          sign={group.total >= 0 ? "positive" : "negative"}
          {...(group.total > 0 ? { prefix: "+" as const } : {})}
          className="text-aux text-muted"
        />
      </div>
      <div className="flex flex-col">
        {group.items.map((item) => (
          <TransactionRow
            key={item.id}
            item={item}
            card={"cardId" in item.tx && item.tx.cardId ? cardById.get(item.tx.cardId) : undefined}
            currency={currency}
            onClick={() => onSelect(item)}
          />
        ))}
      </div>
    </section>
  );
}
