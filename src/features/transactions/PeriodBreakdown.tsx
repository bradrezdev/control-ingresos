import { Amount } from "@/components/ui/design/Amount";
import type { Card } from "@/db/schemas/card";
import type { DayGroup } from "./groupTransactionsByDay";

export interface PeriodBreakdownProps {
  groups: DayGroup[];
  cardById: Map<string, Card>;
  currency: string;
}

export function PeriodBreakdown({ groups, cardById, currency }: PeriodBreakdownProps): React.JSX.Element | null {
  const categoryTotals = new Map<string, number>();
  const cardTotals = new Map<string, number>();

  for (const group of groups) {
    for (const item of group.items) {
      if (item.displayAmount >= 0) continue;
      const amount = Math.abs(item.displayAmount);
      if (item.tx.category) {
        categoryTotals.set(item.tx.category, (categoryTotals.get(item.tx.category) ?? 0) + amount);
      }
      const cardId = "cardId" in item.tx ? item.tx.cardId : undefined;
      if (cardId) {
        cardTotals.set(cardId, (cardTotals.get(cardId) ?? 0) + amount);
      }
    }
  }

  if (categoryTotals.size === 0 && cardTotals.size === 0) return null;

  const categories = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1]);
  const cards = [...cardTotals.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <details className="group rounded-lg bg-surface">
      <summary className="flex items-center min-h-11 px-4 text-aux font-semibold text-muted cursor-pointer list-none">
        Desglose del periodo
      </summary>
      <div className="px-4 pb-4 flex flex-col gap-4">
        {categories.length > 0 ? (
          <section aria-labelledby="breakdown-categories">
            <h3 id="breakdown-categories" className="text-body font-semibold text-ink mb-2">
              Gasto por categoría
            </h3>
            <ul className="flex flex-col">
              {categories.map(([category, amount]) => (
                <li
                  key={category}
                  className="flex items-center justify-between py-2 border-t border-border-subtle first:border-t-0"
                >
                  <span className="text-body text-ink">{category}</span>
                  <Amount cents={amount} currency={currency} sign="negative" className="text-body font-semibold text-ink" />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {cards.length > 0 ? (
          <section aria-labelledby="breakdown-cards">
            <h3 id="breakdown-cards" className="text-body font-semibold text-ink mb-2">
              Gasto por tarjeta
            </h3>
            <ul className="flex flex-col">
              {cards.map(([id, amount]) => (
                <li
                  key={id}
                  className="flex items-center justify-between py-2 border-t border-border-subtle first:border-t-0"
                >
                  <span className="text-body text-ink">{cardById.get(id)?.bank ?? "Tarjeta"}</span>
                  <Amount cents={amount} currency={currency} sign="negative" className="text-body font-semibold text-ink" />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </details>
  );
}
