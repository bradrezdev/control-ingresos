import { formatDayAndMonth } from "@/lib/date/format";
import { parseISO } from "date-fns";
import type { TransactionListItem } from "./types";

export interface DayGroup {
  date: string;
  label: string;
  total: number;
  items: TransactionListItem[];
}

export function groupTransactionsByDay(items: TransactionListItem[]): DayGroup[] {
  const map = new Map<string, TransactionListItem[]>();
  for (const item of items) {
    const list = map.get(item.displayDate) ?? [];
    list.push(item);
    map.set(item.displayDate, list);
  }

  const groups: DayGroup[] = [];
  for (const [date, list] of map) {
    const total = list.reduce((sum, item) => sum + item.displayAmount, 0);
    groups.push({
      date,
      label: formatDayAndMonth(parseISO(date)),
      total,
      items: list,
    });
  }

  groups.sort((a, b) => b.date.localeCompare(a.date));
  return groups;
}
