import type { Card } from "@/db/schemas/card";
import type { Transaction } from "@/db/schemas/transaction";
import { toIsoDateString } from "@/lib/date/format";
import type { FilterState } from "./types";

export interface ComputePeriodStatsInput {
  transactions: Transaction[];
  cards: Card[];
  monthIso: string;
  filters: FilterState;
}

export interface PeriodStats {
  spent: number;
  received: number;
  msiCount: number;
}

function monthBounds(monthIso: string): { fromDate: string; toDate: string } {
  const [yearStr, monthStr] = monthIso.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return { fromDate: toIsoDateString(start), toDate: toIsoDateString(end) };
}

export function computePeriodStats(input: ComputePeriodStatsInput): PeriodStats {
  const { transactions, cards, monthIso, filters } = input;
  const cardById = new Map(cards.map((c) => [c.id, c]));

  const { fromDate, toDate } =
    filters.advanced.fromDate || filters.advanced.toDate
      ? {
          fromDate: filters.advanced.fromDate,
          toDate: filters.advanced.toDate,
        }
      : monthBounds(monthIso);

  const query = filters.search.trim().toLowerCase();

  let spent = 0;
  let received = 0;
  let msiCount = 0;

  for (const tx of transactions) {
    if (tx.date < fromDate || tx.date > toDate) continue;

    if (filters.advanced.cardId) {
      const txCardId = "cardId" in tx ? tx.cardId : undefined;
      if (txCardId !== filters.advanced.cardId) continue;
    }

    if (filters.advanced.category) {
      if (tx.category?.toLowerCase() !== filters.advanced.category.toLowerCase()) continue;
    }

    if (query) {
      const cardName = "cardId" in tx && tx.cardId ? cardById.get(tx.cardId)?.bank ?? "" : "";
      const haystack = [tx.description, tx.category ?? "", cardName].join(" ").toLowerCase();
      if (!haystack.includes(query)) continue;
    }

    if (tx.type === "income") {
      received += tx.amount;
    } else if (tx.type === "expense") {
      spent += tx.amount;
    } else if (tx.type === "expense_msi") {
      spent += tx.amount;
      msiCount += 1;
    }
  }

  return { spent, received, msiCount };
}
