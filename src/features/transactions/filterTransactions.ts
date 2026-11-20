import { computeMsiSchedule, getCurrentMsiInstallment } from "@/engine/msi";
import { toIsoDateString } from "@/lib/date/format";
import type { Card } from "@/db/schemas/card";
import type { Transaction } from "@/db/schemas/transaction";
import type { FilterState, TransactionListItem } from "./types";

export interface FilterTransactionsInput {
  transactions: Transaction[];
  cards: Card[];
  monthIso: string;
  filters: FilterState;
}

function monthBounds(monthIso: string): { fromDate: string; toDate: string; referenceDate: Date } {
  const [yearStr, monthStr] = monthIso.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return { fromDate: toIsoDateString(start), toDate: toIsoDateString(end), referenceDate: end };
}

function matchesSearch(tx: Transaction, cards: Map<string, Card>, query: string): boolean {
  if (!query) return true;
  const cardName = "cardId" in tx && tx.cardId ? cards.get(tx.cardId)?.bank ?? "" : "";
  const haystack = [tx.description, tx.category ?? "", cardName].join(" ").toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export function filterTransactions(input: FilterTransactionsInput): TransactionListItem[] {
  const { transactions, cards, monthIso, filters } = input;
  const cardById = new Map(cards.map((c) => [c.id, c]));

  const { fromDate, toDate, referenceDate } =
    filters.advanced.fromDate || filters.advanced.toDate
      ? {
          fromDate: filters.advanced.fromDate,
          toDate: filters.advanced.toDate,
          referenceDate: new Date(),
        }
      : monthBounds(monthIso);

  const query = filters.search.trim();
  const items: TransactionListItem[] = [];

  for (const tx of transactions) {
    // Advanced: card
    if (filters.advanced.cardId) {
      const txCardId = "cardId" in tx ? tx.cardId : undefined;
      if (txCardId !== filters.advanced.cardId) continue;
    }

    // Advanced: category
    if (filters.advanced.category) {
      if (tx.category?.toLowerCase() !== filters.advanced.category.toLowerCase()) continue;
    }

    // Search
    if (query && !matchesSearch(tx, cardById, query)) continue;

    // Quick filter
    if (filters.quick === "income") {
      if (tx.type !== "income") continue;
      if (tx.date < fromDate || tx.date > toDate) continue;
      items.push({
        id: tx.id,
        tx,
        displayDate: tx.date,
        displayAmount: tx.amount,
      });
      continue;
    }

    if (filters.quick === "expense") {
      if (tx.type !== "expense") continue;
      if (tx.date < fromDate || tx.date > toDate) continue;
      items.push({
        id: tx.id,
        tx,
        displayDate: tx.date,
        displayAmount: -tx.amount,
      });
      continue;
    }

    if (filters.quick === "expense_msi") {
      if (tx.type !== "expense_msi") continue;

      if (filters.msiView === "purchase") {
        if (tx.date < fromDate || tx.date > toDate) continue;
        // getCurrentMsiInstallment returns null outside the plan window, so
        // the row keeps the generic "MSI" chip in that case (S7).
        const installmentIndex = getCurrentMsiInstallment(tx, referenceDate);
        items.push({
          id: tx.id,
          tx,
          displayDate: tx.date,
          displayAmount: -tx.amount,
          installmentIndex: installmentIndex ?? undefined,
          installmentTotal: tx.msiMonths,
        });
      } else {
        const schedule = computeMsiSchedule(tx, new Date());
        const monthFrom = fromDate.slice(0, 7);
        const monthTo = toDate.slice(0, 7);
        for (const [i, entry] of schedule.entries()) {
          const entryMonthIso = `${entry.year}-${String(entry.month).padStart(2, "0")}`;
          if (entryMonthIso < monthFrom || entryMonthIso > monthTo) continue;
          const displayDate = `${entryMonthIso}-01`;
          if (displayDate < fromDate || displayDate > toDate) continue;
          items.push({
            id: `${tx.id}#${i + 1}`,
            tx,
            displayDate,
            displayAmount: -entry.amount,
            installmentIndex: i + 1,
            installmentTotal: tx.msiMonths,
          });
        }
      }
      continue;
    }

    // all
    if (tx.date < fromDate || tx.date > toDate) continue;
    const isIncome = tx.type === "income";
    const installmentIndex = tx.type === "expense_msi" ? getCurrentMsiInstallment(tx, referenceDate) : null;
    items.push({
      id: tx.id,
      tx,
      displayDate: tx.date,
      displayAmount: isIncome ? tx.amount : -tx.amount,
      installmentIndex: installmentIndex ?? undefined,
      installmentTotal: tx.type === "expense_msi" ? tx.msiMonths : undefined,
    });
  }

  items.sort((a, b) => {
    if (a.displayDate !== b.displayDate) return b.displayDate.localeCompare(a.displayDate);
    return a.id.localeCompare(b.id);
  });

  return items;
}
